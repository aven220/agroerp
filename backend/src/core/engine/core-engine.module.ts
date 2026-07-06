import { Module } from '@nestjs/common';
import { CoreEngineService } from './application/core-engine.service';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { EventsModule } from '@/core/events/events.module';
import { AuditModule } from '@/core/audit/audit.module';
import { SyncModule } from '@/core/sync/sync.module';

@Module({
  imports: [EventsModule, AuditModule, SyncModule],
  providers: [CoreEngineService, RequestContextMiddleware],
  exports: [CoreEngineService, RequestContextMiddleware],
})
export class CoreEngineModule {}
