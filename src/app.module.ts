import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

import { MailModule } from './config/mail/mail.module';
import { CategoryModule } from './category/category.module';
import { JobModule } from './job/job.module';
import { LocationModule } from './location/location.module';
import { ProfessionalModule } from './professional/professional.module';
import { NotificationModule } from './notification/notification.module';
import { ProposalModule } from './proposal/proposal.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.local (fora do git) para segredos como GOOGLE_PLACES_API_KEY;
      // tem prioridade sobre o .env.
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    MailModule,

    UsersModule,

    CategoryModule,

    JobModule,

    LocationModule,

    ProfessionalModule,

    NotificationModule,

    ProposalModule,

    PortfolioModule,

    WalletModule,

    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
