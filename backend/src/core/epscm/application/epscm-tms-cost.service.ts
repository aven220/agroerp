import { Injectable } from '@nestjs/common';
import { EpscmTmsCostCategory } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  aggregateCostsByCategory,
  computeLogisticMargin,
  costPerCustomer,
  costPerDelivery,
  costPerRoute,
  costPerVehicle,
  sumCosts,
} from '../domain/epscm-tms-cost.engine';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsCostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string, tripKey?: string) {
    return this.prisma.epscmTmsCostEntry.findMany({
      where: { organizationId, ...(tripKey ? { tripKey } : {}) },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async record(
    organizationId: string,
    userId: string,
    input: {
      category: EpscmTmsCostCategory;
      amount: number;
      tripKey?: string;
      routeKey?: string;
      vehicleKey?: string;
      deliveryKey?: string;
      customerKey?: string;
      description?: string;
    },
  ) {
    const seq = await this.prisma.epscmTmsCostEntry.count({ where: { organizationId } });
    const entry = await this.prisma.epscmTmsCostEntry.create({
      data: {
        organizationId,
        costKey: generateEpscmTmsKey('CST', seq + 1),
        category: input.category,
        amount: input.amount,
        tripKey: input.tripKey,
        routeKey: input.routeKey,
        vehicleKey: input.vehicleKey,
        deliveryKey: input.deliveryKey,
        customerKey: input.customerKey,
        description: input.description,
      },
    });
    await this.integration.onCostPosted(organizationId, entry.costKey, input.category);
    await this.audit.log(organizationId, 'EpscmTmsCostEntry', entry.costKey, 'created', userId);
    return entry;
  }

  async dashboard(organizationId: string) {
    const entries = await this.prisma.epscmTmsCostEntry.findMany({ where: { organizationId } });
    const lines = entries.map((e) => ({ category: e.category, amount: e.amount }));
    const totalCost = sumCosts(lines);
    const byCategory = Object.fromEntries(aggregateCostsByCategory(lines));

    const [deliveryCount, routeCount, vehicleCount, customerKeys] = await Promise.all([
      this.prisma.epscmTmsDelivery.count({ where: { organizationId, status: 'completed' } }),
      this.prisma.epscmTmsRoute.count({ where: { organizationId } }),
      this.prisma.epscmTmsVehicle.count({ where: { organizationId } }),
      this.prisma.epscmTmsCostEntry.findMany({
        where: { organizationId, customerKey: { not: null } },
        select: { customerKey: true },
        distinct: ['customerKey'],
      }),
    ]);

    const orders = await this.prisma.escmSalesOrder.aggregate({
      where: { organizationId },
      _sum: { totalAmount: true },
    });
    const revenue = orders._sum.totalAmount ?? 0;
    const margin = computeLogisticMargin(revenue, totalCost);

    return {
      totalCost,
      byCategory,
      costPerDelivery: costPerDelivery(totalCost, deliveryCount),
      costPerRoute: costPerRoute(totalCost, routeCount),
      costPerVehicle: costPerVehicle(totalCost, vehicleCount),
      costPerCustomer: costPerCustomer(totalCost, customerKeys.length),
      revenue,
      margin: margin.margin,
      marginPct: margin.marginPct,
    };
  }
}
