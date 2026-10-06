import { Module } from '@nestjs/common';

import { NotificationModule } from 'src/notification/notification.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { PaymentGateway } from './gateway/payment-gateway';
import { SimulatedPaymentGateway } from './gateway/simulated-payment.gateway';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';

@Module({
  imports: [WalletModule, NotificationModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Trocar pelo gateway do provider real quando estiver integrado
    { provide: PaymentGateway, useClass: SimulatedPaymentGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentModule {}
