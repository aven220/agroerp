import { Module } from '@nestjs/common';
import { SubmissionFlowService } from './application/submission-flow.service';
import { SubmissionDecisionService } from './application/submission-decision.service';
import { SubmissionContextBuilder } from './application/submission-context.builder';

@Module({
  providers: [
    SubmissionContextBuilder,
    SubmissionDecisionService,
    SubmissionFlowService,
  ],
  exports: [SubmissionFlowService],
})
export class SubmissionFlowModule {}
