import { Injectable } from '@nestjs/common';
import { FLOW_ACTIONS, type FlowContext, type SubmissionDecision } from '../domain/flow-context';
import { getSubmissionFlowRules } from '../registry/submission-flow-rule.registry';

@Injectable()
export class SubmissionDecisionService {
  /**
   * Evaluates flow rules and returns the highest-priority decision.
   * Returns null when no rule applies (legacy processing path).
   */
  decide(context: FlowContext): SubmissionDecision | null {
    if (!context.processingType) {
      return {
        action: FLOW_ACTIONS.SKIP,
        targetEntity: null,
        targetId: null,
        reason: 'Form has no processingType metadata.',
        processor: null,
      };
    }

    const rules = getSubmissionFlowRules();
    for (const rule of rules) {
      const candidate = rule.evaluate(context);
      if (candidate) {
        return this.toDecision(candidate);
      }
    }

    return null;
  }

  private toDecision(candidate: SubmissionDecision): SubmissionDecision {
    return {
      action: candidate.action,
      targetEntity: candidate.targetEntity,
      targetId: candidate.targetId,
      reason: candidate.reason,
      processor: candidate.processor,
    };
  }
}
