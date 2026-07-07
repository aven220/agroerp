/** Domain event contract — emitted after ERP action from a capture submission */

export interface CaptureSubmissionProcessedEvent {
  eventType: 'CaptureSubmissionProcessed';
  organizationId: string;
  submissionId: string;
  formId: string;
  formKey: string;
  externalId?: string;
  processingType: string;
  processorKey: string;
  entityType: string;
  entityId: string;
  duplicate?: boolean;
  occurredAt: string;
}
