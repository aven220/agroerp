import { FLOW_ACTIONS } from '../flow-context';
import type { FlowContext, FlowDecisionCandidate } from '../flow-context';
import type { SubmissionFlowRule } from '../../interfaces/submission-flow-rule';
import {
  LEGACY_CREATE_PROCESSING_TYPES,
  findExistingForTarget,
  resolveProcessorKey,
  resolveTargetEntity,
} from '../flow-resolution';

export const updateEntityRule: SubmissionFlowRule = {
  id: 'update-entity',
  priority: 80,
  evaluate(context: FlowContext): FlowDecisionCandidate | null {
    if (!context.processingType) return null;

    // Legacy create forms always follow CREATE flow for backward compatibility.
    if (LEGACY_CREATE_PROCESSING_TYPES.has(context.processingType)) {
      return null;
    }

    const targetEntity =
      context.entityMapping?.targetEntity ?? resolveTargetEntity(context.processingType);
    const existing = findExistingForTarget(context, targetEntity);
    if (!existing) return null;

    return {
      ruleId: 'update-entity',
      priority: 80,
      action: FLOW_ACTIONS.UPDATE_ENTITY,
      targetEntity: existing.entityType,
      targetId: existing.id,
      reason: 'Entity mapping identified an existing ERP record to update.',
      processor: resolveProcessorKey(context.processingType),
    };
  },
};
