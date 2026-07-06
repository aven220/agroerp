import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EaidspModule } from '@/core/eaidsp/eaidsp.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { HedModule } from '@/core/hed/hed.module';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { EintController } from './presentation/eint.controller';
import { EintAiService } from './application/eint-ai.service';
import { EintAssistantService } from './application/eint-assistant.service';
import { EintAuditService } from './application/eint-audit.service';
import { EintBiService } from './application/eint-bi.service';
import { EintDashboardService } from './application/eint-dashboard.service';
import { EintDwhService, EintEtlService } from './application/eint-dwh.service';
import { EintEngineService, EintOfflineService } from './application/eint-engine.service';
import { EintBridgeService, EintMonitoringService } from './application/eint-monitoring.service';
import { EintNotificationService } from './application/eint-notification.service';
import { EintReportingService } from './application/eint-reporting.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EaidspModule, EbiapModule, EneacModule, HedModule],
  controllers: [EintController],
  providers: [
    EintPrismaService,
    EintAuditService,
    EintAiService,
    EintAssistantService,
    EintDwhService,
    EintEtlService,
    EintBiService,
    EintReportingService,
    EintDashboardService,
    EintNotificationService,
    EintBridgeService,
    EintMonitoringService,
    EintOfflineService,
    EintEngineService,
  ],
  exports: [EintEngineService, EintAiService, EintBiService],
})
export class EintModule {}
