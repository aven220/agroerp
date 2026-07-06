import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { MetadataService } from '@/core/metadata/application/metadata.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  CreateResourceDto,
  UpdateResourceDto,
} from '../presentation/resources.controller';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadata: MetadataService,
    private readonly core: CoreEngineService,
  ) {}

  async findAll(organizationId: string, resourceType?: string) {
    return this.prisma.resource.findMany({
      where: {
        organizationId,
        deletedAt: null,
        resourceType,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async create(
    organizationId: string,
    dto: CreateResourceDto,
    userId: string,
    ctx?: RequestContext,
  ) {
    const schema = await this.metadata.findActiveSchema(
      organizationId,
      dto.resourceType,
    );

    const validatedData = this.metadata.validateResourceData(
      schema,
      dto.data ?? {},
    );

    const resource = await this.prisma.resource.create({
      data: {
        organizationId,
        resourceType: dto.resourceType,
        schemaVersion: schema?.version ?? 1,
        data: validatedData as object,
        attributes: validatedData as object,
        metadata: (dto.metadata ?? {}) as object,
        status: dto.status ?? schema?.states?.[0] ?? 'active',
        parentId: dto.parentId,
        externalId: dto.externalId,
        syncStatus: 'pending',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const snapshot = this.toSnapshot(resource);

    await this.core.emitResourceCreated(
      organizationId,
      resource.id,
      {
        resourceType: resource.resourceType,
        data: resource.data,
        status: resource.status,
        version: resource.version,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        newValues: snapshot,
      },
    );

    return resource;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateResourceDto,
    userId: string,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);
    const schema = await this.metadata.findActiveSchema(
      organizationId,
      existing.resourceType,
    );

    const mergedData = {
      ...((existing.data as object) ?? {}),
      ...(dto.data ?? {}),
    };

    const validatedData = dto.data
      ? this.metadata.validateResourceData(schema, mergedData)
      : (existing.data as Record<string, unknown>);

    const resource = await this.prisma.resource.update({
      where: { id },
      data: {
        data: dto.data ? (validatedData as object) : undefined,
        attributes: dto.data ? (validatedData as object) : undefined,
        metadata: dto.metadata
          ? ({
              ...((existing.metadata as object) ?? {}),
              ...dto.metadata,
            } as object)
          : undefined,
        status: dto.status,
        updatedBy: userId,
        version: { increment: 1 },
        syncStatus: 'pending',
        lastSyncAt: null,
      },
    });

    const oldSnapshot = this.toSnapshot(existing);
    const newSnapshot = this.toSnapshot(resource);

    await this.core.emitResourceUpdated(
      organizationId,
      id,
      {
        resourceType: resource.resourceType,
        version: resource.version,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: oldSnapshot,
        newValues: newSnapshot,
      },
    );

    return resource;
  }

  async remove(
    organizationId: string,
    id: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);
    const oldSnapshot = this.toSnapshot(existing);

    await this.prisma.resource.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
        syncStatus: 'pending',
      },
    });

    await this.core.emitResourceDeleted(
      organizationId,
      id,
      { resourceType: existing.resourceType, deletedBy: userId },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: oldSnapshot,
        enqueueSync: true,
      },
    );

    return { success: true };
  }

  private toSnapshot(resource: {
    id: string;
    resourceType: string;
    data: unknown;
    metadata: unknown;
    status: string;
    version: number;
    syncStatus: string;
  }) {
    return {
      id: resource.id,
      type: resource.resourceType,
      data: resource.data,
      metadata: resource.metadata,
      status: resource.status,
      version: resource.version,
      syncStatus: resource.syncStatus,
    };
  }
}
