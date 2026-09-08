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
}
