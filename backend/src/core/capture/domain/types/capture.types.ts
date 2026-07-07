/** Capture Engine API — domain types (no infrastructure dependencies) */

export interface CaptureAvailableForm {
  id: string;
  formKey: string;
  name: string;
  description: string | null;
  version: number;
  status: string;
  schema: unknown;
  publishedAt: Date | null;
}

export interface CaptureAvailableFormsResponse {
  syncedAt: string;
  forms: CaptureAvailableForm[];
  assignmentCount?: number;
}

export interface CaptureFormDetailResponse {
  formId: string;
  formKey: string;
  name: string;
  description: string | null;
  version: number;
  status: string;
  publishedAt: Date | null;
  schema: unknown;
  render: {
    schemaVersion: number;
    settings?: unknown;
    fields: unknown[];
    resolvedData: Record<string, unknown>;
  };
}

export interface CaptureSyncFileRef {
  externalId?: string;
  filename?: string;
  mimeType?: string;
  resourceId?: string;
  fieldKey?: string;
  storageKey?: string;
}

export interface CaptureSyncSubmissionInput {
  formId: string;
  data: Record<string, unknown>;
  externalId: string;
  gpsLocation?: { lat: number; lng: number; accuracy?: number };
  gpsTrack?: { lat: number; lng: number; timestamp?: string }[];
  deviceInfo?: Record<string, unknown>;
  clientCreatedAt?: string;
}

export interface CaptureSyncInput {
  submissions: CaptureSyncSubmissionInput[];
  files?: CaptureSyncFileRef[];
  deviceInfo?: Record<string, unknown>;
}

export interface CaptureSyncResponse {
  results: Array<{
    externalId: string;
    status: 'created' | 'duplicate' | 'error';
    submissionId?: string;
    error?: string;
  }>;
  filesReceived: number;
  processedAt: string;
}
