import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgCapacityService } from './emfg-capacity.service';
import { EmfgResourcesIndicatorsService } from './emfg-resources-indicators.service';

@Injectable()
export class EmfgResourcesCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacity: EmfgCapacityService,
    private readonly indicators: EmfgResourcesIndicatorsService,
  ) {}

  async dashboard(organizationId: string) {
    const [centers, cells, equipment, capacitySummary, indicators] = await Promise.all([
      this.capacity.listCenters(organizationId),
      this.prisma.emfgManufacturingCell.findMany({ where: { organizationId, isActive: true }, include: { location: true } }),
      this.prisma.emfgEquipmentProfile.count({ where: { organizationId } }),
      this.capacity.capacitySummary(organizationId),
      this.indicators.dashboard(organizationId),
    ]);

    return {
      centerCount: centers.length,
      cellCount: cells.length,
      equipmentCount: equipment,
      capacitySummary,
      indicators,
      centers,
      cells,
    };
  }
}
