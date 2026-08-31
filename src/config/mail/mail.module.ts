import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './MailService';

@Module({
  imports: [
    ConfigModule,

    MailerModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: configService.getOrThrow<number>('SMTP_PORT'),
          secure: false,
        },

        defaults: {
          from: configService.getOrThrow<string>('SMTP_FROM'),
        },
      }),
    }),
  ],

  providers: [MailService],

  exports: [MailService],
})
export class MailModule {}
