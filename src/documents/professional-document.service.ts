import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

import FileType from 'file-type';
import pdf from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';

import { createHash } from 'crypto';
import cloudinary from 'src/config/cloudinary ';

/**
 * =========================================================
 * TIPOS
 * =========================================================
 */

export interface DetectedFileType {
  ext: string;
  mime: string;
}

export interface DocumentValidationResult {
  status: 'APPROVED' | 'REJECTED' | 'REVIEW_REQUIRED';

  reason?: string;
}

export interface UploadDocumentResponse {
  document: unknown;
  validation: DocumentValidationResult;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

/**
 * =========================================================
 * SERVICE
 * =========================================================
 */

@Injectable()
export class ProfessionalDocumentService {
  /**
   * Tamanho máximo:
   * 4 MB
   */
  private readonly MAX_FILE_SIZE = 4 * 1024 * 1024;

  /**
   * Formatos permitidos
   */
  private readonly ALLOWED_MIMES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * =========================================================
   * UPLOAD DOCUMENTO
   * =========================================================
   */
  async upload(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ): Promise<UploadDocumentResponse> {
    /**
     * -------------------------------------------------------
     * 1. VALIDAR ARQUIVO
     * -------------------------------------------------------
     */

    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    if (!file.buffer) {
      throw new BadRequestException(
        'Não foi possível obter o conteúdo do arquivo.',
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('O arquivo não pode ultrapassar 4 MB.');
    }

    /**
     * -------------------------------------------------------
     * 2. VALIDAR MIME DO MULTER
     * -------------------------------------------------------
     */

    if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Formato de arquivo inválido. Use apenas JPG, JPEG, PNG ou PDF.',
      );
    }

    /**
     * -------------------------------------------------------
     * 3. BUSCAR PROFISSIONAL
     * -------------------------------------------------------
     */

    const professional = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        nif: true,
        niss: true,
        iban: true,
        accountHolder: true,
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil profissional não encontrado.');
    }

    /**
     * -------------------------------------------------------
     * 4. VERIFICAR SE JÁ EXISTE DOCUMENTO DESTE TIPO
     *
     * Só pode existir:
     *
     * NIF_PROOF       → 1
     * NISS_PROOF      → 1
     * PAYMENT_PROOF   → 1
     *
     * NÃO substituímos o documento anterior.
     * BLOQUEAMOS o novo upload.
     * -------------------------------------------------------
     */

    const existingType = await this.prisma.professionalDocument.findUnique({
      where: {
        professionalProfileId_type: {
          professionalProfileId: professional.id,
          type,
        },
      },
      select: {
        id: true,
        type: true,
        name: true,
      },
    });

    if (existingType) {
      const typeNames: Record<DocumentType, string> = {
        NIF_PROOF: 'comprovativo de NIF',

        NISS_PROOF: 'comprovativo de NISS',

        PAYMENT_PROOF: 'comprovativo de IBAN',
      };

      throw new BadRequestException(
        `Já existe um ${typeNames[type]} enviado. Apenas um comprovativo deste tipo é permitido.`,
      );
    }

    /**
     * -------------------------------------------------------
     * 5. CALCULAR SHA-256
     *
     * Serve para identificar exatamente o mesmo arquivo.
     * -------------------------------------------------------
     */

    const fileHash = this.calculateFileHash(file.buffer);

    console.log('[DOCUMENT] SHA-256:', fileHash);

    /**
     * -------------------------------------------------------
     * 6. VERIFICAR SE O MESMO ARQUIVO JÁ FOI ENVIADO
     * -------------------------------------------------------
     */

    const existingFile = await this.prisma.professionalDocument.findFirst({
      where: {
        professionalProfileId: professional.id,

        fileHash,
      },

      select: {
        id: true,
        type: true,
        name: true,
      },
    });

    if (existingFile) {
      throw new BadRequestException(
        'Este mesmo arquivo já foi enviado anteriormente.',
      );
    }

