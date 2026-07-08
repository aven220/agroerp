import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { WorkflowDefinitionService } from './application/workflow-definition.service';
import { WorkflowTransitionService } from './application/workflow-transition.service';
import { WorkflowEngineService } from './application/workflow-engine.service';

@Module({
  imports: [EventsModule],
  providers: [WorkflowDefinitionService, WorkflowTransitionService, WorkflowEngineService],
  exports: [WorkflowEngineService, WorkflowDefinitionService, WorkflowTransitionService],
})
export class WorkflowEngineModule {}
