export const WORKFLOW_BUSINESS_EVENT_TYPES = {
  REVIEW: 'FormWorkflowReviewRequested',
  REJECTION: 'FormWorkflowRejected',
  COMPLETION: 'FormWorkflowCompleted',
} as const;

export const WORKFLOW_ACTION_AGGREGATE_TYPE = 'FormSubmissionWorkflow';

export interface WorkflowActionExecutionContext {
  organizationId: string;
  submissionId: string;
  formId: string;
  formKey?: string;
  userId?: string;
  action: string;
  fromStateId: string;
  fromStateName: string;
  toStateId: string;
  toStateName: string;
}

export interface WorkflowBusinessEventPayload {
  submissionId: string;
  formId: string;
  formKey?: string;
  action: string;
  fromStateId: string;
  fromStateName: string;
  toStateId: string;
  toStateName: string;
  userId?: string;
}
