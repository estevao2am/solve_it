import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

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
          // cast to any to satisfy JwtModuleOptions typing for expiresIn
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1h') as any,
        },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
