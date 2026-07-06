import { Injectable, NotFoundException } from '@nestjs/common';
import { FormDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FormsService } from './forms.service';

@Injectable()
export class FormTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly forms: FormsService,
  ) {}

  async findAll(organizationId: string, sectorCode?: string) {
    return this.prisma.formTemplate.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(sectorCode ? { sectorCode } : {}),
      },
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
    });
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
    return this.prisma.formTemplate.create({
      data: {
        organizationId,
        templateKey: data.templateKey,
        name: data.name,
        description: data.description,
        sectorCode: data.sectorCode,
        schema: data.schema,
        tags: data.tags ?? [],
        isOfficial: data.isOfficial ?? false,
        createdBy: userId,
      },
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
    const template = await this.prisma.formTemplate.findFirst({
      where: { id: templateId, organizationId, deletedAt: null },
    });
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
