import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { WorkflowActionsModule } from '@/core/workflow-actions/workflow-actions.module';
import { WorkflowDefinitionService } from './application/workflow-definition.service';
import { WorkflowTransitionService } from './application/workflow-transition.service';
import { WorkflowEngineService } from './application/workflow-engine.service';

@Module({
  imports: [EventsModule, WorkflowActionsModule],
  providers: [WorkflowDefinitionService, WorkflowTransitionService, WorkflowEngineService],
  exports: [WorkflowEngineService, WorkflowDefinitionService, WorkflowTransitionService],
})
export class WorkflowEngineModule {}
