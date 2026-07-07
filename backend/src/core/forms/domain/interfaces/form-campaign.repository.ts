import type { FormCampaign, FormCampaignWithForm } from '../types/form.types';

export interface FormCampaignFindManyFilters {
  organizationId: string;
  status?: string;
  formId?: string;
  search?: string;
}

export interface FormCampaignCreateData {
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  formId: string;
  status: string;
  startsAt?: Date;
  endsAt?: Date;
  expectedCount?: number;
  metadata: object;
  createdBy: string;
}

export interface FormCampaignUpdateData {
  name?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  expectedCount?: number;
  metadata?: object;
}

export interface FormCampaignRepository {
  findMany(
    filters: FormCampaignFindManyFilters,
  ): Promise<FormCampaignWithForm[]>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormCampaignWithForm | null>;

  findByCode(
    organizationId: string,
    code: string,
  ): Promise<FormCampaign | null>;

  create(data: FormCampaignCreateData): Promise<FormCampaignWithForm>;

  update(
    id: string,
    data: FormCampaignUpdateData,
  ): Promise<FormCampaignWithForm>;

  updateStatus(id: string, status: string): Promise<FormCampaignWithForm>;
}
