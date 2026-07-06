import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipConnectorProtocol, EipStatus } from '@agroerp/prisma-eip-client';
import { IntegrationConnectorCatalogService } from '@/core/eih/application/integration-connector-catalog.service';
import { IntegrationConnectorService } from '@/core/eih/application/integration-connector.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { EIP_CONNECTOR_CATALOG, generateEipKey } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipConnectorService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly eihCatalog: IntegrationConnectorCatalogService,
    private readonly eihConnectors: IntegrationConnectorService,
    private readonly audit: EipAuditService,
  ) {}

  catalog() {
    return {
      eip: EIP_CONNECTOR_CATALOG,
      eih: this.eihCatalog.findAll(),
    };
  }

  list(organizationId: string, protocol?: EipConnectorProtocol) {
    return this.prisma.eipConnectorSlot.findMany({
      where: { organizationId, ...(protocol ? { protocol } : {}) },
      orderBy: { connectorKey: 'asc' },
    });
  }

  async register(
    organizationId: string,
    userId: string,
    connectorKey: string,
    name: string,
    protocol: EipConnectorProtocol,
    opts: { category?: string; endpointUrl?: string; authType?: string; config?: Record<string, unknown>; tags?: string[] },
  ) {
    const existing = await this.prisma.eipConnectorSlot.findFirst({ where: { organizationId, connectorKey } });
    if (existing) throw new BadRequestException(`Conector ${connectorKey} ya existe`);
    const connector = await this.prisma.eipConnectorSlot.create({
      data: {
        organizationId,
        connectorKey,
        name,
        protocol,
        category: opts.category ?? 'generic',
        endpointUrl: opts.endpointUrl,
        authType: opts.authType ?? 'none',
        config: (opts.config ?? {}) as object,
        tags: opts.tags ?? [],
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EipConnector', connectorKey, 'connector_registered', userId, { protocol });
    return connector;
  }

  async activate(organizationId: string, userId: string, connectorKey: string) {
    const connector = await this.prisma.eipConnectorSlot.findFirst({ where: { organizationId, connectorKey } });
    if (!connector) throw new NotFoundException('Conector no encontrado');
    const updated = await this.prisma.eipConnectorSlot.update({
      where: { id: connector.id },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EipConnector', connectorKey, 'connector_activated', userId);
    return updated;
  }

  async invoke(organizationId: string, connectorKey: string, payload: Record<string, unknown>) {
    const connector = await this.prisma.eipConnectorSlot.findFirst({
      where: { organizationId, connectorKey, status: 'active' },
    });
    if (!connector) throw new NotFoundException('Conector no activo');
    const seq = await this.prisma.eipInvocationLog.count({ where: { organizationId } });
    const start = Date.now();
    const result = await this.dispatch(connector.protocol, connector.endpointUrl, payload, connector.config as Record<string, unknown>);
    await this.prisma.eipInvocationLog.create({
      data: {
        organizationId,
        invocationKey: generateEipKey('CON', seq + 1),
        channel: 'connector',
        targetRef: connectorKey,
        method: connector.protocol,
        durationMs: Date.now() - start,
        success: true,
        requestMeta: { protocol: connector.protocol } as object,
        responseMeta: { result } as object,
      },
    });
    return result;
  }

  private async dispatch(
    protocol: EipConnectorProtocol,
    endpointUrl: string | null,
    payload: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (protocol) {
      case 'rest':
      case 'graphql':
        if (endpointUrl?.startsWith('http')) {
          const res = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(config.headers as Record<string, string> ?? {}) },
            body: JSON.stringify(payload),
          });
          return { status: res.status, body: await res.json().catch(() => ({})) };
        }
        return { simulated: true, protocol, payload };
      case 'soap':
        return { simulated: true, protocol: 'soap', envelope: payload };
      case 'grpc':
        return { simulated: true, protocol: 'grpc', payload };
      case 'sftp':
      case 'ftp':
        return { simulated: true, protocol, path: config.path ?? '/upload', size: JSON.stringify(payload).length };
      case 'email':
        return { simulated: true, protocol: 'email', to: config.to, subject: config.subject };
      case 'csv':
      case 'excel':
      case 'xml':
      case 'json':
        return { simulated: true, protocol, records: Array.isArray(payload.records) ? payload.records.length : 1 };
      default:
        return { protocol, payload };
    }
  }

  async listEihConnectors(organizationId: string) {
    return this.eihConnectors.findAll(organizationId);
  }
}
