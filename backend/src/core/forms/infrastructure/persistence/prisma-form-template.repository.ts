import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormTemplateCreateData,
  FormTemplateRepository,
} from '../../domain/interfaces/form-template.repository';
import type { FormTemplate } from '../../domain/types/form.types';

@Injectable()
export class PrismaFormTemplateRepository implements FormTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    organizationId: string,
    sectorCode?: string,
  ): Promise<FormTemplate[]> {
    return this.prisma.formTemplate.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(sectorCode ? { sectorCode } : {}),
      },
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
    }) as Promise<FormTemplate[]>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormTemplate | null> {
    return this.prisma.formTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    }) as Promise<FormTemplate | null>;
  }

  async create(data: FormTemplateCreateData): Promise<FormTemplate> {
    return this.prisma.formTemplate.create({
      data: {
        organizationId: data.organizationId,
        templateKey: data.templateKey,
        name: data.name,
        description: data.description,
        sectorCode: data.sectorCode,
        schema: data.schema,
        tags: data.tags ?? [],
        isOfficial: data.isOfficial ?? false,
        createdBy: data.createdBy,
      },
    }) as Promise<FormTemplate>;
  }
}
