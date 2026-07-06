import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { Prisma } from '@prisma/client';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EAPP_MODULE_SLOTS, aggregateEappIndicators } from '../domain/eapp.engine';
import { EappGisService } from './eapp-gis.service';
import { EappGeoService } from './eapp-geo.service';
import { EappInspectionService } from './eapp-inspection.service';

@Injectable()
export class EappBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EAPP_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eapp' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(
      organizationId,
      'EappModule',
      moduleRef,
      EVENT_TYPES.EAPP_MODULE_EVENT,
      { moduleRef, ...payload },
    );
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EappMonitoringService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly gis: EappGisService,
  ) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 86400000);
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [mapCtx, activeMissions, telemetryDevices, indexReadings24h, inspections30d] = await Promise.all([
      this.gis.mapContext(organizationId),
      this.prisma.eappDroneMission.count({
        where: { organizationId, status: { in: ['scheduled', 'in_progress'] } },
      }),
      this.prisma.eappTelemetryDevice.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eappAgIndexReading.count({
        where: { organizationId, capturedAt: { gte: since24h } },
      }),
      this.prisma.eappFieldInspection.count({
        where: { organizationId, inspectedAt: { gte: since30d } },
      }),
    ]);
    const layers = mapCtx.layers.length;
    const lotPolygons = await this.mainPrisma.fieldLotProfile.count({
      where: { organizationId, deletedAt: null, boundaryGeoRef: { not: Prisma.DbNull } },
    });
    const indicators = aggregateEappIndicators({
      layers,
      lotPolygons,
      activeMissions,
      telemetryDevices,
      indexReadings24h,
      inspections30d,
    });
    return { indicators, mapCtx, timestamp: new Date().toISOString() };
  }
}

@Injectable()
export class EappOfflineService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly monitoring: EappMonitoringService,
    private readonly inspections: EappInspectionService,
    private readonly geo: EappGeoService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const dashboard = await this.monitoring.dashboard(organizationId);
    const [lots, pois, inspections] = await Promise.all([
      this.mainPrisma.fieldLotProfile.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, lotCode: true, lotName: true, totalAreaHa: true, farmUnitId: true },
        take: 500,
      }),
      this.geo.listPois(organizationId),
      this.inspections.list(organizationId),
    ]);
    return {
      authorized: true,
      dashboard,
      lots,
      pois,
      recentInspections: inspections.slice(0, 20),
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eappOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eappOfflineBatch.findFirst({
      where: { organizationId, batchKey, userId },
    });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    const gpsPoints = (payload.gpsPoints as Array<Record<string, unknown>>) ?? [];
    for (const pt of gpsPoints) {
      const poi = await this.geo.createPoi(organizationId, userId, pt as never);
      results.push(poi);
    }
    const inspections = (payload.inspections as Array<Record<string, unknown>>) ?? [];
    for (const ins of inspections) {
      const row = await this.inspections.record(organizationId, userId, ins as never);
      results.push(row);
    }
    await this.prisma.eappOfflineBatch.update({
      where: { id: batch.id },
      data: { status: 'completed', syncedAt: new Date() },
    });
    return { synced: true, count: results.length };
  }
}
