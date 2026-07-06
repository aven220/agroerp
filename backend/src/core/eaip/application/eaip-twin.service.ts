import { Injectable, NotFoundException } from '@nestjs/common';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { buildTwinState, EAIP_TWIN_ENTITY_TYPES, generateEaipKey } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipTwinService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly audit: EaipAuditService,
  ) {}

  list(organizationId: string, entityType?: string) {
    return this.prisma.eaipDigitalTwin.findMany({
      where: { organizationId, status: 'active', ...(entityType ? { entityType } : {}) },
    });
  }

  async register(
    organizationId: string,
    data: { entityType: string; entityRef: string; name: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eaipDigitalTwin.count({ where: { organizationId } });
    const twinKey = generateEaipKey('TWN', count + 1);
    const state = buildTwinState(data.entityType, undefined, data.metadata);
    return this.prisma.eaipDigitalTwin.create({
      data: {
        organizationId, twinKey, entityType: data.entityType, entityRef: data.entityRef,
        name: data.name, state: state as object, metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  async sync(
    organizationId: string,
    userId: string,
    twinKey: string,
    data: { source: string; telemetry?: Record<string, unknown>; payload?: Record<string, unknown> },
  ) {
    const twin = await this.prisma.eaipDigitalTwin.findFirst({ where: { organizationId, twinKey } });
    if (!twin) throw new NotFoundException('Twin not found');
    const state = buildTwinState(twin.entityType, data.telemetry, twin.metadata as Record<string, unknown>);
    const count = await this.prisma.eaipTwinSync.count({ where: { organizationId } });
    const syncKey = generateEaipKey('SYN', count + 1);
    await this.prisma.eaipTwinSync.create({
      data: { organizationId, syncKey, twinId: twin.id, source: data.source, payload: (data.payload ?? data.telemetry ?? {}) as object },
    });
    const updated = await this.prisma.eaipDigitalTwin.update({
      where: { id: twin.id },
      data: { state: state as object, lastSyncedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EaipDigitalTwin', twinKey, 'twin_synced', userId);
    return updated;
  }

  entityTypes() { return EAIP_TWIN_ENTITY_TYPES; }
}

@Injectable()
export class EaipAnalyticsService {
  constructor(private readonly prisma: EaipPrismaService) {}

  async snapshot(organizationId: string, category: string, indicators: Record<string, unknown>, periodStart?: string, periodEnd?: string) {
    const count = await this.prisma.eaipAnalyticsSnapshot.count({ where: { organizationId } });
    const snapshotKey = generateEaipKey('ANL', count + 1);
    return this.prisma.eaipAnalyticsSnapshot.create({
      data: {
        organizationId, snapshotKey, category, indicators: indicators as object,
        periodStart: periodStart ? new Date(periodStart) : undefined,
        periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      },
    });
  }

  listSnapshots(organizationId: string, category?: string) {
    return this.prisma.eaipAnalyticsSnapshot.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async productivityIndicators(organizationId: string) {
    const since = new Date(Date.now() - 90 * 86400000);
    const [predictions, recommendations, simulations] = await Promise.all([
      this.prisma.eaipPrediction.count({ where: { organizationId, predictedAt: { gte: since } } }),
      this.prisma.eaipRecommendation.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaipSimulation.count({ where: { organizationId, createdAt: { gte: since } } }),
    ]);
    return this.snapshot(organizationId, 'productivity', { predictions, recommendations, simulations, periodDays: 90 });
  }
}
