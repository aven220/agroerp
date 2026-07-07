import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormDuplicateCreateData,
  FormLifecycleRepository,
  FormLifecycleUpdateData,
  FormVersionHistoryCreateData,
} from '../../domain/interfaces/form-lifecycle.repository';
import type {
  FormDefinition,
  FormVersionHistory,
} from '../../domain/types/form.types';

@Injectable()
export class PrismaFormLifecycleRepository implements FormLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAnyByFormKey(
    organizationId: string,
    formKey: string,
  ): Promise<FormDefinition | null> {
    return this.prisma.formDefinition.findFirst({
      where: { organizationId, formKey },
    }) as Promise<FormDefinition | null>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormDefinition | null> {
    return this.prisma.formDefinition.findFirst({
      where: { id, organizationId },
    }) as Promise<FormDefinition | null>;
  }

  async createDuplicate(data: FormDuplicateCreateData): Promise<FormDefinition> {
    return this.prisma.formDefinition.create({
      data: {
        organizationId: data.organizationId,
        formKey: data.formKey,
        name: data.name,
        description: data.description,
        version: data.version,
        schema: data.schema,
        status: data.status,
        sectorCode: data.sectorCode,
        commodityCode: data.commodityCode,
        tags: data.tags,
        metadata: data.metadata,
        workflowKey: data.workflowKey,
        clonedFromId: data.clonedFromId,
        createdBy: data.createdBy,
      },
    }) as Promise<FormDefinition>;
  }

  async updateLifecycle(
    id: string,
    data: FormLifecycleUpdateData,
  ): Promise<FormDefinition> {
    return this.prisma.formDefinition.update({
      where: { id },
      data: {
        status: data.status,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        publishedAt: data.publishedAt,
        archivedAt: data.archivedAt,
        deletedAt: data.deletedAt,
      },
    }) as Promise<FormDefinition>;
  }

  async createVersionHistory(
    data: FormVersionHistoryCreateData,
  ): Promise<FormVersionHistory> {
    return this.prisma.formVersionHistory.create({
      data: {
        organizationId: data.organizationId,
        formId: data.formId,
        fromVersion: data.fromVersion,
        toVersion: data.toVersion,
        changeType: data.changeType,
        snapshot: data.snapshot,
        actorId: data.actorId,
        reasonNotes: data.reasonNotes,
      },
    }) as Promise<FormVersionHistory>;
  }

  async findVersionHistory(
    organizationId: string,
    formId: string,
  ): Promise<FormVersionHistory[]> {
    return this.prisma.formVersionHistory.findMany({
      where: { organizationId, formId },
      orderBy: { occurredAt: 'desc' },
    }) as Promise<FormVersionHistory[]>;
  }
}
