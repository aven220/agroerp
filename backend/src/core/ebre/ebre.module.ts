import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { ResourceEngineModule } from '@/core/resource-engine/resource-engine.module';
import { EbreController } from './presentation/ebre.controller';
import { BreRuleEngine } from './application/bre-rule.engine';
import { BreExpressionEngine } from './application/bre-expression.engine';
import { BreActionExecutor } from './application/bre-action.executor';
import { BreExecutorService } from './application/bre-executor.service';
import { BreRulesService } from './application/bre-rules.service';
import { BreGroupsService } from './application/bre-groups.service';
import { BreDecisionService } from './application/bre-decision.service';
import { BreSimulatorService } from './application/bre-simulator.service';
import { BreEventBridgeService } from './application/bre-event-bridge.service';
import { BreSchedulerService } from './application/bre-scheduler.service';
import { BreMetricsService } from './application/bre-metrics.service';
import { BreAuditService } from './application/bre-audit.service';
import { BreAiService } from './application/bre-ai.service';
import { BreConflictService } from './application/bre-conflict.service';

@Module({
  imports: [EventsModule, CoreEngineModule, WorkflowsModule, ResourceEngineModule],
  controllers: [EbreController],
  providers: [
    BreRuleEngine,
    BreExpressionEngine,
    BreActionExecutor,
    BreExecutorService,
    BreRulesService,
    BreGroupsService,
    BreDecisionService,
    BreSimulatorService,
    BreEventBridgeService,
    BreSchedulerService,
    BreMetricsService,
    BreAuditService,
    BreAiService,
    BreConflictService,
  ],
  exports: [BreExecutorService, BreRulesService, BreMetricsService],
})
export class EbreModule {}
