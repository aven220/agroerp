import { Module, forwardRef } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { IdentityModule } from '@/core/identity/identity.module';
import { ResourceEngineModule } from '@/core/resource-engine/resource-engine.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { WorkflowDefinitionsService } from './application/workflow-definitions.service';
import { WorkflowInstancesService } from './application/workflow-instances.service';
import { WorkflowRuleEngine } from './application/workflow-rule.engine';
import { WorkflowAssignmentResolver } from './application/workflow-assignment.resolver';
import { WorkflowActionExecutor } from './application/workflow-action.executor';
import { WorkflowMetricsService } from './application/workflow-metrics.service';
import { WorkflowNotificationDispatcher } from './application/workflow-notification.dispatcher';
import { WorkflowSlaService } from './application/workflow-sla.service';
import { WorkflowFormBridgeService } from './application/workflow-form-bridge.service';
import { WorkflowImportExportService } from './application/workflow-import-export.service';
import { WorkflowEntityLifecycleBridge } from './application/workflow-entity-lifecycle.bridge';
import {
  WorkflowDefinitionsController,
  WorkflowInstancesController,
} from './presentation/workflows.controller';

@Module({
  imports: [
    CoreEngineModule,
    IdentityModule,
    ResourceEngineModule,
    forwardRef(() => EneacModule),
    PrmModule,
    FtipModule,
    FmdtModule,
  ],
  controllers: [WorkflowDefinitionsController, WorkflowInstancesController],
  providers: [
    WorkflowDefinitionsService,
    WorkflowInstancesService,
    WorkflowRuleEngine,
    WorkflowAssignmentResolver,
    WorkflowActionExecutor,
    WorkflowMetricsService,
    WorkflowNotificationDispatcher,
    WorkflowSlaService,
    WorkflowFormBridgeService,
    WorkflowImportExportService,
    WorkflowEntityLifecycleBridge,
  ],
  exports: [
    WorkflowDefinitionsService,
    WorkflowInstancesService,
    WorkflowRuleEngine,
    WorkflowImportExportService,
    WorkflowSlaService,
    WorkflowMetricsService,
  ],
})
export class WorkflowsModule {}
