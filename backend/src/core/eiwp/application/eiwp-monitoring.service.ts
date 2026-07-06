import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EIWP_MODULE_SLOTS, aggregateEiwpIndicators } from '../domain/eiwp.engine';
import { EiwpAlertService } from './eiwp-alert.service';
import { EiwpFieldEventService } from './eiwp-automation.service';
import { EiwpIrrigationService } from './eiwp-irrigation.service';
import { EiwpWeatherService } from './eiwp-weather.service';

@Injectable()
export class EiwpBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EIWP_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eiwp' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(
      organizationId,
      'EiwpModule',
      moduleRef,
      EVENT_TYPES.EIWP_MODULE_EVENT,
      { moduleRef, ...payload },
    );
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EiwpMonitoringService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly weather: EiwpWeatherService,
    private readonly alerts: EiwpAlertService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [waterSources, activeSectors, scheduledIrrigations, activeAlerts, weatherStations, consumption] =
      await Promise.all([
        this.prisma.eiwpWaterSource.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eiwpIrrigationSector.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eiwpIrrigationSchedule.count({
          where: { organizationId, status: { in: ['scheduled', 'running'] } },
        }),
        this.prisma.eiwpAlert.count({ where: { organizationId, isActive: true } }),
        this.prisma.eiwpWeatherStation.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eiwpWaterConsumption.aggregate({
          where: { organizationId, recordedAt: { gte: since30d } },
          _sum: { volumeM3: true },
        }),
      ]);
    const climate = await this.weather.latestClimateSnapshot(organizationId);
    const indicators = aggregateEiwpIndicators({
      waterSources,
      activeSectors,
      scheduledIrrigations,
      activeAlerts,
      weatherStations,
      consumptionM3_30d: Number(consumption._sum.volumeM3 ?? 0),
    });
    return { indicators, climate, activeLots: await this.mainPrisma.fieldLotProfile.count({
      where: { organizationId, deletedAt: null, status: 'active' },
    }), timestamp: new Date().toISOString() };
  }

  async runAutoProcesses(organizationId: string, userId?: string) {
    const climate = await this.weather.latestClimateSnapshot(organizationId);
    const m = climate.metrics;
    const generatedAlerts = await this.alerts.generateFromClimate(organizationId, userId, {
      temperatureC: m.temperature,
      humidityPct: m.humidity,
      windSpeedKmh: m.wind_speed,
      precipitationMm: m.precipitation,
      forecastExtreme: false,
    });
    return { processed: true, alertsGenerated: generatedAlerts.length };
  }
}

@Injectable()
export class EiwpOfflineService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly monitoring: EiwpMonitoringService,
    private readonly irrigation: EiwpIrrigationService,
    private readonly fieldEvents: EiwpFieldEventService,
    private readonly alerts: EiwpAlertService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const dashboard = await this.monitoring.dashboard(organizationId);
    const [schedules, alerts, rainfall] = await Promise.all([
      this.irrigation.listSchedules(organizationId),
      this.alerts.listActive(organizationId),
      this.fieldEvents.listRainfall(organizationId),
    ]);
    return {
      authorized: true,
      dashboard,
      schedules: schedules.slice(0, 30),
      alerts,
      recentRainfall: rainfall.slice(0, 20),
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eiwpOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eiwpOfflineBatch.findFirst({
      where: { organizationId, batchKey, userId },
    });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.irrigations as Array<Record<string, unknown>>) ?? []) {
      const r = await this.irrigation.complete(organizationId, userId, String(row.scheduleKey), {
        volumeM3: Number(row.volumeM3 ?? 0),
        durationMin: Number(row.durationMin ?? 0),
      });
      results.push(r);
    }
    for (const row of (payload.rainfalls as Array<Record<string, unknown>>) ?? []) {
      const r = await this.fieldEvents.recordRainfall(organizationId, userId, row as never);
      results.push(r);
    }
    for (const row of (payload.incidents as Array<Record<string, unknown>>) ?? []) {
      const r = await this.fieldEvents.recordIncident(organizationId, userId, row as never);
      results.push(r);
    }
    await this.prisma.eiwpOfflineBatch.update({
      where: { id: batch.id },
      data: { status: 'completed', syncedAt: new Date() },
    });
    await this.prisma.eiwpAuditLog.create({
      data: {
        organizationId,
        entityType: 'EiwpOfflineBatch',
        entityKey: batchKey,
        action: 'sync_completed',
        userId,
        details: { count: results.length },
      },
    });
    return { synced: true, count: results.length };
  }
}
