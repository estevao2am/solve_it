import { Module } from '@nestjs/common';
import { JobsService } from './job.service';
import { JobsController } from './job.controller';

@Module({
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobModule {}
