import type { WorkflowRuntimeAction } from '../domain/workflow-action';

export const FORM_WORKFLOW_EVENT_TYPES = {
  STARTED: 'FormWorkflowStarted',
  TRANSITION: 'FormWorkflowTransition',
} as const;

export const FORM_WORKFLOW_AGGREGATE_TYPE = 'FormSubmissionWorkflow';

export interface WorkflowStartedEventPayload {
  submissionId: string;
  formId: string;
  formKey?: string;
  stateId: string;
  stateName: string;
}

export interface WorkflowTransitionEventPayload {
  submissionId: string;
  formId: string;
  formKey?: string;
  fromStateId: string;
  fromStateName: string;
  toStateId: string;
  toStateName: string;
  action: WorkflowRuntimeAction | string;
  userId?: string;
}

export interface WorkflowTransitionEvent {
  eventType: typeof FORM_WORKFLOW_EVENT_TYPES.TRANSITION;
  organizationId: string;
  aggregateType: typeof FORM_WORKFLOW_AGGREGATE_TYPE;
  aggregateId: string;
  payload: WorkflowTransitionEventPayload;
  occurredAt: string;
}
