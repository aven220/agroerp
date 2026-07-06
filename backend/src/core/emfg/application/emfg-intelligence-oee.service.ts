import { Injectable } from '@nestjs/common';
import { EmfgIntelligenceScope } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgAuditService } from './emfg-audit.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import {
  computeAvailabilityPct,
  computeOee,
  computePerformancePct,
  computeQualityPct,
} from '../domain/emfg-intelligence.engine';

@Injectable()
export class EmfgIntelligenceOeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  async computeAll(organizationId: string, userId?: string) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const snapshots = [];

    const [equipment, maintenanceLogs, orders, outputs] = await Promise.all([
      this.prisma.emfgEquipmentProfile.findMany({ where: { organizationId } }),
      this.prisma.emfgResourceMaintenanceLog.findMany({
        where: { organizationId, startedAt: { gte: periodStart } },
      }),
      this.prisma.emfgProductionOrder.findMany({
        where: { organizationId, actualStart: { gte: periodStart } },
      }),
      this.prisma.emfgProductionOutput.findMany({
        where: { organizationId, recordedAt: { gte: periodStart } },
      }),
    ]);

    const plannedMinutesPerMachine = 7 * 8 * 60;

    for (const eq of equipment) {
      const downtime = maintenanceLogs
        .filter((m) => m.equipmentKey === eq.equipmentKey)
        .reduce((s, m) => s + m.downtimeMinutes, 0);
      const availabilityPct = computeAvailabilityPct(plannedMinutesPerMachine, downtime);
      const machineOutputs = outputs.filter((o) => {
        const meta = o.metadata as Record<string, unknown>;
        return meta?.equipmentKey === eq.equipmentKey;
      });
      const goodQty = machineOutputs.reduce((s, o) => s + o.quantity, 0);
      const relatedOrders = orders.filter((ord) => ord.centerKey === eq.workCenterKey || ord.lineKey === eq.workCenterKey);
      const scrapQty = relatedOrders.reduce((s, o) => s + o.scrapQty, 0);
      const totalQty = goodQty + scrapQty;
      const qualityPct = computeQualityPct(goodQty, totalQty);
      const operatingMinutes = Math.max(0, plannedMinutesPerMachine - downtime);
      const idealCycle = 1;
      const performancePct = computePerformancePct(idealCycle, goodQty, operatingMinutes);
      const oeePct = computeOee(availabilityPct, performancePct, qualityPct);

      const seq = await this.prisma.emfgIntelligenceOeeSnapshot.count({ where: { organizationId } });
      const row = await this.prisma.emfgIntelligenceOeeSnapshot.create({
        data: {
          organizationId,
          snapshotKey: generateEmfgKey('OEE', seq + 1),
          scope: EmfgIntelligenceScope.machine,
          entityKey: eq.equipmentKey,
          entityName: eq.name,
          availabilityPct,
          performancePct,
          qualityPct,
          oeePct,
          plannedMinutes: plannedMinutesPerMachine,
          downtimeMinutes: downtime,
          goodQty,
          totalQty,
          periodStart,
          periodEnd,
        },
      });
      snapshots.push(row);
    }

    const centers = await this.prisma.emfgProductionCenter.findMany({ where: { organizationId, isActive: true } });
    for (const center of centers) {
      const centerOrders = orders.filter((o) => o.centerKey === center.centerKey);
      const goodQty = centerOrders.reduce((s, o) => s + o.producedQty, 0);
      const scrapQty = centerOrders.reduce((s, o) => s + o.scrapQty, 0);
      const totalQty = goodQty + scrapQty;
      const centerDowntime = maintenanceLogs.reduce((s, m) => s + m.downtimeMinutes, 0);
      const availabilityPct = computeAvailabilityPct(plannedMinutesPerMachine * Math.max(equipment.length, 1), centerDowntime);
      const performancePct = computePerformancePct(1, goodQty, plannedMinutesPerMachine);
      const qualityPct = computeQualityPct(goodQty, totalQty);
      const oeePct = computeOee(availabilityPct, performancePct, qualityPct);

      const seq = await this.prisma.emfgIntelligenceOeeSnapshot.count({ where: { organizationId } });
      const row = await this.prisma.emfgIntelligenceOeeSnapshot.create({
        data: {
          organizationId,
          snapshotKey: generateEmfgKey('OEE', seq + 1),
          scope: EmfgIntelligenceScope.plant,
          entityKey: center.centerKey,
          entityName: center.name,
          availabilityPct,
          performancePct,
          qualityPct,
          oeePct,
          plannedMinutes: plannedMinutesPerMachine,
          downtimeMinutes: centerDowntime,
          goodQty,
          totalQty,
          periodStart,
          periodEnd,
        },
      });
      snapshots.push(row);
    }

    const cells = await this.prisma.emfgManufacturingCell.findMany({ where: { organizationId, isActive: true } });
    for (const cell of cells) {
      const lineOrders = orders.filter((o) => o.lineKey === cell.lineKey);
      const goodQty = lineOrders.reduce((s, o) => s + o.producedQty, 0);
      const scrapQty = lineOrders.reduce((s, o) => s + o.scrapQty, 0);
      const totalQty = goodQty + scrapQty;
      const availabilityPct = computeAvailabilityPct(plannedMinutesPerMachine, 0);
      const performancePct = computePerformancePct(1, goodQty, plannedMinutesPerMachine);
      const qualityPct = computeQualityPct(goodQty, totalQty);
      const oeePct = computeOee(availabilityPct, performancePct, qualityPct);

      const seq = await this.prisma.emfgIntelligenceOeeSnapshot.count({ where: { organizationId } });
      const row = await this.prisma.emfgIntelligenceOeeSnapshot.create({
        data: {
          organizationId,
          snapshotKey: generateEmfgKey('OEE', seq + 1),
          scope: EmfgIntelligenceScope.line,
          entityKey: cell.cellKey,
          entityName: cell.name,
          availabilityPct,
          performancePct,
          qualityPct,
          oeePct,
          plannedMinutes: plannedMinutesPerMachine,
          downtimeMinutes: 0,
          goodQty,
          totalQty,
          periodStart,
          periodEnd,
        },
      });
      snapshots.push(row);
    }

    await this.audit.log(organizationId, 'EmfgIntelligenceOee', 'batch', 'oee_computed', userId, {
      count: snapshots.length,
    });

    return snapshots;
  }

  list(organizationId: string, scope?: EmfgIntelligenceScope, entityKey?: string, limit = 200) {
    return this.prisma.emfgIntelligenceOeeSnapshot.findMany({
      where: {
        organizationId,
        ...(scope ? { scope } : {}),
        ...(entityKey ? { entityKey } : {}),
      },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }

  history(organizationId: string, entityKey: string, limit = 100) {
    return this.prisma.emfgIntelligenceOeeSnapshot.findMany({
      where: { organizationId, entityKey },
      orderBy: { periodEnd: 'desc' },
      take: limit,
    });
  }

  comparatives(organizationId: string) {
    return this.prisma.emfgIntelligenceOeeSnapshot.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: 500,
    });
  }
}
