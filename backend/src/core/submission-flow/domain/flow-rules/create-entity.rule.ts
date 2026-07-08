import { FLOW_ACTIONS } from '../flow-context';
import type { FlowContext, FlowDecisionCandidate } from '../flow-context';
import type { SubmissionFlowRule } from '../../interfaces/submission-flow-rule';
import {
  LEGACY_CREATE_PROCESSING_TYPES,
  findExistingForTarget,
  resolveProcessorKey,
  resolveTargetEntity,
} from '../flow-resolution';

export const createEntityRule: SubmissionFlowRule = {
  id: 'create-entity',
  priority: 50,
  evaluate(context: FlowContext): FlowDecisionCandidate | null {
    if (!context.processingType) return null;

    const targetEntity =
      context.entityMapping?.targetEntity ?? resolveTargetEntity(context.processingType);
    const existing = findExistingForTarget(context, targetEntity);
    if (existing) return null;

    const processor = resolveProcessorKey(context.processingType);
    if (!processor && !LEGACY_CREATE_PROCESSING_TYPES.has(context.processingType)) {
      return null;
    }

    return {
      ruleId: 'create-entity',
      priority: 50,
      action: FLOW_ACTIONS.CREATE_ENTITY,
      targetEntity,
      targetId: null,
      reason: 'No existing entity was identified; create a new ERP record.',
      processor,
    };
  },
};
