import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EATP_MODULE_SLOTS, aggregateEatpIndicators } from '../domain/eatp.engine';
import { EatpFarmService } from './eatp-farm.service';
import { EatpLaborService } from './eatp-labor.service';

@Injectable()
export class EatpBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EATP_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eatp' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(
      organizationId,
      'EatpModule',
      moduleRef,
      EVENT_TYPES.EATP_MODULE_EVENT,
      { moduleRef, ...payload },
    );
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EatpMonitoringService {
  constructor(
    private readonly prisma: EatpPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly farms: EatpFarmService,
  ) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 30 * 86400000);
    const [farmDash, activeLots, campaigns, pendingTasks, completedTasks, hectares] = await Promise.all([
      this.farms.dashboard(organizationId),
      this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.eatpCampaign.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eatpFieldTask.count({ where: { organizationId, status: { in: ['pending', 'scheduled', 'in_progress'] } } }),
      this.prisma.eatpFieldTask.count({ where: { organizationId, status: 'completed', completedDate: { gte: since } } }),
      this.mainPrisma.fieldLotProfile.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { totalAreaHa: true },
      }),
    ]);
    const indicators = aggregateEatpIndicators({
      activeFarms: farmDash.activeFarms,
      activeLots,
      activeCampaigns: campaigns,
      pendingTasks,
      completedTasks30d: completedTasks,
      hectares: Number(hectares._sum.totalAreaHa ?? 0),
    });
    return { indicators, farmDash, timestamp: new Date().toISOString() };
  }
}

@Injectable()
export class EatpOfflineService {
  constructor(
    private readonly prisma: EatpPrismaService,
    private readonly monitoring: EatpMonitoringService,
    private readonly labor: EatpLaborService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const dashboard = await this.monitoring.dashboard(organizationId);
    const tasks = await this.prisma.eatpFieldTask.findMany({
      where: { organizationId, recordedBy: userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return { authorized: true, dashboard, recentTasks: tasks, syncedAt: new Date().toISOString() };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eatpOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eatpOfflineBatch.findFirst({
      where: { organizationId, batchKey, userId },
    });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const labors = (payload.labors as Array<Record<string, unknown>>) ?? [];
    const results = [];
    for (const row of labors) {
      const result = await this.labor.recordLabor(organizationId, userId, row as never);
      results.push(result);
    }
    await this.prisma.eatpOfflineBatch.update({
      where: { id: batch.id },
      data: { status: 'completed', syncedAt: new Date() },
    });
    return { synced: true, count: results.length };
  }
}
