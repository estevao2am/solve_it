import { Module } from '@nestjs/common';
import { JobsService } from './job.service';
import { JobsController } from './job.controller';
import { LocationModule } from 'src/location/location.module';

@Module({
  imports: [LocationModule],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobModule {}
