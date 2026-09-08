import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

import { MailModule } from './config/mail/mail.module';
import { CategoryModule } from './category/category.module';
import { JobsService } from './job/job.service';
import { JobModule } from './job/job.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MailModule,

    UsersModule,

    CategoryModule,

    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService, JobsService],
})
export class AppModule {}
