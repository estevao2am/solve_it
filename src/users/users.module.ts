import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { PasswordResetService } from './password-reset.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailModule } from 'src/config/mail/mail.module';

@Module({
  imports: [
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,

      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, PasswordResetService],
})
export class UsersModule {}
