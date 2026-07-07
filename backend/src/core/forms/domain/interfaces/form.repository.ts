import type { FormDefinition, FormStatus } from '../types/form.types';

export interface FormFindManyFilters {
  organizationId: string;
  status?: FormStatus;
  search?: string;
  publishedOnly?: boolean;
}

export interface FormCreateData {
  organizationId: string;
  formKey: string;
  name: string;
  description?: string | null;
  version: number;
  schema: object;
  status: FormStatus;
  createdBy: string;
}

export interface FormUpdateData {
  name?: string;
  description?: string | null;
  schema?: object;
}

export interface FormRepository {
  findMany(filters: FormFindManyFilters): Promise<FormDefinition[]>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormDefinition | null>;

  findPublishedByKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null>;

  findLatestByKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null>;

  create(data: FormCreateData): Promise<FormDefinition>;

  update(id: string, data: FormUpdateData): Promise<FormDefinition>;

  publish(organizationId: string, formId: string, formKey: string): Promise<void>;
}
