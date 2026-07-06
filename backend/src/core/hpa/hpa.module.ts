import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { HpaController } from './presentation/hpa.controller';
import { HpaPersonalService } from './application/hpa-personal.service';
import { HpaAnalyticsService } from './application/hpa-analytics.service';
import { HpaNotificationService } from './application/hpa-notification.service';
import { HpaAiService } from './application/hpa-ai.service';
import { HpaAuditService } from './application/hpa-audit.service';
import { HpaAiHttpAdapter } from './infrastructure/hpa-ai-http.adapter';
import { HPA_AI_PORT } from './domain/hpa-ai.port';

@Module({
  imports: [CoreEngineModule],
  controllers: [HpaController],
  providers: [
    HpaAuditService,
    HpaNotificationService,
    HpaPersonalService,
    HpaAnalyticsService,
    HpaAiHttpAdapter,
    { provide: HPA_AI_PORT, useExisting: HpaAiHttpAdapter },
    HpaAiService,
  ],
  exports: [HpaPersonalService, HpaAnalyticsService, HpaAiService],
})
export class HpaModule {}
