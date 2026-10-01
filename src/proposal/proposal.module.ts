import { Module } from '@nestjs/common';
import { ProposalsService } from './proposal.service';
import { ProposalsController } from './proposal.controller';

@Module({
  providers: [ProposalsService],
  controllers: [ProposalsController],
})
export class ProposalModule {}
