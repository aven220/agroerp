import type { CaptureAnalyticsEventType } from './analytics-types';

/** Canonical analytics event emitted from Capture Processing → EBIAP BI */
export interface AnalyticsEvent {
  eventType: CaptureAnalyticsEventType;
  timestamp: string;
  organizationId: string;
  sourceForm: {
    formId: string;
    formKey: string;
    formVersion: number;
  };
  processingType?: string;
  entityId: string;
  entityType: string;
  submissionId: string;
  externalId?: string | null;
  location?: AnalyticsLocation;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface EmitAnalyticsFromProcessingInput {
  organizationId: string;
  userId: string;
  form: {
    id: string;
    formKey: string;
    version: number;
  };
  submission: {
    id: string;
    externalId?: string | null;
    gpsLocation?: unknown;
    data?: unknown;
  };
  processingType: string;
  processorKey: string;
  entityType: string;
  entityId: string;
  duplicate?: boolean;
}
