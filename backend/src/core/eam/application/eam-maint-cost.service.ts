import { Injectable } from '@nestjs/common';
import { EamWorkOrderCostType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateCmmsCosts, aggregateWorkOrderCosts, generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';

@Injectable()
export class EamMaintCostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamCmmsIntegrationService,
  ) {}

  async post(
    organizationId: string,
    userId: string,
    workOrderKey: string,
    costType: EamWorkOrderCostType,
    amount: number,
    description?: string,
  ) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) return null;
    const seq = await this.prisma.eamWorkOrderCost.count({ where: { organizationId } });
    const row = await this.prisma.eamWorkOrderCost.create({
      data: {
        organizationId,
        costKey: generateEamCmmsKey('CST', seq + 1),
        workOrderKey,
        assetKey: wo.assetKey,
        costType,
        amount,
        description,
      },
    });
    await this.audit.log(organizationId, 'EamWorkOrderCost', row.costKey, 'cost_posted', userId);
    if (costType === 'labor') await this.integration.onLaborCost(organizationId, wo.id, workOrderKey, amount);
    return this.recalculateWorkOrder(organizationId, workOrderKey);
  }

  async recalculateWorkOrder(organizationId: string, workOrderKey: string) {
    const costs = await this.prisma.eamWorkOrderCost.findMany({ where: { organizationId, workOrderKey } });
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    const laborCost = (wo?.laborHours ?? 0) * 50000;
    const lines = [
      ...costs.map((c) => ({ costType: c.costType, amount: c.amount })),
      ...(laborCost > 0 ? [{ costType: 'labor', amount: laborCost }] : []),
    ];
    const agg = aggregateWorkOrderCosts(lines);
    if (wo) {
      await this.prisma.eamMaintWorkOrder.update({
        where: { id: wo.id },
        data: { totalCost: agg.total },
      });
    }
    return agg;
  }

  async dashboard(organizationId: string) {
    const workOrders = await this.prisma.eamMaintWorkOrder.findMany({
      where: { organizationId, status: { in: ['technically_closed', 'administratively_closed'] } },
      select: { totalCost: true, assetKey: true },
    });
    const assets = await this.prisma.eamAsset.findMany({
      where: { organizationId },
      select: { assetKey: true, familyKey: true },
    });
    const assetFamily = Object.fromEntries(assets.map((a) => [a.assetKey, a.familyKey ?? 'unknown']));
    const agg = aggregateCmmsCosts(
      workOrders.map((wo) => ({ totalCost: wo.totalCost, assetKey: wo.assetKey, familyKey: assetFamily[wo.assetKey] })),
    );
    const byType = await this.prisma.eamWorkOrderCost.groupBy({
      by: ['costType'],
      where: { organizationId },
      _sum: { amount: true },
    });
    return {
      annualTotal: agg.annualTotal,
      byAsset: agg.byAsset,
      byFamily: agg.byFamily,
      byCostType: Object.fromEntries(byType.map((b) => [b.costType, b._sum.amount ?? 0])),
    };
  }
}
