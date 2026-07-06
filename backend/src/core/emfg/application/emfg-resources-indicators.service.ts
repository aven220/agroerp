import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateResourceIndicators } from '../domain/emfg-resources.engine';

@Injectable()
export class EmfgResourcesIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const [equipment, maintenanceLogs, downtimes, shiftCaps, workCenters] = await Promise.all([
      this.prisma.emfgEquipmentProfile.findMany({ where: { organizationId } }),
      this.prisma.emfgResourceMaintenanceLog.findMany({ where: { organizationId }, take: 500 }),
      this.prisma.emfgResourceMaintenanceLog.findMany({
        where: { organizationId, maintenanceType: 'corrective' },
        select: { downtimeMinutes: true },
      }),
      this.prisma.emfgResourceShiftCapacity.findMany({
        where: { organizationId },
        orderBy: { computedAt: 'desc' },
        take: 100,
      }),
      this.prisma.emfgWorkCenter.findMany({ where: { organizationId, isActive: true } }),
    ]);

    const capacities = shiftCaps.map((c) => ({
      entityKey: c.entityKey,
      entityType: c.entityType,
      installedMinutes: c.installedMinutes,
      utilizedMinutes: c.utilizedMinutes,
    }));

    const indicators = aggregateResourceIndicators({
      equipment,
      downtimes: maintenanceLogs.map((m) => ({ downtimeMinutes: m.downtimeMinutes })),
      maintenanceLogs,
      capacities,
    });

    const wcEfficiency = workCenters.map((wc) => {
      const cap = shiftCaps.find((c) => c.entityType === 'work_center' && c.entityKey === wc.workCenterKey);
      return {
        workCenterKey: wc.workCenterKey,
        name: wc.name,
        utilizationPct: cap?.utilizationPct ?? 0,
        installedCapacity: wc.installedCapacity,
        availableCapacity: wc.availableCapacity,
      };
    });

    return { ...indicators, workCenterEfficiency: wcEfficiency, generatedAt: new Date().toISOString() };
  }
}
