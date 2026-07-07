import type {
  FormSubmission,
  FormSubmissionStatsRow,
  FormSubmissionWithForm,
  ResourceSyncStatus,
  SubmissionResource,
} from '../types/form.types';

export interface FormSubmissionFindManyFilters {
  organizationId: string;
  formId?: string;
  formKey?: string;
}

export interface FormSubmissionCreateData {
  organizationId: string;
  formId: string;
  formVersion: number;
  resourceId: string;
  data: object;
  gpsLocation?: object;
  gpsTrack?: object;
  deviceInfo?: object;
  context: object;
  status: string;
  syncStatus: ResourceSyncStatus;
  externalId?: string;
  createdBy: string;
}

export interface SubmissionResourceCreateData {
  organizationId: string;
  resourceType: string;
  schemaVersion: number;
  data: object;
  attributes: object;
  metadata: object;
  status: string;
  syncStatus: ResourceSyncStatus;
  externalId?: string;
  createdBy: string;
  updatedBy: string;
}

export interface FormSubmissionRepository {
  findMany(
    filters: FormSubmissionFindManyFilters,
  ): Promise<FormSubmissionWithForm[]>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormSubmissionWithForm | null>;

  findByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<(FormSubmission & { form: FormSubmissionWithForm['form'] }) | null>;

  create(data: FormSubmissionCreateData): Promise<FormSubmission>;

  createResource(data: SubmissionResourceCreateData): Promise<SubmissionResource>;

  findResourceById(id: string): Promise<SubmissionResource | null>;

  findStatsRowsByFormId(
    organizationId: string,
    formId: string,
  ): Promise<FormSubmissionStatsRow[]>;
}
