import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentType } from '@prisma/client';

import { multerConfig } from '../config/multer';

import {
  ProfessionalDocumentService,
  UploadDocumentResponse,
} from './professional-document.service';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';

@Controller('professionals')
export class ProfessionalDocumentController {
  constructor(private readonly documentService: ProfessionalDocumentService) {}

  @Post('documents/:type')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadDocument(
    @CurrentUser()
    user: { sub: string },

    @Param('type')
    type: DocumentType,

    @UploadedFile()
    file: Express.Multer.File,
  ): Promise<UploadDocumentResponse> {
    /**
     * Tipos permitidos
     */
    const allowedTypes: DocumentType[] = [
      DocumentType.NIF_PROOF,
      DocumentType.NISS_PROOF,
      DocumentType.PAYMENT_PROOF,
    ];

    /**
     * Validar tipo
     */
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(
        'Tipo de documento inválido. Use NIF_PROOF, NISS_PROOF ou PAYMENT_PROOF.',
      );
    }

    /**
     * Validar arquivo
     */
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    /**
     * Upload
     */
    return this.documentService.upload(user.sub, type, file);
  }
}
