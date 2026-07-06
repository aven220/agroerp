import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { EIP_EXTERNAL_TARGETS, generateEipKey } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';
import { EipBreService } from './eip-bre.service';
import { EipBridgeService } from './eip-bridge.service';
import { EipConnectorService } from './eip-connector.service';
import { EipEsbService } from './eip-esb.service';
import { EipEventBusService } from './eip-event-bus.service';
import { EipGatewayService } from './eip-gateway.service';
import { EipMessagingService } from './eip-messaging.service';
import { EipMonitoringService } from './eip-monitoring.service';
import { EipWebhookService } from './eip-webhook.service';

type OfflineOp = {
  type: 'status_check' | 'error_ack';
  payload: Record<string, unknown>;
};

@Injectable()
export class EipOfflineService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly monitoring: EipMonitoringService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.eipOfflineBatch.count({ where: { organizationId } });
    return this.prisma.eipOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEipKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eipOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    try {
      const updated = await this.prisma.eipOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      return updated;
    } catch (e) {
      await this.prisma.eipOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  async mobileStatus(organizationId: string) {
    const [indicators, errors, critical] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.monitoring.errors(organizationId, 10),
      this.prisma.eipEventDlq.count({ where: { organizationId } }),
    ]);
    return {
      indicators,
      errors,
      criticalAlerts: critical,
      authorized: true,
      syncedAt: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EipEngineService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EipAuditService,
    private readonly bre: EipBreService,
    private readonly gateway: EipGatewayService,
    private readonly webhooks: EipWebhookService,
    private readonly esb: EipEsbService,
    private readonly eventBus: EipEventBusService,
    private readonly connectors: EipConnectorService,
    private readonly messaging: EipMessagingService,
    private readonly monitoring: EipMonitoringService,
    private readonly bridge: EipBridgeService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, ruleBindings, apis, webhooks, esbRoutes, topics, connectorSlots, providers, externalTargets] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.bre.listBindings(organizationId),
      this.gateway.listApis(organizationId),
      this.webhooks.list(organizationId),
      this.esb.listRoutes(organizationId, 'active'),
      this.eventBus.listTopics(organizationId),
      this.connectors.list(organizationId),
      this.messaging.list(organizationId),
      Promise.resolve(EIP_EXTERNAL_TARGETS),
    ]);
    return {
      dashboard,
      ruleBindings,
      apis,
      webhooks,
      esbRoutes,
      topics,
      connectorSlots,
      providers,
      externalTargets,
      messagingSlots: this.messaging.slots(),
      connectorCatalog: this.connectors.catalog(),
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    const topics = [
      { key: 'system.core', name: 'Eventos del sistema', kind: 'system' as const },
      { key: 'domain.erp', name: 'Eventos de dominio ERP', kind: 'domain' as const },
      { key: 'custom.integration', name: 'Eventos personalizados', kind: 'custom' as const },
    ];
    for (const t of topics) {
      const exists = await this.prisma.eipEventTopic.findFirst({ where: { organizationId, topicKey: t.key } });
      if (!exists) await this.eventBus.createTopic(organizationId, t.key, t.name, t.kind);
    }
    const providerExists = await this.prisma.eipMessagingProvider.findFirst({ where: { organizationId } });
    if (!providerExists) {
      await this.messaging.configure(organizationId, userId, 'memory-primary', 'in_memory', 'In-Memory Broker', {}, true);
      await this.messaging.activate(organizationId, userId, 'memory-primary');
    }
    const routeExists = await this.prisma.eipEsbRoute.findFirst({ where: { organizationId } });
    if (!routeExists) {
      await this.esb.createRoute(
        organizationId,
        userId,
        'ROUTE-DEFAULT',
        'Ruta ESB por defecto',
        'module',
        'event',
        'module:erp',
        'topic:domain.erp',
        { syncMode: 'async', priority: 100 },
      );
      await this.esb.publishRoute(organizationId, userId, 'ROUTE-DEFAULT');
    }
    await this.core.emitUserAction(organizationId, 'EipPlatform', organizationId, EVENT_TYPES.EIP_PLATFORM_BOOTSTRAPPED, {});
    await this.audit.log(organizationId, 'EipPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
