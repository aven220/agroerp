import { Injectable } from '@nestjs/common';
import { EmfgCostLineType, EmfgWipStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeWipValue } from '../domain/emfg-cost.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCostIntegrationService } from './emfg-cost-integration.service';

@Injectable()
export class EmfgCostWipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgCostIntegrationService,
  ) {}

  list(organizationId: string, status?: EmfgWipStatus) {
    return this.prisma.emfgCostWipRecord.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  get(organizationId: string, orderKey: string) {
    return this.prisma.emfgCostWipRecord.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
  }

  async ensure(organizationId: string, orderKey: string, lotKey?: string) {
    const existing = await this.get(organizationId, orderKey);
    if (existing) return existing;

    const seq = await this.prisma.emfgCostWipRecord.count({ where: { organizationId } });
    const wipKey = generateEmfgKey('WIP', seq + 1);

    return this.prisma.emfgCostWipRecord.create({
      data: { organizationId, wipKey, orderKey, lotKey, status: 'open' },
    });
  }

  async accumulate(organizationId: string, orderKey: string, lineType: EmfgCostLineType, amount: number) {
    const wip = await this.ensure(organizationId, orderKey);
    const update: { materialCost?: { increment: number }; laborCost?: { increment: number }; overheadCost?: { increment: number }; totalValue?: number } = {};

    if (lineType === 'material' || lineType === 'additional' || lineType === 'waste' || lineType === 'rework') {
      update.materialCost = { increment: amount };
    } else if (lineType === 'labor') {
      update.laborCost = { increment: amount };
    } else if (lineType === 'overhead') {
      update.overheadCost = { increment: amount };
    }

    const newMaterial = wip.materialCost + (update.materialCost?.increment ?? 0);
    const newLabor = wip.laborCost + (update.laborCost?.increment ?? 0);
    const newOverhead = wip.overheadCost + (update.overheadCost?.increment ?? 0);
    update.totalValue = computeWipValue(newMaterial, newLabor, newOverhead);

    return this.prisma.emfgCostWipRecord.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: update,
    });
  }

  async transferToFg(organizationId: string, userId: string, orderKey: string) {
    const wip = await this.get(organizationId, orderKey);
    if (!wip || wip.status !== 'open') return null;

    const updated = await this.prisma.emfgCostWipRecord.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: { status: 'transferred', transferredAt: new Date() },
    });

    await this.audit.log(organizationId, 'EmfgCostWipRecord', wip.wipKey, 'updated', userId, { action: 'transfer' });
    await this.core.emitUserAction(organizationId, 'EmfgCostWipRecord', wip.wipKey, EVENT_TYPES.EMFG_COST_WIP_UPDATED, { orderKey, totalValue: wip.totalValue });
    await this.integration.onWipTransferred(organizationId, orderKey, wip.totalValue);
    return updated;
  }

  async close(organizationId: string, userId: string, orderKey: string) {
    const wip = await this.get(organizationId, orderKey);
    if (!wip) return null;

    const updated = await this.prisma.emfgCostWipRecord.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: { status: 'closed', closedAt: new Date() },
    });

    await this.audit.log(organizationId, 'EmfgCostWipRecord', wip.wipKey, 'wip_closed', userId);
    await this.core.emitUserAction(organizationId, 'EmfgCostWipRecord', wip.wipKey, EVENT_TYPES.EMFG_COST_WIP_CLOSED, { orderKey });
    return updated;
  }
}
