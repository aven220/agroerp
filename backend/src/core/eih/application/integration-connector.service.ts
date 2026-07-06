import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES, EihConnectorDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { IntegrationAuditService } from './integration-audit.service';
import { IntegrationSecurityService } from './integration-security.service';

@Injectable()
export class IntegrationConnectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: IntegrationAuditService,
    private readonly security: IntegrationSecurityService,
  ) {}

  findAll(organizationId: string, filters?: { status?: string; category?: string; protocol?: string }) {
    return this.prisma.eihConnector.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status as 'active' } : {}),
        ...(filters?.category ? { category: filters.category as 'custom' } : {}),
        ...(filters?.protocol ? { protocol: filters.protocol as 'rest' } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, connectorKey: string) {
    const c = await this.prisma.eihConnector.findFirst({
      where: { organizationId, connectorKey, deletedAt: null },
    });
    if (!c) throw new NotFoundException(`Conector ${connectorKey} no encontrado`);
    return c;
  }

  async register(organizationId: string, userId: string, dto: EihConnectorDefinition) {
    const existing = await this.prisma.eihConnector.findFirst({
      where: { organizationId, connectorKey: dto.connectorKey, deletedAt: null },
    });
    if (existing) throw new BadRequestException(`Conector ${dto.connectorKey} ya existe`);

    const connector = await this.prisma.eihConnector.create({
      data: {
        organizationId,
        connectorKey: dto.connectorKey,
        name: dto.name,
        description: dto.description,
        protocol: dto.protocol as 'rest',
        category: dto.category as 'custom',
        authType: (dto.authType ?? 'none') as 'none',
        dataFormat: (dto.dataFormat ?? 'json') as 'json',
        syncMode: (dto.syncMode ?? 'scheduled') as 'scheduled',
        catalogKey: dto.catalogKey,
        endpointUrl: dto.endpointUrl,
        config: (dto.config ?? {}) as object,
        tags: dto.tags ?? [],
        createdBy: userId,
      },
    });

    const credentials = await this.security.issueConnectorCredential(connector.id);
    await this.audit.log(organizationId, 'connector', dto.connectorKey, 'register', userId);
    await this.core.emitUserAction(
      organizationId,
      'Connector',
      connector.id,
      EVENT_TYPES.CONNECTOR_REGISTERED,
      { connectorKey: dto.connectorKey, protocol: dto.protocol },
    );
    return { connector, credentials };
  }

  async activate(organizationId: string, userId: string, connectorKey: string) {
    const connector = await this.findOne(organizationId, connectorKey);
    const updated = await this.prisma.eihConnector.update({
      where: { id: connector.id },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'connector', connectorKey, 'activate', userId);
    await this.core.emitUserAction(
      organizationId,
      'Connector',
      connector.id,
      EVENT_TYPES.CONNECTOR_ACTIVATED,
      { connectorKey },
    );
    return updated;
  }

  async deactivate(organizationId: string, userId: string, connectorKey: string) {
    const connector = await this.findOne(organizationId, connectorKey);
    const updated = await this.prisma.eihConnector.update({
      where: { id: connector.id },
      data: { status: 'inactive' },
    });
    await this.audit.log(organizationId, 'connector', connectorKey, 'deactivate', userId);
    return updated;
  }

  async update(organizationId: string, userId: string, connectorKey: string, data: Partial<EihConnectorDefinition>) {
    const connector = await this.findOne(organizationId, connectorKey);
    const updated = await this.prisma.eihConnector.update({
      where: { id: connector.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.endpointUrl ? { endpointUrl: data.endpointUrl } : {}),
        ...(data.config ? { config: data.config as object } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.syncMode ? { syncMode: data.syncMode as 'scheduled' } : {}),
        ...(data.dataFormat ? { dataFormat: data.dataFormat as 'json' } : {}),
        ...(data.authType ? { authType: data.authType as 'none' } : {}),
      },
    });
    await this.audit.log(organizationId, 'connector', connectorKey, 'update', userId, data as Record<string, unknown>);
    return updated;
  }

  async archive(organizationId: string, userId: string, connectorKey: string) {
    const connector = await this.findOne(organizationId, connectorKey);
    return this.prisma.eihConnector.update({
      where: { id: connector.id },
      data: { status: 'archived', deletedAt: new Date() },
    });
  }
}
