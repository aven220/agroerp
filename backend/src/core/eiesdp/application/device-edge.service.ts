import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DeviceTelemetryService } from './device-telemetry.service';
import { matchEdgeRules } from '../domain/edge-rule.engine';

@Injectable()
export class DeviceEdgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly telemetry: DeviceTelemetryService,
  ) {}

  listGateways(organizationId: string) {
    return this.prisma.eiesdpEdgeGateway.findMany({
      where: { organizationId },
      include: { _count: { select: { buffers: true, edgeRules: true } } },
      orderBy: { lastHeartbeat: 'desc' },
    });
  }

  async registerGateway(organizationId: string, data: { gatewayKey: string; name: string; hostname?: string }) {
    return this.prisma.eiesdpEdgeGateway.upsert({
      where: { organizationId_gatewayKey: { organizationId, gatewayKey: data.gatewayKey } },
      update: { name: data.name, hostname: data.hostname, status: 'online', lastHeartbeat: new Date() },
      create: {
        organizationId,
        gatewayKey: data.gatewayKey,
        name: data.name,
        hostname: data.hostname,
        status: 'online',
      },
    });
  }

  async heartbeat(gatewayId: string) {
    return this.prisma.eiesdpEdgeGateway.update({
      where: { id: gatewayId },
      data: { lastHeartbeat: new Date(), status: 'online' },
    });
  }

  async bufferTelemetry(
    organizationId: string,
    gatewayId: string,
    deviceKey: string,
    payload: Record<string, unknown>,
  ) {
    return this.prisma.eiesdpEdgeBuffer.create({
      data: { organizationId, gatewayId, deviceKey, payload: payload as object },
    });
  }

  async syncBuffer(organizationId: string, gatewayId: string) {
    const pending = await this.prisma.eiesdpEdgeBuffer.findMany({
      where: { organizationId, gatewayId, synced: false },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    let synced = 0;
    for (const row of pending) {
      const p = row.payload as { metricKey?: string; value?: number };
      if (p.metricKey) {
        await this.telemetry.ingest(organizationId, {
          deviceKey: row.deviceKey,
          metricKey: p.metricKey,
          value: p.value,
          payload: row.payload as Record<string, unknown>,
        });
      }
      await this.prisma.eiesdpEdgeBuffer.update({
        where: { id: row.id },
        data: { synced: true },
      });
      synced++;
    }
    await this.prisma.eiesdpEdgeGateway.update({
      where: { id: gatewayId },
      data: { lastSyncAt: new Date(), status: 'online' },
    });
    await this.core.emitUserAction(
      organizationId,
      'EdgeGateway',
      gatewayId,
      EVENT_TYPES.EDGE_SYNC_COMPLETED,
      { synced },
    );
    return { synced };
  }

  createEdgeRule(gatewayId: string, data: {
    ruleKey: string; name: string; conditions: Record<string, unknown>; actions: unknown[];
  }) {
    return this.prisma.eiesdpEdgeRule.upsert({
      where: { gatewayId_ruleKey: { gatewayId, ruleKey: data.ruleKey } },
      update: {
        name: data.name,
        conditions: data.conditions as object,
        actions: data.actions as object,
      },
      create: {
        gatewayId,
        ruleKey: data.ruleKey,
        name: data.name,
        conditions: data.conditions as object,
        actions: data.actions as object,
      },
    });
  }

  evaluateLocalRules(gatewayId: string, context: Record<string, unknown>) {
    return this.prisma.eiesdpEdgeRule.findMany({
      where: { gatewayId, isActive: true },
    }).then((rules) => matchEdgeRules(rules, context));
  }
}
