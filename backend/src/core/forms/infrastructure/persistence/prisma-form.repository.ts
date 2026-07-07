import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormCreateData,
  FormFindManyFilters,
  FormRepository,
  FormUpdateData,
} from '../../domain/interfaces/form.repository';
import type { FormDefinition } from '../../domain/types/form.types';

@Injectable()
export class PrismaFormRepository implements FormRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: FormFindManyFilters): Promise<FormDefinition[]> {
    const { organizationId, status, search, publishedOnly } = filters;
    return this.prisma.formDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(publishedOnly ? { status: 'published' } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { formKey: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ formKey: 'asc' }, { version: 'desc' }],
    }) as Promise<FormDefinition[]>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormDefinition | null> {
    return this.prisma.formDefinition.findFirst({
      where: { id, organizationId },
    }) as Promise<FormDefinition | null>;
  }

  async findPublishedByKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null> {
    return this.prisma.formDefinition.findFirst({
      where: { organizationId, formKey, status: 'published' },
      orderBy: { version: 'desc' },
    }) as Promise<FormDefinition | null>;
  }

  async findLatestByKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null> {
    return this.prisma.formDefinition.findFirst({
      where: { organizationId, formKey },
      orderBy: { version: 'desc' },
    }) as Promise<FormDefinition | null>;
  }

  async create(data: FormCreateData): Promise<FormDefinition> {
    return this.prisma.formDefinition.create({
      data: {
        organizationId: data.organizationId,
        formKey: data.formKey,
        name: data.name,
        description: data.description,
        version: data.version,
        schema: data.schema,
        status: data.status,
        createdBy: data.createdBy,
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
      },
    }) as Promise<FormDefinition>;
  }

  async update(id: string, data: FormUpdateData): Promise<FormDefinition> {
    return this.prisma.formDefinition.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        schema: data.schema,
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
      },
    }) as Promise<FormDefinition>;
  }

  async publish(
    organizationId: string,
    formId: string,
    formKey: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.formDefinition.updateMany({
        where: {
          organizationId,
          formKey,
          status: 'published',
        },
        data: { status: 'deprecated' },
      }),
      this.prisma.formDefinition.update({
        where: { id: formId },
        data: { status: 'published', publishedAt: new Date() },
      }),
    ]);
  }
}
