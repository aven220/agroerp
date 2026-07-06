import { Injectable, NotFoundException } from '@nestjs/common';
import { EmfgVarianceType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeMargin, computeMarginPct, computeUnitCost, computeVariance } from '../domain/emfg-cost.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCostIntegrationService } from './emfg-cost-integration.service';

@Injectable()
export class EmfgCostVarianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgCostIntegrationService,
  ) {}

  list(organizationId: string, orderKey?: string) {
    return this.prisma.emfgCostVariance.findMany({
      where: { organizationId, ...(orderKey ? { orderKey } : {}) },
      orderBy: { computedAt: 'desc' },
      take: 500,
    });
  }

  async computeForOrder(organizationId: string, userId: string, orderKey: string, salesPrice = 0) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
    if (!order) throw new NotFoundException('order_not_found');

    const activeVersion = await this.prisma.emfgCostStandardVersion.findFirst({
      where: { organizationId, isActive: true },
      include: { lines: true },
    });

    const productLine = activeVersion?.lines.find((l) => l.scope === 'product' && l.refKey === order.itemKey);
    const bomLines = activeVersion?.lines.filter((l) => l.scope === 'bom') ?? [];
    const opLines = activeVersion?.lines.filter((l) => l.scope === 'operation') ?? [];

    const standardMaterial = bomLines.reduce((s, l) => s + l.totalCost, 0);
    const standardLabor = opLines.reduce((s, l) => s + l.totalCost, 0);
    const standardTotal = productLine?.totalCost ?? (standardMaterial + standardLabor);

    const actuals = await this.prisma.emfgCostActualLine.findMany({ where: { organizationId, orderKey } });
    const actualMaterial = actuals.filter((a) => a.lineType === 'material' || a.lineType === 'additional').reduce((s, a) => s + a.amount, 0);
    const actualLabor = actuals.filter((a) => a.lineType === 'labor').reduce((s, a) => s + a.amount, 0);
    const actualWaste = actuals.filter((a) => a.lineType === 'waste' || a.lineType === 'rework').reduce((s, a) => s + a.amount, 0);
    const actualTotal = actuals.reduce((s, a) => s + a.amount, 0);

    const types: Array<{ type: EmfgVarianceType; standard: number; actual: number }> = [
      { type: 'total', standard: standardTotal, actual: actualTotal },
      { type: 'material', standard: standardMaterial, actual: actualMaterial },
      { type: 'labor', standard: standardLabor, actual: actualLabor },
      { type: 'waste', standard: 0, actual: actualWaste },
      { type: 'efficiency', standard: standardLabor, actual: actualLabor },
    ];

    await this.prisma.emfgCostVariance.deleteMany({ where: { organizationId, orderKey } });

    const variances = [];
    for (const t of types) {
      const v = computeVariance(t.standard, t.actual);
      const seq = await this.prisma.emfgCostVariance.count({ where: { organizationId } });
      variances.push(await this.prisma.emfgCostVariance.create({
        data: {
          organizationId,
          varianceKey: generateEmfgKey('VAR', seq + 1),
          orderKey,
          varianceType: t.type,
          standardAmount: t.standard,
          actualAmount: t.actual,
          varianceAmount: v.amount,
          variancePct: v.pct,
        },
      }));
    }

    const standardUnit = computeUnitCost(standardTotal, order.plannedQty);
    const actualUnit = computeUnitCost(actualTotal, order.producedQty || order.plannedQty);
    const marginExpected = computeMargin(salesPrice, standardUnit);
    const marginActual = computeMargin(salesPrice, actualUnit);

    const seq = await this.prisma.emfgCostOrderSummary.count({ where: { organizationId } });
    const summaryKey = generateEmfgKey('COS', seq + 1);

    const wip = await this.prisma.emfgCostWipRecord.findUnique({ where: { organizationId_orderKey: { organizationId, orderKey } } });

    await this.prisma.emfgCostOrderSummary.upsert({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      create: {
        organizationId,
        summaryKey,
        orderKey,
        itemKey: order.itemKey,
        producedQty: order.producedQty,
        standardUnitCost: standardUnit,
        actualUnitCost: actualUnit,
        wipValue: wip?.totalValue ?? 0,
        marginExpected,
        marginActual,
      },
      update: {
        producedQty: order.producedQty,
        standardUnitCost: standardUnit,
        actualUnitCost: actualUnit,
        wipValue: wip?.totalValue ?? 0,
        marginExpected,
        marginActual,
        computedAt: new Date(),
      },
    });

    const calcSeq = await this.prisma.emfgCostCalculation.count({ where: { organizationId } });
    await this.prisma.emfgCostCalculation.create({
      data: {
        organizationId,
        calcKey: generateEmfgKey('CC', calcSeq + 1),
        orderKey,
        trigger: 'variance_compute',
        standardTotal,
        actualTotal,
        varianceTotal: variances.find((v) => v.varianceType === 'total')?.varianceAmount ?? 0,
        userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgCostVariance', orderKey, 'variance_computed', userId, { standardTotal, actualTotal });
    await this.core.emitUserAction(organizationId, 'EmfgCostVariance', orderKey, EVENT_TYPES.EMFG_COST_VARIANCE_COMPUTED, { orderKey });
    await this.integration.onVarianceComputed(organizationId, orderKey, variances);

    return { variances, standardTotal, actualTotal, standardUnit, actualUnit, marginExpected, marginActual, marginExpectedPct: computeMarginPct(salesPrice, standardUnit) };
  }
}
