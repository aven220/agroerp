import type { FormTemplate } from '../types/form.types';

export interface FormTemplateCreateData {
  organizationId: string;
  templateKey: string;
  name: string;
  description?: string | null;
  sectorCode?: string | null;
  schema: object;
  tags?: string[];
  isOfficial?: boolean;
  createdBy: string;
}

export interface FormTemplateRepository {
  findMany(
    organizationId: string,
    sectorCode?: string,
  ): Promise<FormTemplate[]>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormTemplate | null>;

  create(data: FormTemplateCreateData): Promise<FormTemplate>;
}
