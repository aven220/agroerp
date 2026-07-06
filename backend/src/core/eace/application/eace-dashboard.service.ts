import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { EACE_MODULE_SLOTS, aggregateEaceIndicators } from '../domain/eace.engine';
import { EaceContractService } from './eace-contract.service';
import { EaceCooperativeService } from './eace-cooperative.service';
import { EaceProducerService } from './eace-producer.service';

@Injectable()
export class EaceBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EACE_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eace' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EaceModule', moduleRef, EVENT_TYPES.EACE_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EaceDashboardService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly mainPrisma: PrismaService,
  ) {}

  async dashboard(organizationId: string) {
    const [
      activeProducers, collaborativeOrgs, activeContracts, contractors,
      advisors, marketplaceListings, knowledgeItems, openVisits, criticalAlerts,
    ] = await Promise.all([
      this.prisma.eaceProducerProfile.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceCollaborativeOrg.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceAgContract.count({ where: { organizationId, status: { in: ['active', 'pending'] } } }),
      this.prisma.eaceContractor.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceAdvisor.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceMarketplaceListing.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceKnowledgeItem.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaceTechnicalVisit.count({ where: { organizationId, status: { in: ['pending', 'scheduled', 'in_progress'] } } }),
      this.prisma.eaceAlert.count({ where: { organizationId, isActive: true, severity: 'critical' } }),
    ]);
    const contracts = await this.prisma.eaceAgContract.findMany({
      where: { organizationId, status: 'active' },
      select: { compliancePct: true },
    });
    const contractComplianceAvg = contracts.length
      ? Math.round(contracts.reduce((s, c) => s + c.compliancePct, 0) / contracts.length)
      : 100;
    const indicators = aggregateEaceIndicators({
      activeProducers, collaborativeOrgs, activeContracts, contractors,
      advisors, marketplaceListings, knowledgeItems, openVisits, criticalAlerts, contractComplianceAvg,
    });
    return {
      indicators,
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EaceOfflineService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly dashboard: EaceDashboardService,
    private readonly producer: EaceProducerService,
    private readonly cooperative: EaceCooperativeService,
    private readonly contract: EaceContractService,
  ) {}

  async mobileSync(organizationId: string, userId: string, profileRole = 'producer') {
    const [dash, recommendations, contracts, visits, notifications, alerts] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.producer.listProfiles(organizationId),
      this.contract.listContracts(organizationId),
      this.prisma.eaceTechnicalVisit.findMany({
        where: { organizationId, status: { in: ['scheduled', 'in_progress'] } },
        take: 20,
        orderBy: { visitDate: 'asc' },
      }),
      this.prisma.eaceNotification.findMany({
        where: { organizationId, isRead: false },
        take: 20,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.eaceAlert.findMany({ where: { organizationId, isActive: true }, take: 20 }),
    ]);
    return {
      authorized: true,
      profileRole,
      dashboard: dash,
      producers: recommendations.slice(0, 10),
      contracts: contracts.slice(0, 20),
      visits,
      notifications,
      alerts,
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eaceOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eaceOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    for (const row of (payload.visits as Array<Record<string, unknown>>) ?? []) {
      if (row.visitKey) {
        await this.prisma.eaceTechnicalVisit.updateMany({
          where: { organizationId, visitKey: String(row.visitKey) },
          data: { observations: (row.observations ?? []) as object, photos: (row.photos ?? []) as object },
        });
      }
    }
    await this.prisma.eaceOfflineBatch.update({
      where: { id: batch.id },
      data: { status: 'completed', syncedAt: new Date() },
    });
    return { synced: true, batchKey };
  }
}
