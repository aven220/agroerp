import { Injectable } from '@nestjs/common';
import { EpscmDemandSource, EpscmForecastStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EpscmAuditService } from './epscm-audit.service';
import {
  compareDemand,
  exponentialSmoothingForecast,
  generateEpscmKey,
  movingAverageForecast,
} from '../domain/epscm-planning.engine';

@Injectable()
export class EpscmDemandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  listVersions(organizationId: string) {
    return this.prisma.epscmDemandForecastVersion.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getVersion(organizationId: string, versionKey: string) {
    return this.prisma.epscmDemandForecastVersion.findUniqueOrThrow({
      where: { organizationId_versionKey: { organizationId, versionKey } },
      include: { lines: true },
    });
  }

  async createVersion(
    organizationId: string,
    userId: string,
    input: { name: string; periodStart: Date; periodEnd: Date },
  ) {
    const seq = await this.prisma.epscmDemandForecastVersion.count({ where: { organizationId } });
    const version = await this.prisma.epscmDemandForecastVersion.create({
      data: {
        organizationId,
        versionKey: generateEpscmKey('FCV', seq + 1),
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EpscmDemandForecastVersion', version.versionKey, 'created', userId);
    return version;
  }

  async recordHistory(
    organizationId: string,
    userId: string,
    input: { itemKey: string; periodDate: Date; actualQty: number; warehouseKey?: string },
  ) {
    const seq = await this.prisma.epscmDemandHistory.count({ where: { organizationId } });
    return this.prisma.epscmDemandHistory.create({
      data: {
        organizationId,
        historyKey: generateEpscmKey('DH', seq + 1),
        itemKey: input.itemKey,
        periodDate: input.periodDate,
        actualQty: input.actualQty,
        warehouseKey: input.warehouseKey,
        source: EpscmDemandSource.historical,
      },
    });
  }

  listHistory(organizationId: string, itemKey?: string, limit = 500) {
    return this.prisma.epscmDemandHistory.findMany({
      where: { organizationId, ...(itemKey ? { itemKey } : {}) },
      orderBy: { periodDate: 'desc' },
      take: limit,
    });
  }

  async computeAutomaticForecast(organizationId: string, userId: string, versionKey: string) {
    const version = await this.getVersion(organizationId, versionKey);
    const items = await this.prisma.eimsItem.findMany({
      where: { organizationId, isActive: true },
      take: 200,
    });

    const lines = [];
    for (const item of items) {
      const history = await this.prisma.epscmDemandHistory.findMany({
        where: { organizationId, itemKey: item.itemKey },
        orderBy: { periodDate: 'asc' },
        take: 12,
      });

      const salesLines = await this.prisma.escmSalesOrderLine.findMany({
        where: { itemKey: item.itemKey, order: { organizationId } },
        take: 50,
      });
      const salesQty = salesLines.reduce((s, l) => s + l.quantity, 0);

      const histValues = history.map((h) => h.actualQty);
      if (salesQty > 0) histValues.push(salesQty / Math.max(salesLines.length, 1));

      const projected = histValues.length >= 2
        ? exponentialSmoothingForecast(histValues[histValues.length - 1], movingAverageForecast(histValues))
        : movingAverageForecast(histValues, 3) || item.minStock || 10;

      const seq = await this.prisma.epscmDemandForecastLine.count({ where: { organizationId } });
      const line = await this.prisma.epscmDemandForecastLine.create({
        data: {
          organizationId,
          lineKey: generateEpscmKey('DFL', seq + 1),
          versionKey,
          itemKey: item.itemKey,
          source: EpscmDemandSource.automatic,
          projectedQty: projected,
          periodDate: version.periodEnd,
        },
      });
      lines.push(line);
    }

    await this.prisma.epscmDemandForecastVersion.update({
      where: { organizationId_versionKey: { organizationId, versionKey } },
      data: { computedAt: new Date(), status: EpscmForecastStatus.active },
    });

    await this.audit.log(organizationId, 'EpscmDemandForecastVersion', versionKey, 'forecast_computed', userId, {
      lineCount: lines.length,
    });

    return lines;
  }

  async setManualForecast(
    organizationId: string,
    userId: string,
    versionKey: string,
    itemKey: string,
    manualQty: number,
  ) {
    const existing = await this.prisma.epscmDemandForecastLine.findFirst({
      where: { organizationId, versionKey, itemKey },
    });
    if (existing) {
      return this.prisma.epscmDemandForecastLine.update({
        where: { organizationId_lineKey: { organizationId, lineKey: existing.lineKey } },
        data: { manualQty, projectedQty: manualQty, source: EpscmDemandSource.manual },
      });
    }
    const seq = await this.prisma.epscmDemandForecastLine.count({ where: { organizationId } });
    return this.prisma.epscmDemandForecastLine.create({
      data: {
        organizationId,
        lineKey: generateEpscmKey('DFL', seq + 1),
        versionKey,
        itemKey,
        source: EpscmDemandSource.manual,
        projectedQty: manualQty,
        manualQty,
        periodDate: new Date(),
      },
    });
  }

  async compareActualVsProjected(organizationId: string, userId: string, versionKey: string) {
    const lines = await this.prisma.epscmDemandForecastLine.findMany({
      where: { organizationId, versionKey },
    });

    const comparisons = [];
    for (const line of lines) {
      const history = await this.prisma.epscmDemandHistory.findMany({
        where: { organizationId, itemKey: line.itemKey },
        orderBy: { periodDate: 'desc' },
        take: 1,
      });
      const actualQty = history[0]?.actualQty ?? 0;
      const projectedQty = line.manualQty ?? line.projectedQty;
      const { varianceQty, variancePct } = compareDemand(actualQty, projectedQty);

      const seq = await this.prisma.epscmDemandComparison.count({ where: { organizationId } });
      const row = await this.prisma.epscmDemandComparison.create({
        data: {
          organizationId,
          comparisonKey: generateEpscmKey('CMP', seq + 1),
          versionKey,
          itemKey: line.itemKey,
          actualQty,
          projectedQty,
          varianceQty,
          variancePct,
          periodDate: line.periodDate,
        },
      });
      comparisons.push(row);
    }

    await this.audit.log(organizationId, 'EpscmDemandComparison', versionKey, 'forecast_computed', userId);
    return comparisons;
  }

  activateVersion(organizationId: string, userId: string, versionKey: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.epscmDemandForecastVersion.updateMany({
        where: { organizationId, isActive: true },
        data: { isActive: false, status: EpscmForecastStatus.archived },
      });
      return tx.epscmDemandForecastVersion.update({
        where: { organizationId_versionKey: { organizationId, versionKey } },
        data: { isActive: true, status: EpscmForecastStatus.active },
      });
    });
  }
}
