/** Domain event contract — submission had no processing route or was skipped */

export interface CaptureProcessingSkippedEvent {
  eventType: 'CaptureProcessingSkipped';
  organizationId: string;
  submissionId: string;
  formId: string;
  formKey: string;
  externalId?: string;
  reason: string;
  processingType?: string;
  occurredAt: string;
}
