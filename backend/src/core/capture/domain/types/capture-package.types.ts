import type { CaptureFormDetailResponse } from './capture.types';

export interface CaptureCatalogOption {
  value: string;
  label: string;
  parent?: string;
}

export interface CaptureCatalog {
  key: string;
  label: string;
  dependsOn?: string;
  options: CaptureCatalogOption[];
}

export interface CapturePackageAssignment {
  assignmentId: string;
  formId: string;
  status: string;
  dueAt: string | null;
  contextType: string | null;
  contextId: string | null;
  assignedAt: string;
}

export interface CapturePackageForm extends CaptureFormDetailResponse {
  assignment?: CapturePackageAssignment;
  offline: {
    offlineCapable: boolean;
    allowDraft: boolean;
    requireGps: boolean;
    geofence?: unknown;
  };
  requiredCatalogKeys: string[];
}

export interface CapturePackage {
  packageId: string;
  packageVersion: string;
  generatedAt: string;
  organizationId: string;
  userId: string;
  assignments: CapturePackageAssignment[];
  forms: CapturePackageForm[];
  catalogKeys: string[];
  offline: {
    syncRecommendedIntervalMinutes: number;
    maxSubmissionsPerSync: number;
  };
}

export interface CaptureFormVersionEntry {
  formId: string;
  formKey: string;
  version: number;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CaptureVersionCheck {
  packageVersion: string;
  serverTime: string;
  hasChanges: boolean;
  pendingAssignments: number;
  forms: CaptureFormVersionEntry[];
  catalogsChanged: boolean;
}
