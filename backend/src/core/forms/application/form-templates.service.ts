import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FormDefinitionSchema } from '@agroerp/shared';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  FORM_TEMPLATE_REPOSITORY,
  type FormTemplateRepository,
} from '../domain/interfaces';
import { FormsService } from './forms.service';

@Injectable()
export class FormTemplatesService {
  constructor(
    @Inject(FORM_TEMPLATE_REPOSITORY)
    private readonly templateRepository: FormTemplateRepository,
    private readonly forms: FormsService,
  ) {}

  async findAll(organizationId: string, sectorCode?: string) {
    return this.templateRepository.findMany(organizationId, sectorCode);
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      templateKey: string;
      name: string;
      description?: string;
      sectorCode?: string;
      schema: object;
      tags?: string[];
      isOfficial?: boolean;
    },
  ) {
    return this.templateRepository.create({
      organizationId,
      templateKey: data.templateKey,
      name: data.name,
      description: data.description,
      sectorCode: data.sectorCode,
      schema: data.schema,
      tags: data.tags,
      isOfficial: data.isOfficial,
      createdBy: userId,
    });
  }

  async instantiate(
    organizationId: string,
    userId: string,
    templateId: string,
    formKey: string,
    name?: string,
    ctx?: RequestContext,
  ) {
    const template = await this.templateRepository.findFirstByOrgAndId(
      organizationId,
      templateId,
    );
    if (!template) throw new NotFoundException('Template not found');
    return this.forms.create(
      organizationId,
      userId,
      {
        formKey,
        name: name ?? template.name,
        description: template.description ?? undefined,
        schema: template.schema as unknown as FormDefinitionSchema,
      },
      ctx,
    );
  }
}
