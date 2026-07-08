import { FLOW_ACTIONS } from '../flow-context';
import type { FlowContext, FlowDecisionCandidate } from '../flow-context';
import type { SubmissionFlowRule } from '../../interfaces/submission-flow-rule';
import { resolveProcessorKey } from '../flow-resolution';

function isRegisterEventIntent(context: FlowContext): boolean {
  const metadata = (context.form.metadata ?? {}) as Record<string, unknown>;
  const flowIntent = metadata.flowIntent ?? metadata.captureIntent;
  const processingType = context.processingType ?? '';

  return (
    flowIntent === 'REGISTER_EVENT' ||
    flowIntent === 'register_event' ||
    processingType === 'REGISTER_EVENT' ||
    processingType.endsWith('_EVENT')
  );
}

export const registerEventRule: SubmissionFlowRule = {
  id: 'register-event',
  priority: 90,
  evaluate(context: FlowContext): FlowDecisionCandidate | null {
    if (!isRegisterEventIntent(context)) return null;

    return {
      ruleId: 'register-event',
      priority: 90,
      action: FLOW_ACTIONS.REGISTER_EVENT,
      targetEntity: context.entityMapping?.targetEntity ?? null,
      targetId: null,
      reason: 'Form only registers activity without creating a primary entity.',
      processor: resolveProcessorKey(context.processingType),
    };
  },
};
