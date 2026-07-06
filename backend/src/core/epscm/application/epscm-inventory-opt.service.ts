import { Injectable } from '@nestjs/common';
import { EpscmAbcClass, EpscmXyzClass } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EpscmAuditService } from './epscm-audit.service';
import {
  classifyAbc,
  classifyXyz,
  computeCoefficientOfVariation,
  computeCoverageDays,
  computeRotationRate,
  generateEpscmKey,
} from '../domain/epscm-planning.engine';

@Injectable()
export class EpscmInventoryOptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  listClassifications(organizationId: string, limit = 500) {
    return this.prisma.epscmInventoryClassification.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }

  async computeClassifications(organizationId: string, userId: string) {
    const items = await this.prisma.eimsItem.findMany({
      where: { organizationId, isActive: true },
      take: 500,
    });

    const abcInput: Array<{ itemKey: string; annualValue: number }> = [];
    const xyzInput: Array<{ itemKey: string; cv: number }> = [];
    const results = [];

    for (const item of items) {
      const balances = await this.prisma.eimsStockBalance.findMany({
        where: { organizationId, itemId: item.id },
      });
      const onHand = balances.reduce((s, b) => s + b.onHandQty, 0);
      const avgCost = balances.length
        ? balances.reduce((s, b) => s + b.averageCost, 0) / balances.length
        : 0;
      const annualValue = onHand * avgCost * 12;

      const movements = await this.prisma.eimsMovement.findMany({
        where: { organizationId, itemId: item.id },
        take: 24,
        orderBy: { postedAt: 'desc' },
      });
      const consumedQty = movements
        .filter((m) => ['exit', 'consumption', 'shrinkage', 'loss'].includes(m.movementType))
        .reduce((s, m) => s + Math.abs(m.quantity), 0);

      const histDemand = await this.prisma.epscmDemandHistory.findMany({
        where: { organizationId, itemKey: item.itemKey },
        orderBy: { periodDate: 'desc' },
        take: 12,
      });
      const demandValues = histDemand.map((h) => h.actualQty);
      const cv = computeCoefficientOfVariation(demandValues.length ? demandValues : [consumedQty]);

      abcInput.push({ itemKey: item.itemKey, annualValue });
      xyzInput.push({ itemKey: item.itemKey, cv });

      const rotationRate = computeRotationRate(consumedQty, onHand || 1);
      const avgDaily = demandValues.length
        ? demandValues.reduce((s, v) => s + v, 0) / demandValues.length / 30
        : consumedQty / 30;
      const coverageDays = computeCoverageDays(onHand, avgDaily);
      const isObsolete = rotationRate < 0.1 && onHand > 0;
      const isSlowMoving = rotationRate < 1 && onHand > 0;

      const seq = await this.prisma.epscmInventoryClassification.count({ where: { organizationId } });
      const row = await this.prisma.epscmInventoryClassification.upsert({
        where: { organizationId_itemKey: { organizationId, itemKey: item.itemKey } },
        create: {
          organizationId,
          classKey: generateEpscmKey('CLS', seq + 1),
          itemKey: item.itemKey,
          abcClass: EpscmAbcClass.C,
          xyzClass: EpscmXyzClass.Z,
          rotationRate,
          isCritical: false,
          isObsolete,
          isSlowMoving,
          coverageDays,
        },
        update: {
          rotationRate,
          isObsolete,
          isSlowMoving,
          coverageDays,
          computedAt: new Date(),
        },
      });
      results.push(row);
    }

    const abcMap = classifyAbc(abcInput);
    const xyzMap = classifyXyz(xyzInput);

    for (const row of results) {
      const abc = abcMap.get(row.itemKey) ?? 'C';
      const xyz = xyzMap.get(row.itemKey) ?? 'Z';
      await this.prisma.epscmInventoryClassification.update({
        where: { organizationId_itemKey: { organizationId, itemKey: row.itemKey } },
        data: {
          abcClass: abc as EpscmAbcClass,
          xyzClass: xyz as EpscmXyzClass,
          isCritical: abc === 'A' && xyz === 'X',
        },
      });
    }

    const critical = results.filter((r) => abcMap.get(r.itemKey) === 'A').length;
    const obsolete = results.filter((r) => r.isObsolete).length;
    const avgCoverage = results.length
      ? results.reduce((s, r) => s + r.coverageDays, 0) / results.length
      : 0;

    const indSeq = await this.prisma.epscmInventoryIndicator.count({ where: { organizationId } });
    await this.prisma.epscmInventoryIndicator.create({
      data: {
        organizationId,
        indicatorKey: generateEpscmKey('IND', indSeq + 1),
        periodDate: new Date(),
        indicators: {
          itemCount: results.length,
          criticalItems: critical,
          obsoleteItems: obsolete,
          slowMovingItems: results.filter((r) => r.isSlowMoving).length,
          avgCoverageDays: avgCoverage,
          abcDistribution: {
            A: [...abcMap.values()].filter((v) => v === 'A').length,
            B: [...abcMap.values()].filter((v) => v === 'B').length,
            C: [...abcMap.values()].filter((v) => v === 'C').length,
          },
        } as object,
      },
    });

    await this.audit.log(organizationId, 'EpscmInventoryClassification', 'batch', 'classification_computed', userId, {
      count: results.length,
    });

    return results;
  }

  async latestIndicators(organizationId: string) {
    const latest = await this.prisma.epscmInventoryIndicator.findFirst({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
    });
    return latest?.indicators ?? {};
  }
}
