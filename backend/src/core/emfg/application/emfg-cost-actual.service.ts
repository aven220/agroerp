import { Injectable, NotFoundException } from '@nestjs/common';
import { EmfgCostLineType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import {
  computeActualTotal, computeLineTotal, computeOverheadCost,
} from '../domain/emfg-cost.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCostIntegrationService } from './emfg-cost-integration.service';
import { EmfgCostWipService } from './emfg-cost-wip.service';

const DEFAULT_MATERIAL_UNIT = 1;
const DEFAULT_LABOR_RATE = 25;
const OVERHEAD_PCT = 15;

@Injectable()
export class EmfgCostActualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgCostIntegrationService,
    private readonly wip: EmfgCostWipService,
  ) {}

  list(organizationId: string, orderKey: string) {
    return this.prisma.emfgCostActualLine.findMany({
      where: { organizationId, orderKey },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async recordLine(organizationId: string, userId: string, orderKey: string, payload: {
    lineType: EmfgCostLineType; componentKey?: string; quantity: number; unitCost: number;
    lotKey?: string; sourceKey?: string;
  }) {
    const seq = await this.prisma.emfgCostActualLine.count({ where: { organizationId } });
    const actualKey = generateEmfgKey('CA', seq + 1);
    const amount = computeLineTotal(payload.quantity, payload.unitCost);

    const line = await this.prisma.emfgCostActualLine.create({
      data: {
        organizationId,
        actualKey,
        orderKey,
        lotKey: payload.lotKey,
        lineType: payload.lineType,
        componentKey: payload.componentKey,
        quantity: payload.quantity,
        unitCost: payload.unitCost,
        amount,
        sourceKey: payload.sourceKey,
      },
    });

    await this.wip.accumulate(organizationId, orderKey, payload.lineType, amount);
    return line;
  }

  async calculateFromOrder(organizationId: string, userId: string, orderKey: string) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: {
        materials: true,
        operations: { include: { workCenter: true } },
        consumptions: true,
        outputs: true,
      },
    });
    if (!order) throw new NotFoundException('order_not_found');

    const lines: Array<{ lineType: EmfgCostLineType; componentKey?: string; quantity: number; unitCost: number; sourceKey?: string }> = [];

    for (const c of order.consumptions) {
      const type: EmfgCostLineType = c.consumptionType === 'waste' ? 'waste'
        : c.consumptionType === 'additional' ? 'additional' : 'material';
      lines.push({
        lineType: type,
        componentKey: c.componentKey,
        quantity: c.quantity + c.wasteQty,
        unitCost: DEFAULT_MATERIAL_UNIT,
        sourceKey: c.consumptionKey,
      });
    }

    if (order.consumptions.length === 0) {
      for (const m of order.materials) {
        if (m.issuedQty > 0) {
          lines.push({
            lineType: 'material',
            componentKey: m.componentKey,
            quantity: m.issuedQty,
            unitCost: DEFAULT_MATERIAL_UNIT,
            sourceKey: m.materialKey,
          });
        }
      }
    }

    for (const op of order.operations) {
      const minutes = op.completedMinutes || op.runMinutes;
      if (minutes > 0) {
        lines.push({
          lineType: 'labor',
          componentKey: op.orderOpKey,
          quantity: minutes,
          unitCost: op.workCenter.costRate || DEFAULT_LABOR_RATE / 60,
          sourceKey: op.orderOpKey,
        });
      }
    }

    for (const o of order.outputs) {
      if (o.outputType === 'rework') {
        lines.push({ lineType: 'rework', quantity: o.quantity, unitCost: DEFAULT_MATERIAL_UNIT, sourceKey: o.outputKey });
      }
      if (o.outputType === 'defect') {
        lines.push({ lineType: 'waste', quantity: o.quantity, unitCost: DEFAULT_MATERIAL_UNIT, sourceKey: o.outputKey });
      }
    }

    const materialTotal = lines.filter((l) => l.lineType === 'material').reduce((s, l) => s + computeLineTotal(l.quantity, l.unitCost), 0);
    const laborTotal = lines.filter((l) => l.lineType === 'labor').reduce((s, l) => s + computeLineTotal(l.quantity, l.unitCost), 0);
    const overhead = computeOverheadCost(materialTotal + laborTotal, OVERHEAD_PCT);
    if (overhead > 0) {
      lines.push({ lineType: 'overhead', quantity: 1, unitCost: overhead });
    }

    await this.prisma.emfgCostActualLine.deleteMany({ where: { organizationId, orderKey } });
    const created = [];
    for (const l of lines) {
      created.push(await this.recordLine(organizationId, userId, orderKey, l));
    }

    const actualTotal = computeActualTotal(created);
    const seq = await this.prisma.emfgCostCalculation.count({ where: { organizationId } });
    const calcKey = generateEmfgKey('CC', seq + 1);

    const calc = await this.prisma.emfgCostCalculation.create({
      data: {
        organizationId,
        calcKey,
        orderKey,
        trigger: 'auto_from_order',
        actualTotal,
        userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgCostCalculation', calcKey, 'cost_calculated', userId, { orderKey, actualTotal });
    await this.core.emitUserAction(organizationId, 'EmfgCostCalculation', calcKey, EVENT_TYPES.EMFG_COST_CALCULATED, { orderKey, actualTotal });
    await this.integration.onCostCalculated(organizationId, orderKey, actualTotal);

    return { calc, lines: created, actualTotal };
  }
}
