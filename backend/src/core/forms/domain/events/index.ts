/** Domain event contracts — implementation deferred to a future sprint */

export interface FormSubmittedEvent {
  eventType: 'FormSubmitted';
  organizationId: string;
  submissionId: string;
  formId: string;
  formKey: string;
  formVersion: number;
  resourceId: string;
  externalId?: string;
  fieldCount: number;
  draft: boolean;
  occurredAt: string;
}

export interface FormPublishedEvent {
  eventType: 'FormPublished';
  organizationId: string;
  formId: string;
  formKey: string;
  name: string;
  version: number;
  occurredAt: string;
}

export interface FormAssignedEvent {
  eventType: 'FormAssigned';
  organizationId: string;
  formId: string;
  assignmentId: string;
  assigneeId: string;
  formKey: string;
  occurredAt: string;
}
