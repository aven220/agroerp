import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EopModule } from '@/core/eop/eop.module';
import { EpopModule } from '@/core/epop/epop.module';
import { EipModule } from '@/core/eip/eip.module';
import { EintModule } from '@/core/eint/eint.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { EsdjeModule } from '@/core/esdje/esdje.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsController } from './presentation/eops.controller';
import { EopsAdminService } from './application/eops-admin.service';
import { EopsAuditService } from './application/eops-audit.service';
import { EopsBackupService } from './application/eops-backup.service';
import { EopsConfigService } from './application/eops-config.service';
import { EopsDevopsService } from './application/eops-devops.service';
import { EopsEngineService, EopsOfflineService } from './application/eops-engine.service';
import { EopsHaService } from './application/eops-ha.service';
import { EopsHealthService } from './application/eops-health.service';
import { EopsLicenseService } from './application/eops-license.service';
import { EopsBridgeService, EopsMonitoringService } from './application/eops-monitoring.service';
import { EopsObservabilityService } from './application/eops-observability.service';
import { EopsOptimizationService } from './application/eops-optimization.service';
import { EopsSecurityService } from './application/eops-security.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EopModule, EpopModule, EipModule, EintModule, EneacModule, EsdjeModule, EiampModule],
  controllers: [EopsController],
  providers: [
    EopsPrismaService,
    EopsAuditService,
    EopsAdminService,
    EopsConfigService,
    EopsHealthService,
    EopsObservabilityService,
    EopsHaService,
    EopsBackupService,
    EopsLicenseService,
    EopsSecurityService,
    EopsDevopsService,
    EopsOptimizationService,
    EopsBridgeService,
    EopsMonitoringService,
    EopsOfflineService,
    EopsEngineService,
  ],
  exports: [EopsEngineService, EopsMonitoringService, EopsHealthService],
})
export class EopsModule {}
