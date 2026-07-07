import {
  CAPTURE_PROCESSING_TYPES,
  type CaptureProcessingType,
} from '@agroerp/shared';

export { CAPTURE_PROCESSING_TYPES, type CaptureProcessingType };

export interface CaptureFormProcessingMetadata {
  processingType?: CaptureProcessingType | string;
  [key: string]: unknown;
}

export function resolveProcessingType(form: {
  metadata?: unknown;
}): CaptureProcessingType | null {
  const meta = form.metadata as CaptureFormProcessingMetadata | null | undefined;
  const raw = meta?.processingType;
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const values = Object.values(CAPTURE_PROCESSING_TYPES) as string[];
  return values.includes(raw) ? (raw as CaptureProcessingType) : null;
}
