import type { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import type { FormSubmission, SubmissionResource } from '@/core/forms/domain/types/form.types';

export interface ProcessableFormRef {
  id: string;
  formKey: string;
  version: number;
  metadata?: unknown;
  schema?: unknown;
}

export interface ProcessableSubmission {
  organizationId: string;
  userId: string;
  form: ProcessableFormRef;
  submission: FormSubmission;
  resource: SubmissionResource;
  draft: boolean;
  ctx?: RequestContext;
}

export interface SubmissionProcessorResult {
  processorKey: string;
  processingType: string;
  entityType: string;
  entityId: string;
  duplicate?: boolean;
}

export interface SubmissionProcessingOutcome {
  processed: boolean;
  processingType?: string;
  processorKey?: string;
  entityType?: string;
  entityId?: string;
  skippedReason?: string;
  duplicate?: boolean;
}
