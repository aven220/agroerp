import { Injectable, NotFoundException } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EAPP_THEMATIC_MAP_TYPES, generateEappKey } from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappThematicService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly audit: EappAuditService,
  ) {}

  mapTypes() {
    return EAPP_THEMATIC_MAP_TYPES;
  }

  list(organizationId: string, mapType?: string, fieldLotId?: string) {
    return this.prisma.eappThematicMap.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(mapType ? { mapType } : {}),
        ...(fieldLotId ? { fieldLotId } : {}),
      },
      orderBy: { effectiveDate: 'desc' },
      take: 200,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      mapType: string;
      fieldLotId?: string;
      campaignKey?: string;
      effectiveDate?: Date;
      geometry?: Record<string, unknown>;
      style?: Record<string, unknown>;
      isHistorical?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappThematicMap.count({ where: { organizationId } });
    const mapKey = generateEappKey('MAP', count + 1);
    const row = await this.prisma.eappThematicMap.create({
      data: {
        organizationId,
        mapKey,
        name: data.name,
        mapType: data.mapType,
        fieldLotId: data.fieldLotId,
        campaignKey: data.campaignKey,
        effectiveDate: data.effectiveDate,
        geometry: (data.geometry ?? {}) as object,
        style: (data.style ?? {}) as object,
        isHistorical: data.isHistorical ?? false,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EappThematicMap', mapKey, 'map_edited', userId, { mapType: data.mapType });
    return row;
  }

  async get(organizationId: string, mapKey: string) {
    const row = await this.prisma.eappThematicMap.findFirst({ where: { organizationId, mapKey } });
    if (!row) throw new NotFoundException('Mapa temático no encontrado');
    return row;
  }
}
