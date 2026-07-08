import { Module } from '@nestjs/common';
import { EntityResolutionModule } from '@/core/entity-resolution/entity-resolution.module';
import { SubmissionFlowService } from './application/submission-flow.service';
import { SubmissionDecisionService } from './application/submission-decision.service';
import { SubmissionContextBuilder } from './application/submission-context.builder';

@Module({
  imports: [EntityResolutionModule],
  providers: [
    SubmissionContextBuilder,
    SubmissionDecisionService,
    SubmissionFlowService,
  ],
  exports: [SubmissionFlowService],
})
export class SubmissionFlowModule {}
