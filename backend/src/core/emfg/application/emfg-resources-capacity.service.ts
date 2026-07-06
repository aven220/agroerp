import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeShiftCapacity, detectBottlenecks } from '../domain/emfg-resources.engine';

@Injectable()
export class EmfgResourcesCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  async computeAll(organizationId: string) {
    const [workCenters, lines, machines, schedules] = await Promise.all([
      this.prisma.emfgWorkCenter.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.emfgProductionLine.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.emfgMachine.findMany({ where: { organizationId } }),
      this.prisma.emfgScheduleEntry.findMany({ where: { organizationId } }),
    ]);

    const loadByWc = new Map<string, number>();
    for (const s of schedules) {
      loadByWc.set(s.workCenterKey, (loadByWc.get(s.workCenterKey) ?? 0) + s.loadMinutes);
    }

    const shiftCaps = [];
    const entities = [];

    for (const wc of workCenters) {
      const load = loadByWc.get(wc.workCenterKey) ?? 0;
      const cap = computeShiftCapacity(wc.installedCapacity, load);
      const seq = await this.prisma.emfgResourceShiftCapacity.count({ where: { organizationId } });
      const row = await this.prisma.emfgResourceShiftCapacity.create({
        data: {
          organizationId,
          shiftCapKey: generateEmfgKey('SC', seq + 1),
          entityType: 'work_center',
          entityKey: wc.workCenterKey,
          shiftName: 'default',
          ...cap,
        },
      });
      shiftCaps.push(row);
      entities.push({ entityKey: wc.workCenterKey, entityType: 'work_center', installedMinutes: wc.installedCapacity, utilizedMinutes: load });
    }

    for (const line of lines) {
      const wcInLine = workCenters.filter(() => true);
      const load = wcInLine.reduce((s, wc) => s + (loadByWc.get(wc.workCenterKey) ?? 0), 0) / Math.max(1, wcInLine.length);
      const cap = computeShiftCapacity(line.installedCapacity, load);
      const seq = await this.prisma.emfgResourceShiftCapacity.count({ where: { organizationId } });
      shiftCaps.push(await this.prisma.emfgResourceShiftCapacity.create({
        data: {
          organizationId,
          shiftCapKey: generateEmfgKey('SC', seq + 1),
          entityType: 'line',
          entityKey: line.lineKey,
          shiftName: 'default',
          ...cap,
        },
      }));
      entities.push({ entityKey: line.lineKey, entityType: 'line', installedMinutes: line.installedCapacity, utilizedMinutes: load });
    }

    for (const m of machines) {
      const factor = m.capacityFactor ?? 1;
      const installed = 480 * factor;
      const load = (loadByWc.get(m.workCenterKey) ?? 0) / Math.max(1, machines.filter((x) => x.workCenterKey === m.workCenterKey).length);
      const cap = computeShiftCapacity(installed, load);
      const seq = await this.prisma.emfgResourceShiftCapacity.count({ where: { organizationId } });
      shiftCaps.push(await this.prisma.emfgResourceShiftCapacity.create({
        data: {
          organizationId,
          shiftCapKey: generateEmfgKey('SC', seq + 1),
          entityType: 'machine',
          entityKey: m.machineKey,
          shiftName: 'default',
          ...cap,
        },
      }));
      entities.push({ entityKey: m.machineKey, entityType: 'machine', installedMinutes: installed, utilizedMinutes: load });
    }

    return {
      shiftCapacities: shiftCaps,
      bottlenecks: detectBottlenecks(entities),
      computedAt: new Date().toISOString(),
    };
  }

  async panel(organizationId: string) {
    const latest = await this.prisma.emfgResourceShiftCapacity.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: 200,
    });

    const byType = {
      work_center: latest.filter((c) => c.entityType === 'work_center'),
      line: latest.filter((c) => c.entityType === 'line'),
      machine: latest.filter((c) => c.entityType === 'machine'),
    };

    const avgUtil = latest.length
      ? latest.reduce((s, c) => s + c.utilizationPct, 0) / latest.length
      : 0;

    return { byType, avgUtilizationPct: Math.round(avgUtil * 100) / 100, total: latest.length };
  }
}
