export const WORKFLOW_ACTIONS = [
  'SUBMIT',
  'SEND_REVIEW',
  'APPROVE',
  'REJECT',
  'COMPLETE',
] as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export const WORKFLOW_ACTION_LABELS: Record<WorkflowAction, string> = {
  SUBMIT: 'Enviar (SUBMIT)',
  SEND_REVIEW: 'Enviar a revisión (SEND_REVIEW)',
  APPROVE: 'Aprobar (APPROVE)',
  REJECT: 'Rechazar (REJECT)',
  COMPLETE: 'Completar (COMPLETE)',
};

export interface FormWorkflowState {
  id: string;
  name: string;
}

export interface FormWorkflowTransition {
  from: string;
  to: string;
  action: WorkflowAction | string;
}

export interface FormWorkflowDefinition {
  enabled: boolean;
  states: FormWorkflowState[];
  transitions: FormWorkflowTransition[];
}
