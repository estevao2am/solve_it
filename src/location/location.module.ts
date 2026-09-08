import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { LocationService } from './location.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
