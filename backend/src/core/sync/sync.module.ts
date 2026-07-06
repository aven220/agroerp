import { Module } from '@nestjs/common';
import { SyncService } from './application/sync.service';
import { SyncController } from './presentation/sync.controller';

@Module({
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
