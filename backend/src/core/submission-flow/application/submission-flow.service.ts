import { Injectable } from '@nestjs/common';
import type { ProcessableSubmission } from '@/core/capture-processing/domain/types/processable-submission';
import type { SubmissionDecision } from '../domain/flow-context';
import { SubmissionContextBuilder } from './submission-context.builder';
import { SubmissionDecisionService } from './submission-decision.service';

@Injectable()
export class SubmissionFlowService {
  constructor(
    private readonly contextBuilder: SubmissionContextBuilder,
    private readonly decisionService: SubmissionDecisionService,
  ) {}

  /** Builds flow context and returns a processing decision (no ERP side effects). */
  decide(input: ProcessableSubmission): SubmissionDecision | null {
    const context = this.contextBuilder.build(input);
    return this.decisionService.decide(context);
  }
}
