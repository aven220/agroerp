import type { FormDefinition, FormStatus, FormVersionHistory } from '../types/form.types';

export interface FormDuplicateCreateData {
  organizationId: string;
  formKey: string;
  name: string;
  description: string | null;
  version: number;
  schema: object;
  status: FormStatus;
  sectorCode: string | null;
  commodityCode: string | null;
  tags: string[];
  metadata: object;
  workflowKey: string | null;
  clonedFromId: string;
  createdBy: string;
}

export interface FormLifecycleUpdateData {
  status?: FormStatus;
  approvedBy?: string;
  approvedAt?: Date;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface FormVersionHistoryCreateData {
  organizationId: string;
  formId: string;
  fromVersion: number;
  toVersion: number;
  changeType: string;
  snapshot: object;
  actorId: string;
  reasonNotes?: string;
}

export interface FormLifecycleRepository {
  findAnyByFormKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormDefinition | null>;

  createDuplicate(data: FormDuplicateCreateData): Promise<FormDefinition>;

  updateLifecycle(
    id: string,
    data: FormLifecycleUpdateData,
  ): Promise<FormDefinition>;

  createVersionHistory(
    data: FormVersionHistoryCreateData,
  ): Promise<FormVersionHistory>;

  findVersionHistory(
    organizationId: string,
    formId: string,
  ): Promise<FormVersionHistory[]>;
}