    /**
     * -------------------------------------------------------
     * 7. VALIDAR TIPO REAL DO ARQUIVO
     *
     * Não confiamos apenas no mimetype enviado pelo cliente.
     * -------------------------------------------------------
     */

    const detected = await this.validateRealFileType(file.buffer);

    console.log('[FILE TYPE]', detected);

    /**
     * -------------------------------------------------------
     * 8. EXTRAIR TEXTO
     *
     * PDF:
     * - texto normal
     * - campos AcroForm
     *
     * IMAGEM:
     * - Tesseract OCR
     * -------------------------------------------------------
     */

    const extractedText = await this.extractText(file.buffer, detected.mime);

    console.log('[DOCUMENT] Texto extraído:');

    console.log(extractedText);

    /**
     * -------------------------------------------------------
     * 9. VALIDAR CONTEÚDO DO DOCUMENTO
     * -------------------------------------------------------
     */

    const validation = await this.validateDocument(
      type,
      professional,
      extractedText,
    );

    console.log('[DOCUMENT] Validação:', validation);

    /**
     * -------------------------------------------------------
     * 10. SE REJEITADO, NÃO GUARDAR
     * -------------------------------------------------------
     */

    if (validation.status === 'REJECTED') {
      throw new BadRequestException({
        message: validation.reason,

        validation,
      });
    }

    /**
     * -------------------------------------------------------
     * 11. UPLOAD PARA CLOUDINARY
     * -------------------------------------------------------
     */

    const uploaded = await this.uploadToCloudinary(file.buffer, detected.mime);

    /**
     * -------------------------------------------------------
     * 12. CRIAR DOCUMENTO
     *
     * IMPORTANTE:
     *
     * NÃO usamos upsert.
     *
     * Usamos create para impedir substituição.
     * -------------------------------------------------------
     */

