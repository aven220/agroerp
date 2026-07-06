import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeUnitCost } from '../domain/emfg-cost.engine';

@Injectable()
export class EmfgCostIntegrationService {
  private readonly logger = new Logger(EmfgCostIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async onCostCalculated(organizationId: string, orderKey: string, actualTotal: number) {
    await this.core.emitUserAction(organizationId, 'EmfgCostCalculation', orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      orderKey,
      amount: actualTotal,
      integration: 'efm',
      cost: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgCostCalculation', orderKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
      orderKey,
      integration: 'eims',
      cost: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgCostCalculation', orderKey, EVENT_TYPES.EMFG_COST_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
    this.logger.log(`Cost calculated for ${orderKey}: ${actualTotal}`);
  }

  async onWipTransferred(organizationId: string, orderKey: string, wipValue: number) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
    if (!order) return;

    await this.core.emitUserAction(organizationId, 'EmfgCostWipRecord', orderKey, EVENT_TYPES.EMFG_INVENTORY_RECEIPT_REQUESTED, {
      orderKey,
      itemKey: order.itemKey,
      value: wipValue,
      integration: 'eims',
      cost: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgCostWipRecord', orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      orderKey,
      amount: wipValue,
      entryType: 'wip_to_fg',
      integration: 'efm',
    });
  }

  async onVarianceComputed(organizationId: string, orderKey: string, variances: Array<{ varianceType: string; varianceAmount: number }>) {
    const totalVar = variances.find((v) => v.varianceType === 'total');
    await this.core.emitUserAction(organizationId, 'EmfgCostVariance', orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      orderKey,
      varianceAmount: totalVar?.varianceAmount ?? 0,
      integration: 'efm',
      variance: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgCostVariance', orderKey, EVENT_TYPES.EMFG_COST_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }

  async computeLotCosts(organizationId: string, orderKey: string) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { lots: true },
    });
    if (!order) return [];

    const actuals = await this.prisma.emfgCostActualLine.findMany({ where: { organizationId, orderKey } });
    const orderTotal = actuals.reduce((s, a) => s + a.amount, 0);

    const results = [];
    for (const lot of order.lots) {
      const lotActuals = actuals.filter((a) => a.lotKey === lot.lotKey);
      const lotTotal = lotActuals.length
        ? lotActuals.reduce((s, a) => s + a.amount, 0)
        : orderTotal * (lot.quantity / Math.max(order.producedQty, 1));

      const seq = await this.prisma.emfgCostLotSummary.count({ where: { organizationId } });
      const row = await this.prisma.emfgCostLotSummary.upsert({
        where: { organizationId_lotKey: { organizationId, lotKey: lot.lotKey } },
        create: {
          organizationId,
          summaryKey: generateEmfgKey('CLS', seq + 1),
          lotKey: lot.lotKey,
          orderKey,
          itemKey: lot.itemKey,
          quantity: lot.quantity,
          totalCost: lotTotal,
          unitCost: computeUnitCost(lotTotal, lot.quantity),
        },
        update: {
          quantity: lot.quantity,
          totalCost: lotTotal,
          unitCost: computeUnitCost(lotTotal, lot.quantity),
          computedAt: new Date(),
        },
      });
      results.push(row);
    }
    return results;
  }
}
