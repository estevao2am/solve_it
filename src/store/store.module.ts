import { Module } from '@nestjs/common';
import { StoresService } from './store.service';
import { StoresController } from './store.controller';

@Module({
  providers: [StoresService],
  controllers: [StoresController],
})
export class StoreModule {}
