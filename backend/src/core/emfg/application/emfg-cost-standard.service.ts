import { Injectable } from '@nestjs/common';
import { EmfgCostScope } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeLineTotal } from '../domain/emfg-cost.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgCostStandardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  listVersions(organizationId: string) {
    return this.prisma.emfgCostStandardVersion.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { versionNumber: 'desc' },
    });
  }

  getVersion(organizationId: string, versionKey: string) {
    return this.prisma.emfgCostStandardVersion.findUnique({
      where: { organizationId_versionKey: { organizationId, versionKey } },
      include: { lines: true },
    });
  }

  async createVersion(organizationId: string, userId: string, payload: {
    name: string;
    lines?: Array<{ scope: EmfgCostScope; refKey: string; itemKey?: string; unitCost: number; quantity?: number }>;
  }) {
    const count = await this.prisma.emfgCostStandardVersion.count({ where: { organizationId } });
    const versionKey = generateEmfgKey('CV', count + 1);

    await this.prisma.emfgCostStandardVersion.updateMany({
      where: { organizationId, isActive: true },
      data: { isActive: false },
    });

    const version = await this.prisma.emfgCostStandardVersion.create({
      data: {
        organizationId,
        versionKey,
        versionNumber: count + 1,
        name: payload.name,
        effectiveFrom: new Date(),
        createdBy: userId,
        lines: payload.lines?.length
          ? {
              create: payload.lines.map((l, i) => ({
                organizationId,
                lineKey: generateEmfgKey('CL', count * 10 + i + 1),
                scope: l.scope,
                refKey: l.refKey,
                itemKey: l.itemKey,
                unitCost: l.unitCost,
                quantity: l.quantity ?? 1,
                totalCost: computeLineTotal(l.quantity ?? 1, l.unitCost),
              })),
            }
          : undefined,
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EmfgCostStandardVersion', versionKey, 'created', userId, { name: payload.name });
    return version;
  }

  async updateLine(organizationId: string, userId: string, lineKey: string, unitCost: number) {
    const line = await this.prisma.emfgCostStandardLine.findUnique({
      where: { organizationId_lineKey: { organizationId, lineKey } },
    });
    if (!line) return null;

    const updated = await this.prisma.emfgCostStandardLine.update({
      where: { organizationId_lineKey: { organizationId, lineKey } },
      data: { unitCost, totalCost: computeLineTotal(line.quantity, unitCost) },
    });

    const seq = await this.prisma.emfgCostStandardHistory.count({ where: { organizationId } });
    await this.prisma.emfgCostStandardHistory.create({
      data: {
        organizationId,
        historyKey: generateEmfgKey('CH', seq + 1),
        versionKey: line.versionKey,
        lineKey,
        changeType: 'unit_cost',
        previousValue: line.unitCost,
        newValue: unitCost,
        changedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgCostStandardLine', lineKey, 'updated', userId, { unitCost });
    return updated;
  }

  history(organizationId: string, versionKey?: string) {
    return this.prisma.emfgCostStandardHistory.findMany({
      where: { organizationId, ...(versionKey ? { versionKey } : {}) },
      orderBy: { changedAt: 'desc' },
      take: 200,
    });
  }

  async buildFromOrder(organizationId: string, userId: string, orderKey: string) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { materials: true, operations: { include: { workCenter: true } } },
    });
    if (!order) return null;

    const lines: Array<{ scope: EmfgCostScope; refKey: string; itemKey?: string; unitCost: number; quantity?: number }> = [
      { scope: 'product', refKey: order.itemKey, itemKey: order.itemKey, unitCost: 0, quantity: order.plannedQty },
    ];

    for (const m of order.materials) {
      lines.push({ scope: 'bom', refKey: m.componentKey, itemKey: m.componentKey, unitCost: 1, quantity: m.requiredQty });
    }
    for (const op of order.operations) {
      lines.push({
        scope: 'operation',
        refKey: op.orderOpKey,
        unitCost: op.workCenter.costRate,
        quantity: op.runMinutes / 60,
      });
      lines.push({
        scope: 'work_center',
        refKey: op.workCenterKey,
        unitCost: op.workCenter.costRate,
        quantity: op.runMinutes / 60,
      });
    }

    return this.createVersion(organizationId, userId, { name: `Estándar ${order.orderNumber}`, lines });
  }
}
