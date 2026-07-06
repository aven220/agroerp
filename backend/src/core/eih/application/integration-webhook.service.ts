import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { IntegrationSecurityService } from './integration-security.service';

@Injectable()
export class IntegrationWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly security: IntegrationSecurityService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eihWebhookEndpoint.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(organizationId: string, data: {
    endpointKey: string; name: string; path: string; connectorId?: string; flowId?: string;
  }) {
    const secret = this.security.generateWebhookSecret();
    const endpoint = await this.prisma.eihWebhookEndpoint.create({
      data: {
        organizationId,
        endpointKey: data.endpointKey,
        name: data.name,
        path: data.path,
        secretHash: this.security.hashSecret(secret),
        connectorId: data.connectorId,
        flowId: data.flowId,
      },
    });
    return { endpoint, secret };
  }

  async receive(organizationId: string, endpointKey: string, payload: Record<string, unknown>) {
    const endpoint = await this.prisma.eihWebhookEndpoint.findFirst({
      where: { organizationId, endpointKey, isActive: true },
    });
    if (!endpoint) throw new Error(`Webhook ${endpointKey} no encontrado`);

    await this.core.emitUserAction(
      organizationId,
      'Webhook',
      endpoint.id,
      EVENT_TYPES.INTEGRATION_WEBHOOK_RECEIVED,
      { endpointKey, payloadSize: JSON.stringify(payload).length },
    );

    return { received: true, endpointKey, connectorId: endpoint.connectorId, flowId: endpoint.flowId };
  }
}
