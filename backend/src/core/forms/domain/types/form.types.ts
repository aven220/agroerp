/** Domain types for UDFE — no Prisma dependency */

export type FormStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'deprecated'
  | 'archived';

export type ResourceSyncStatus = 'synced' | 'pending' | 'conflict';

export interface FormDefinition {
  id: string;
  organizationId: string;
  formKey: string;
  name: string;
  description: string | null;
  version: number;
  schema: unknown;
  status: FormStatus;
  sectorCode: string | null;
  commodityCode: string | null;
  tags: string[];
  metadata: unknown;
  workflowKey: string | null;
  parentVersionId: string | null;
  clonedFromId: string | null;
  aiReadiness: unknown;
  publishedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  archivedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FormTemplate {
  id: string;
  organizationId: string;
  templateKey: string;
  name: string;
  description: string | null;
  sectorCode: string | null;
  schema: unknown;
  tags: string[];
  isOfficial: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FormSubmission {
  id: string;
  organizationId: string;
  formId: string;
  formVersion: number;
  resourceId: string | null;
  data: unknown;
  context: unknown;
  gpsLocation: unknown;
  gpsTrack: unknown;
  deviceInfo: unknown;
  status: string;
  workflowState: string | null;
  syncStatus: ResourceSyncStatus;
  externalId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FormSubmissionWithForm extends FormSubmission {
  form: {
    id: string;
    formKey: string;
    name: string;
    version: number;
    schema?: unknown;
  };
}

export interface FormCampaign {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  formId: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  expectedCount: number | null;
  metadata: unknown;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormCampaignWithForm extends FormCampaign {
  form?: {
    id?: string;
    formKey: string;
    name: string;
    version?: number;
    status?: string;
    publishedAt?: Date | null;
  };
}

export interface FormAssignment {
  id: string;
  organizationId: string;
  formId: string;
  assigneeType: string;
  assigneeId: string;
  contextType: string | null;
  contextId: string | null;
  dueAt: Date | null;
  status: string;
  assignedBy: string | null;
  assignedAt: Date;
  completedAt: Date | null;
}

export interface FormAssignmentWithForm extends FormAssignment {
  form: {
    id?: string;
    formKey: string;
    name: string;
    version?: number;
    status?: string;
  };
}

export interface SubmissionResource {
  id: string;
  organizationId: string;
  resourceType: string;
  schemaVersion: number;
  data: unknown;
  attributes: unknown;
  metadata: unknown;
  status: string;
  syncStatus: ResourceSyncStatus;
  externalId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmissionStatsRow {
  id: string;
  status: string;
  syncStatus: ResourceSyncStatus;
  gpsLocation: unknown;
  createdAt: Date;
  context: unknown;
  data: unknown;
}

export interface FormVersionHistory {
  id: string;
  organizationId: string;
  formId: string;
  fromVersion: number;
  toVersion: number;
  changeType: string;
  snapshot: unknown;
  actorId: string | null;
  reasonNotes: string | null;
  occurredAt: Date;
}

export interface FormImportLog {
  id: string;
  organizationId: string;
  formId: string | null;
  batchId: string;
  rowNumber: number;
  status: string;
  message: string | null;
  payload: unknown;
  createdAt: Date;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface FormIdCount {
  formId: string;
  count: number;
}

export interface FormSummary {
  id: string;
  formKey: string;
  name: string;
}

export interface FormDashboardKpis {
  totalForms: number;
  publishedForms: number;
  draftForms: number;
  inReviewForms: number;
  totalSubmissions: number;
  pendingSync: number;
  totalAssignments: number;
  pendingAssignments: number;
}

export interface SubmissionExportRow {
  id: string;
  formId: string;
  formVersion: number;
  status: string;
  syncStatus: ResourceSyncStatus;
  gpsLocation: unknown;
  createdAt: Date;
  externalId: string | null;
  data: unknown;
  form: {
    formKey: string;
    name: string;
    schema: unknown;
  };
}

export interface DataCenterSubmissionRow {
  id: string;
  formId: string;
  status: string;
  syncStatus: ResourceSyncStatus;
  gpsLocation: unknown;
  createdAt: Date;
  form: { formKey: string; name: string } | null;
}

export interface DataCenterCampaignRow {
  id: string;
  code: string;
  name: string;
  status: string;
  expectedCount: number | null;
  formId: string;
}

export interface SyncStatusCount {
  syncStatus: ResourceSyncStatus;
  count: number;
}

export interface FormStatusGroupCount {
  status: FormStatus;
  count: number;
}

export interface SubmissionFormStatusCount {
  formId: string;
  status: string;
  count: number;
}
