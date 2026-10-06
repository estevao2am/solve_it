import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

import { MailService } from '../config/mail/MailService';
import { PrismaService } from '../prisma/prisma.service';

const CODE_VALID_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

// As respostas nunca dizem se o e-mail tem conta, para ninguém
// conseguir descobrir que e-mails estão registados.
const CODE_SENT_MESSAGE =
  'Se existir uma conta com este e-mail, enviámos um código de 6 dígitos.';
const INVALID_CODE_MESSAGE = 'Código incorreto ou expirado.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /** Gera um código novo e envia-o por e-mail (se a conta existir). */
  async requestCode(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true, first_name: true },
    });

    // Calculado sempre, para o tempo de resposta ser igual com ou sem conta
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    if (!user) {
      return { message: CODE_SENT_MESSAGE };
    }

    // "Reenviar código" só funciona passados 30 s
    const latest = await this.prismaService.passwordResetCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
    ) {
      return { message: CODE_SENT_MESSAGE };
    }

    // Só o último código pedido é válido
    await this.prismaService.$transaction([
      this.prismaService.passwordResetCode.deleteMany({
        where: { userId: user.id },
      }),
      this.prismaService.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() + CODE_VALID_MINUTES * 60 * 1000),
        },
      }),
    ]);

    // Sem esperar pelo e-mail: o tempo de resposta não denuncia a conta
    this.mailService
      .sendPasswordResetCode(
        user.email,
        user.first_name,
        code,
        CODE_VALID_MINUTES,
      )
      .catch((error: unknown) =>
        this.logger.error('Falha ao enviar o código de recuperação', error),
      );

    return { message: CODE_SENT_MESSAGE };
  }

  /** Confirma o código (passo 2 da app), sem o gastar. */
  async verifyCode(email: string, code: string) {
    await this.checkCode(email, code);

    return { valid: true };
  }

  /** Troca a palavra-passe e termina as sessões abertas noutros aparelhos. */
  async resetPassword(email: string, code: string, newPassword: string) {
    const { userId, codeId } = await this.checkCode(email, code);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prismaService.$transaction(async (tx) => {
      // Garante que o mesmo código não é usado duas vezes em simultâneo
      const claimed = await tx.passwordResetCode.updateMany({
        where: { id: codeId, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (claimed.count === 0) {
        throw new BadRequestException(INVALID_CODE_MESSAGE);
      }

      await tx.user.update({
        where: { id: userId },
        data: { password_hash: passwordHash },
      });

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetCode.deleteMany({ where: { userId } });
    });

    return { message: 'Palavra-passe alterada.' };
  }

  private async checkCode(email: string, code: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const entry = user
      ? await this.prismaService.passwordResetCode.findFirst({
          where: { userId: user.id, usedAt: null },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    if (!user || !entry || entry.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    // Conta a tentativa antes de comparar, para pedidos em paralelo
    // não passarem do limite
    const attempt = await this.prismaService.passwordResetCode.updateMany({
      where: { id: entry.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });

    if (attempt.count === 0) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const matches = await bcrypt.compare(code, entry.codeHash);

    if (!matches) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    // Um código certo não gasta tentativas
    await this.prismaService.passwordResetCode.update({
      where: { id: entry.id },
      data: { attempts: { decrement: 1 } },
    });

    return { userId: user.id, codeId: entry.id };
  }
}
