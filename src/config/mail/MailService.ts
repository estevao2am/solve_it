import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(email: string, name?: string | null): Promise<void> {
    console.log('Enviando email para:', email);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Bem-vindo ao Resolve  ',

      text: `Olá ${name ?? 'Utilizador'}, bem-vindo ao Mister Pizza!`,

      html: `
        <h1>Olá ${name ?? 'Utilizador'}! 🔧</h1>

        <p>
          Bem-vindo ao <strong>Mister Pizza</strong>.
        </p>

        <p>
          A tua conta foi criada com sucesso.
        </p>
      `,
    });

    console.log('Email enviado com sucesso!');
  }

  async sendPasswordResetCode(
    email: string,
    name: string,
    code: string,
    validMinutes: number,
  ): Promise<void> {
    const safeName = escapeHtml(name);

    await this.mailerService.sendMail({
      to: email,
      subject: `${code} é o teu código de recuperação da Solve`,

      text:
        `Olá ${name},\n\n` +
        `O teu código para criar uma nova palavra-passe é ${code}.\n` +
        `É válido durante ${validMinutes} minutos.\n\n` +
        'Se não foste tu a pedir, ignora este e-mail: a tua palavra-passe não muda.',

      html: `
        <p>Olá ${safeName},</p>
        <p>O teu código para criar uma nova palavra-passe é:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
        <p>É válido durante ${validMinutes} minutos.</p>
        <p style="color:#636363">
          Se não foste tu a pedir, ignora este e-mail: a tua palavra-passe não muda.
        </p>
      `,
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
