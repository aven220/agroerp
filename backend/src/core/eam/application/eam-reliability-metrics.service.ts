import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeReliabilityIndicators, generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamReliabilityMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listEvents(organizationId: string, assetKey?: string) {
    return this.prisma.eamReliabilityEvent.findMany({
      where: { organizationId, ...(assetKey ? { assetKey } : {}) },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async recordEvent(
    organizationId: string,
    userId: string,
    assetKey: string,
    eventType: string,
    downtimeHours: number,
    repairHours: number,
    costImpact: number,
    occurredAt: Date,
    resolvedAt?: Date,
  ) {
    const seq = await this.prisma.eamReliabilityEvent.count({ where: { organizationId } });
    const event = await this.prisma.eamReliabilityEvent.create({
      data: {
        organizationId,
        eventKey: generateEamReliabilityKey('REL', seq + 1),
        assetKey,
        eventType,
        downtimeHours,
        repairHours,
        costImpact,
        occurredAt,
        resolvedAt,
      },
    });
    await this.audit.log(organizationId, 'EamReliabilityEvent', event.eventKey, 'created', userId, { assetKey, eventType });
    return event;
  }

  async computeForAsset(organizationId: string, userId: string, assetKey: string, operatingHours = 8760) {
    const events = await this.prisma.eamReliabilityEvent.findMany({ where: { organizationId, assetKey } });
    const indicators = computeReliabilityIndicators({
      operatingHours,
      events: events.map((e) => ({
        downtimeHours: e.downtimeHours,
        repairHours: e.repairHours,
        costImpact: e.costImpact,
      })),
    });
    const snapshot = await this.prisma.eamReliabilitySnapshot.upsert({
      where: { organizationId_snapshotKey: { organizationId, snapshotKey: `asset-${assetKey}` } },
      create: {
        organizationId,
        snapshotKey: `asset-${assetKey}`,
        assetKey,
        indicators: indicators as object,
      },
      update: { indicators: indicators as object, computedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EamReliabilitySnapshot', snapshot.snapshotKey, 'reliability_computed', userId, { assetKey });
    await this.integration.onReliabilityComputed(organizationId, snapshot.snapshotKey, assetKey);
    return { assetKey, indicators, snapshot };
  }

  async computeOrg(organizationId: string, userId: string) {
    const assets = await this.prisma.eamAsset.findMany({
      where: { organizationId, status: { in: ['operational', 'commissioned', 'installed'] } },
    });
    const results = [];
    for (const asset of assets) {
      results.push(await this.computeForAsset(organizationId, userId, asset.assetKey));
    }
    const allEvents = await this.prisma.eamReliabilityEvent.findMany({ where: { organizationId } });
    const orgIndicators = computeReliabilityIndicators({
      operatingHours: assets.length * 8760,
      events: allEvents.map((e) => ({
        downtimeHours: e.downtimeHours,
        repairHours: e.repairHours,
        costImpact: e.costImpact,
      })),
    });
    const snapshot = await this.prisma.eamReliabilitySnapshot.upsert({
      where: { organizationId_snapshotKey: { organizationId, snapshotKey: 'org-summary' } },
      create: { organizationId, snapshotKey: 'org-summary', indicators: orgIndicators as object },
      update: { indicators: orgIndicators as object, computedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EamReliabilitySnapshot', 'org-summary', 'reliability_computed', userId, {});
    await this.integration.onReliabilityComputed(organizationId, 'org-summary');
    return { orgIndicators, assetResults: results, snapshot };
  }

  getSnapshot(organizationId: string, snapshotKey: string) {
    return this.prisma.eamReliabilitySnapshot.findFirst({ where: { organizationId, snapshotKey } });
  }

  listSnapshots(organizationId: string) {
    return this.prisma.eamReliabilitySnapshot.findMany({ where: { organizationId } });
  }
}
