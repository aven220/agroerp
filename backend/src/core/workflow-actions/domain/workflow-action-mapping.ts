import { WORKFLOW_BUSINESS_EVENT_TYPES } from './workflow-action';

export type WorkflowBusinessActionMapping =
  | { kind: 'noop' }
  | { kind: 'event'; eventType: string }
  | { kind: 'submission_flow' };

export const WORKFLOW_ACTION_MAPPINGS: Record<string, WorkflowBusinessActionMapping> = {
  SUBMIT: { kind: 'noop' },
  SEND_REVIEW: { kind: 'event', eventType: WORKFLOW_BUSINESS_EVENT_TYPES.REVIEW },
  APPROVE: { kind: 'submission_flow' },
  REJECT: { kind: 'event', eventType: WORKFLOW_BUSINESS_EVENT_TYPES.REJECTION },
  COMPLETE: { kind: 'event', eventType: WORKFLOW_BUSINESS_EVENT_TYPES.COMPLETION },
};

export function resolveWorkflowActionMapping(
  action: string,
): WorkflowBusinessActionMapping | null {
  return WORKFLOW_ACTION_MAPPINGS[action] ?? null;
}
