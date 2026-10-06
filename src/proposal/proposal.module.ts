import { Module } from '@nestjs/common';
import { ProposalsService } from './proposal.service';
import { ProposalsController } from './proposal.controller';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ProposalsService],
  controllers: [ProposalsController],
})
export class ProposalModule {}
