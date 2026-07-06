import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { EAIP_MODULE_SLOTS, aggregateEaipIndicators } from '../domain/eaip.engine';
import { EaipAssistantService } from './eaip-assistant.service';
import { EaipPredictionService } from './eaip-prediction.service';
import { EaipRecommendationService } from './eaip-recommendation.service';

@Injectable()
export class EaipBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EAIP_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eaip' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EaipModule', moduleRef, EVENT_TYPES.EAIP_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EaipDashboardService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly mainPrisma: PrismaService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [activeModels, predictions30d, recommendationsActive, simulations30d, twinEntities, assistantSessions30d, intelligentAlerts] =
      await Promise.all([
        this.prisma.eaipModelRegistry.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eaipPrediction.count({ where: { organizationId, predictedAt: { gte: since30d } } }),
        this.prisma.eaipRecommendation.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eaipSimulation.count({ where: { organizationId, createdAt: { gte: since30d } } }),
        this.prisma.eaipDigitalTwin.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eaipAssistantSession.count({ where: { organizationId, createdAt: { gte: since30d } } }),
        this.prisma.eaipIntelligentAlert.count({ where: { organizationId, isActive: true } }),
      ]);
    const indicators = aggregateEaipIndicators({
      activeModels, predictions30d, recommendationsActive, simulations30d, twinEntities, assistantSessions30d, intelligentAlerts,
    });
    return {
      indicators,
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EaipOfflineService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly dashboard: EaipDashboardService,
    private readonly prediction: EaipPredictionService,
    private readonly recommendation: EaipRecommendationService,
    private readonly assistant: EaipAssistantService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const [dash, recommendations, predictions, alerts] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.recommendation.list(organizationId),
      this.prediction.list(organizationId),
      this.prisma.eaipIntelligentAlert.findMany({ where: { organizationId, isActive: true }, take: 20 }),
    ]);
    return {
      authorized: true,
      dashboard: dash,
      recommendations: recommendations.slice(0, 20),
      predictions: predictions.slice(0, 20),
      alerts,
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eaipOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eaipOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.assistantMessages as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.assistant.sendMessage(organizationId, userId, row.sessionKey as string, row.content as string));
    }
    for (const row of (payload.predictions as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.prediction.runPrediction(organizationId, userId, row as never));
    }
    await this.prisma.eaipOfflineBatch.update({ where: { id: batch.id }, data: { status: 'completed', syncedAt: new Date() } });
    return { synced: true, count: results.length };
  }
}