    try {
      const document = await this.prisma.professionalDocument.create({
        data: {
          professionalProfileId: professional.id,

          type,

          name: file.originalname,

          uri: uploaded.secure_url,

          mimeType: detected.mime,

          size: file.size,

          fileHash,

          isVerified: false,
        },
      });

      /**
       * -----------------------------------------------------
       * RETORNO
       * -----------------------------------------------------
       */

      return {
        document,
        validation,
      };
    } catch (error) {
      /**
       * Prisma P2002:
       *
       * Violação de UNIQUE.
       *
       * Pode acontecer se duas requisições chegarem
       * praticamente ao mesmo tempo.
       */

      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um documento deste tipo ou este mesmo arquivo já foi enviado.',
        );
      }

      throw error;
    }
  }

  /**
   * =========================================================
   * CALCULAR HASH SHA-256
   * =========================================================
   */
  private calculateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * =========================================================
   * VALIDAR TIPO REAL
   * =========================================================
   */
  private async validateRealFileType(
    buffer: Buffer,
  ): Promise<DetectedFileType> {
    const detected: DetectedFileType | undefined =
      await FileType.fromBuffer(buffer);

    if (!detected) {
      throw new UnsupportedMediaTypeException(
        'Não foi possível identificar o tipo real do arquivo.',
      );
    }

    /**
     * PDF
     */
    if (detected.mime === 'application/pdf') {
      return detected;
    }

    /**
     * JPEG
     */
    if (detected.mime === 'image/jpeg') {
      return detected;
    }

    /**
     * PNG
     */
    if (detected.mime === 'image/png') {
      return detected;
    }

    throw new UnsupportedMediaTypeException(
      'O conteúdo real do arquivo não corresponde a um formato permitido. Use JPG, JPEG, PNG ou PDF.',
    );
  }

  /**
   * =========================================================
   * EXTRAIR TEXTO
   * =========================================================
   */
  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    /**
     * PDF
     */
    if (mimeType === 'application/pdf') {
      return this.extractPdfText(buffer);
    }

    /**
     * IMAGENS
     */
    if (
      mimeType === 'image/jpeg' ||
      mimeType === 'image/jpg' ||
      mimeType === 'image/png'
    ) {
      return this.extractImageText(buffer);
    }

    return '';
  }

  /**
   * =========================================================
   * EXTRAIR TEXTO DO PDF
   *
   * Junta:
   *
   * 1. Texto normal
   * 2. Campos AcroForm
   * =========================================================
   */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    const texts: string[] = [];

    /**
     * -------------------------------------------------------
     * TEXTO NORMAL
     * -------------------------------------------------------
     */

    try {
      const parsed = await pdf(buffer);

      console.log('[PDF] Páginas:', parsed.numpages);

      console.log('[PDF] Texto normal:');

      console.log(parsed.text);

      if (parsed.text && parsed.text.trim()) {
        texts.push(parsed.text);
      }
    } catch (error) {
      console.error('[PDF] Erro ao extrair texto:', error);
    }

    /**
     * -------------------------------------------------------
     * CAMPOS ACROFORM
     * -------------------------------------------------------
     */

    try {
      const formText = await this.extractPdfFormFields(buffer);

      console.log('[PDF] Campos AcroForm:');

      console.log(formText);

      if (formText && formText.trim()) {
        texts.push(formText);
      }
    } catch (error) {
      console.error('[PDF] Erro ao extrair AcroForm:', error);
    }

    /**
     * -------------------------------------------------------
     * COMBINAR
     * -------------------------------------------------------
     */

    const combined = texts.filter((text) => text && text.trim()).join('\n');

    console.log('[PDF] Texto final:');

    console.log(combined);

    return combined;
  }

  /**
   * =========================================================
   * EXTRAIR CAMPOS ACROFORM
   *
   * Necessário para PDFs como o seu comprovativo de IBAN,
   * onde o valor pode estar dentro de um campo do formulário.
   * =========================================================
   */
  private async extractPdfFormFields(buffer: Buffer): Promise<string> {
    const pdfDoc = await PDFDocument.load(buffer);

    const form = pdfDoc.getForm();

    const fields = form.getFields();

    console.log(`[PDF FORM] Campos encontrados: ${fields.length}`);

    const values: string[] = [];

    for (const field of fields) {
      const fieldName = field.getName();

      console.log(`[PDF FORM] Campo: ${fieldName}`);

      /**
       * Campos de texto
       */
      if ('getText' in field) {
        try {
          const value = (
            field as {
              getText: () => string | undefined;
            }
          ).getText();

          if (value && value.trim()) {
            values.push(`${fieldName}: ${value}`);

            console.log(`[PDF FORM] ${fieldName} = ${value}`);
          }
        } catch (error) {
          console.error(`[PDF FORM] Erro no campo ${fieldName}:`, error);
        }
      }
    }

    return values.join('\n');
  }

  /**
   * =========================================================
   * OCR DE IMAGEM
   * =========================================================
   */
  private async extractImageText(buffer: Buffer): Promise<string> {
    try {
      console.log('[OCR] Iniciando Tesseract...');

      const result = await Tesseract.recognize(buffer, 'por');

      const text = result.data.text ?? '';

      console.log('[OCR] Texto extraído:');

      console.log(text);

      return text;
    } catch (error) {
      console.error('[OCR] Erro:', error);

      return '';
    }
  }

  /**
   * =========================================================
   * VALIDAR DOCUMENTO
   * =========================================================
   */
  private async validateDocument(
    type: DocumentType,
    professional: {
      id: string;
      nif: string | null;
      niss: string | null;
      iban: string | null;
      accountHolder: string | null;
    },
    text: string,
  ): Promise<DocumentValidationResult> {
    switch (type) {
      case DocumentType.NIF_PROOF:
        return this.validateNif(professional.nif, text);

      case DocumentType.NISS_PROOF:
        return this.validateNiss(professional.niss, text);

      case DocumentType.PAYMENT_PROOF:
        return this.validatePayment(
          professional.iban,
          professional.accountHolder,
          text,
        );

      default:
        throw new BadRequestException('Tipo de documento inválido.');
    }
  }

  /**
   * =========================================================
   * VALIDAR NIF
   * =========================================================
   */
  private validateNif(
    nif: string | null,
    text: string,
  ): DocumentValidationResult {
    if (!nif) {
      return {
        status: 'REJECTED',
        reason: 'O NIF não está cadastrado no perfil profissional.',
      };
    }

    const normalizedNif = nif.replace(/\D/g, '');

    if (normalizedNif.length !== 9) {
      return {
        status: 'REJECTED',
        reason: 'O NIF cadastrado é inválido.',
      };
    }

    const normalizedText = this.normalizeText(text);

    const digits = normalizedText.replace(/\D/g, '');

    console.log('[NIF] Original:', nif);

    console.log('[NIF] Normalizado:', normalizedNif);

    console.log('[NIF] Dígitos encontrados:', digits);

    if (!digits.includes(normalizedNif)) {
      return {
        status: 'REJECTED',
        reason:
          'O NIF encontrado no comprovativo não corresponde ao NIF cadastrado.',
      };
    }

    return {
      status: 'REVIEW_REQUIRED',

      reason:
        'NIF encontrado e compatível. Documento aguardando validação administrativa.',
    };
  }

  /**
   * =========================================================
   * VALIDAR NISS
   * =========================================================
   */
  private validateNiss(
    niss: string | null,
    text: string,
  ): DocumentValidationResult {
    if (!niss) {
      return {
        status: 'REJECTED',
        reason: 'O NISS não está cadastrado no perfil profissional.',
      };
    }

    const normalizedNiss = niss.replace(/\D/g, '');

    if (normalizedNiss.length !== 11) {
      return {
        status: 'REJECTED',
        reason: 'O NISS cadastrado é inválido.',
      };
    }

    const normalizedText = this.normalizeText(text);

    const digits = normalizedText.replace(/\D/g, '');

    console.log('[NISS] Original:', niss);

    console.log('[NISS] Normalizado:', normalizedNiss);

    console.log('[NISS] Dígitos encontrados:', digits);

    if (!digits.includes(normalizedNiss)) {
      return {
        status: 'REJECTED',
        reason:
          'O NISS encontrado no comprovativo não corresponde ao NISS cadastrado.',
      };
    }

    return {
      status: 'REVIEW_REQUIRED',

      reason:
        'NISS encontrado e compatível. Documento aguardando validação administrativa.',
    };
  }

  /**
   * =========================================================
   * VALIDAR IBAN
   * =========================================================
   */
  private validatePayment(
    iban: string | null,
    accountHolder: string | null,
    text: string,
  ): DocumentValidationResult {
    if (!iban) {
      return {
        status: 'REJECTED',
        reason: 'O IBAN não está cadastrado no perfil profissional.',
      };
    }

    /**
     * -------------------------------------------------------
     * IBAN CADASTRADO
     * -------------------------------------------------------
     */

    const normalizedIban = this.normalizeIban(iban);

    console.log('[IBAN] Original:', iban);

    console.log('[IBAN] Normalizado:', normalizedIban);

    /**
     * IBAN PT:
     *
     * PT + 23 dígitos
     *
     * Total = 25 caracteres
     */

    if (!/^PT\d{23}$/.test(normalizedIban)) {
      return {
        status: 'REJECTED',
        reason: 'O IBAN cadastrado possui formato inválido.',
      };
    }

    /**
     * -------------------------------------------------------
     * CHECKSUM
     * -------------------------------------------------------
     */

    if (!this.isValidIbanChecksum(normalizedIban)) {
      return {
        status: 'REJECTED',
        reason: 'O IBAN cadastrado possui checksum inválido.',
      };
    }

    /**
     * -------------------------------------------------------
     * PROCURAR IBAN NO DOCUMENTO
     * -------------------------------------------------------
     */

    const extractedIban = this.extractIbanFromText(text);

    console.log('[IBAN] Encontrado:', extractedIban);

    if (!extractedIban) {
      return {
        status: 'REJECTED',
        reason: 'Não foi possível encontrar um IBAN válido no comprovativo.',
      };
    }

    /**
     * -------------------------------------------------------
     * COMPARAR
     * -------------------------------------------------------
     */

    if (extractedIban !== normalizedIban) {
      return {
        status: 'REJECTED',
        reason:
          'O IBAN encontrado no comprovativo não corresponde ao IBAN cadastrado.',
      };
    }

    /**
     * -------------------------------------------------------
     * VALIDAR TITULAR
     * -------------------------------------------------------
     */

    if (accountHolder) {
      const holderMatches = this.accountHolderMatches(accountHolder, text);

      console.log('[IBAN] Titular corresponde:', holderMatches);

      if (!holderMatches) {
        return {
          status: 'REVIEW_REQUIRED',

          reason:
            'O IBAN corresponde ao cadastrado, mas o nome do titular deve ser confirmado administrativamente.',
        };
      }
    }

    /**
     * -------------------------------------------------------
     * IBAN CORRETO
     * -------------------------------------------------------
     */

    return {
      status: 'REVIEW_REQUIRED',

      reason:
        'IBAN encontrado e compatível. Documento aguardando validação administrativa.',
    };
  }

  /**
   * =========================================================
   * NORMALIZAR IBAN
   * =========================================================
   */
  private normalizeIban(iban: string): string {
    return iban.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * =========================================================
   * EXTRAIR IBAN DO TEXTO
   * =========================================================
   */
  private extractIbanFromText(text: string): string | null {
    /**
     * Remover espaços:
     *
     * PT50 0193 0000...
     *
     * vira:
     *
     * PT5001930000...
     */

    const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    /**
     * Procurar IBAN PT
     */
    const matches = normalized.match(/PT\d{23}/g);

    if (!matches || matches.length === 0) {
      return null;
    }

    /**
     * Procurar IBAN válido
     */
    for (const candidate of matches) {
      if (this.isValidIbanChecksum(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * =========================================================
   * VALIDAR CHECKSUM IBAN
   * =========================================================
   */
  private isValidIbanChecksum(iban: string): boolean {
    const normalized = this.normalizeIban(iban);

    if (!/^[A-Z]{2}\d+$/.test(normalized)) {
      return false;
    }

    /**
     * Mover os 4 primeiros
     * caracteres para o final
     */
    const rearranged = normalized.slice(4) + normalized.slice(0, 4);

    /**
     * Converter letras:
     *
     * A = 10
     * B = 11
     * ...
     * Z = 35
     */
    let numeric = '';

    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numeric += (char.charCodeAt(0) - 55).toString();
      } else {
        numeric += char;
      }
    }

    /**
     * MOD 97
     */
    let remainder = 0;

    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }

    return remainder === 1;
  }

  /**
   * =========================================================
   * VALIDAR TITULAR
   * =========================================================
   */
  private accountHolderMatches(accountHolder: string, text: string): boolean {
    const normalizedHolder = this.normalizeText(accountHolder);

    const normalizedText = this.normalizeText(text);

    const words = normalizedHolder
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    if (words.length === 0) {
      return true;
    }

    let matches = 0;

    for (const word of words) {
      if (normalizedText.includes(word)) {
        matches++;
      }
    }

    /**
     * Pelo menos metade
     * dos nomes precisa aparecer.
     */
    const requiredMatches = Math.ceil(words.length / 2);

    return matches >= requiredMatches;
  }

  /**
   * =========================================================
   * NORMALIZAR TEXTO
   * =========================================================
   */
  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * =========================================================
   * CLOUDINARY
   * =========================================================
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    mimeType: string,
  ): Promise<CloudinaryUploadResult> {
    const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'professionals/documents',

          resource_type: resourceType,
        },

        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary não retornou resultado.'));

            return;
          }

          resolve({
            secure_url: result.secure_url,

            public_id: result.public_id,

            resource_type: result.resource_type,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }
}
