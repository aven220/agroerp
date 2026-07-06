import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FarmsService } from '@/core/ftip/application/farms.service';

@Injectable()
export class EatpFarmService {
  constructor(
    private readonly farms: FarmsService,
    private readonly prisma: PrismaService,
  ) {}

  list(organizationId: string, filters?: { status?: string; search?: string }) {
    return this.farms.findAll(organizationId, {
      status: filters?.status as never,
      search: filters?.search,
      limit: 200,
    });
  }

  get(organizationId: string, farmId: string) {
    return this.farms.findOne(organizationId, farmId);
  }

  async dashboard(organizationId: string) {
    const [farms, parcels, zones] = await Promise.all([
      this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.farmParcel.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.farmLot.count({ where: { organizationId, deletedAt: null } }),
    ]);
    return { activeFarms: farms, parcels, catalogLots: zones };
  }

  listSectors(organizationId: string, farmUnitId: string) {
    return this.prisma.farmParcel.findMany({
      where: { organizationId, farmUnitId, deletedAt: null },
      orderBy: { parcelCode: 'asc' },
    });
  }
}
