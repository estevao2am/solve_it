import { Module } from '@nestjs/common';
import { JobsService } from './job.service';
import { JobsController } from './job.controller';
import { LocationModule } from 'src/location/location.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [LocationModule, NotificationModule, PaymentModule],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobModule {}
