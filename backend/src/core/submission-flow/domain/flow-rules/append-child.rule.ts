import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { FLOW_ACTIONS } from '../flow-context';
import type { FlowContext, FlowDecisionCandidate } from '../flow-context';
import type { SubmissionFlowRule } from '../../interfaces/submission-flow-rule';
import { resolveProcessorKey } from '../flow-resolution';

const APPEND_CHILD_TYPES = new Set<string>([
  CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE,
]);

function isAppendChildIntent(context: FlowContext): boolean {
  if (context.processingType && APPEND_CHILD_TYPES.has(context.processingType)) {
    return true;
  }

  const metadata = (context.form.metadata ?? {}) as Record<string, unknown>;
  const flowIntent = metadata.flowIntent ?? metadata.captureIntent;
  return flowIntent === 'APPEND_CHILD' || flowIntent === 'append_child';
}

export const appendChildRule: SubmissionFlowRule = {
  id: 'append-child',
  priority: 70,
  evaluate(context: FlowContext): FlowDecisionCandidate | null {
    if (!isAppendChildIntent(context)) return null;

    const targetEntity = context.entityMapping?.targetEntity ?? 'Lot';

    return {
      ruleId: 'append-child',
      priority: 70,
      action: FLOW_ACTIONS.APPEND_CHILD,
      targetEntity,
      targetId: null,
      reason: 'Form creates a child ERP record (lot, production, visit, etc.).',
      processor: resolveProcessorKey(context.processingType),
    };
  },
};
