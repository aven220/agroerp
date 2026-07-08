import { Module, forwardRef } from '@nestjs/common';
import { CaptureProcessingModule } from '@/core/capture-processing/processing.module';
import { EventsModule } from '@/core/events/events.module';
import { FormsModule } from '@/core/forms/forms.module';
import { SubmissionFlowModule } from '@/core/submission-flow/submission-flow.module';
import { WorkflowActionExecutorService } from './application/workflow-action-executor.service';

@Module({
  imports: [
    EventsModule,
    SubmissionFlowModule,
    CaptureProcessingModule,
    forwardRef(() => FormsModule),
  ],
  providers: [WorkflowActionExecutorService],
  exports: [WorkflowActionExecutorService],
})
export class WorkflowActionsModule {}
