import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { BpmsController } from './presentation/bpms.controller';
import { BpmsAuditService } from './application/bpms-audit.service';
import { BpmsIntegrationService } from './application/bpms-integration.service';
import { BpmsProcessService } from './application/bpms-process.service';
import { BpmsDesignerService } from './application/bpms-designer.service';
import { BpmsRuntimeService } from './application/bpms-runtime.service';
import { BpmsTaskService } from './application/bpms-task.service';
import { BpmsRuleService } from './application/bpms-rule.service';
import { BpmsAutomationService, BpmsSchedulerService } from './application/bpms-automation.service';
import { BpmsMonitoringService, BpmsTemplateService } from './application/bpms-monitoring.service';
import { BpmsEngineService, BpmsOfflineService } from './application/bpms-engine.service';

@Module({
  imports: [CoreEngineModule],
  controllers: [BpmsController],
  providers: [
    BpmsPrismaService,
    BpmsAuditService,
    BpmsIntegrationService,
    BpmsProcessService,
    BpmsDesignerService,
    BpmsRuntimeService,
    BpmsTaskService,
    BpmsRuleService,
    BpmsAutomationService,
    BpmsSchedulerService,
    BpmsMonitoringService,
    BpmsTemplateService,
    BpmsOfflineService,
    BpmsEngineService,
  ],
  exports: [BpmsEngineService, BpmsRuntimeService, BpmsProcessService],
})
export class BpmsModule {}
