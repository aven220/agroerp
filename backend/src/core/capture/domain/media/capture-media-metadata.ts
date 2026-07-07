/** Contrato de metadata multimedia para sincronización futura (sin almacenamiento aún) */

export type CaptureMediaType = 'photo' | 'signature' | 'video' | 'audio' | 'document';

export interface CaptureGpsPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  capturedAt?: string;
}

export interface CaptureDeviceInfo {
  platform?: string;
  deviceId?: string;
  appVersion?: string;
  osVersion?: string;
  model?: string;
}

export interface CaptureMediaMetadata {
  /** Identificador local del cliente (UUID) */
  externalId: string;
  type: CaptureMediaType;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  capturedAt: string;
  fieldKey?: string;
  submissionExternalId?: string;
  gps?: CaptureGpsPoint;
  device?: CaptureDeviceInfo;
  /** Referencia futura al Resource ERP tras upload */
  serverResourceId?: string;
  storageKey?: string;
}
