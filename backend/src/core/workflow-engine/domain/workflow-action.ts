export const WORKFLOW_RUNTIME_ACTIONS = [
  'SUBMIT',
  'SEND_REVIEW',
  'APPROVE',
  'REJECT',
  'COMPLETE',
] as const;

export type WorkflowRuntimeAction = (typeof WORKFLOW_RUNTIME_ACTIONS)[number];

export function isWorkflowRuntimeAction(value: string): value is WorkflowRuntimeAction {
  return (WORKFLOW_RUNTIME_ACTIONS as readonly string[]).includes(value);
}
