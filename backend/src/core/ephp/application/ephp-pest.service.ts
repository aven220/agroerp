import { Injectable, NotFoundException } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { EPHP_INFESTATION_LEVELS, EPHP_PEST_CLASSIFICATIONS, generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpPestService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  classifications() { return EPHP_PEST_CLASSIFICATIONS; }
  infestationLevels() { return EPHP_INFESTATION_LEVELS; }

  listCatalog(organizationId: string) {
    return this.prisma.ephpPestCatalog.findMany({
      where: { organizationId, status: 'active' },
      include: { records: { take: 5, orderBy: { observedAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async registerCatalog(
    organizationId: string,
    data: { code: string; name: string; classification: string; biologicalCycle?: string; affectedCrops?: string[] },
  ) {
    const count = await this.prisma.ephpPestCatalog.count({ where: { organizationId } });
    const pestKey = generateEphpKey('PST', count + 1);
    return this.prisma.ephpPestCatalog.create({
      data: {
        organizationId, pestKey, code: data.code, name: data.name,
        classification: data.classification, biologicalCycle: data.biologicalCycle,
        affectedCrops: data.affectedCrops ?? [],
      },
    });
  }

  listRecords(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpPestRecord.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { pest: true },
      orderBy: { observedAt: 'desc' },
      take: 200,
    });
  }

  async recordObservation(
    organizationId: string,
    userId: string,
    data: {
      pestKey: string; fieldLotId?: string; infestationLevel: string;
      latitude?: number; longitude?: number; metadata?: Record<string, unknown>;
    },
  ) {
    const pest = await this.prisma.ephpPestCatalog.findFirst({ where: { organizationId, pestKey: data.pestKey } });
    if (!pest) throw new NotFoundException('Plaga no encontrada');
    const count = await this.prisma.ephpPestRecord.count({ where: { organizationId } });
    const recordKey = generateEphpKey('PRD', count + 1);
    const row = await this.prisma.ephpPestRecord.create({
      data: {
        organizationId, recordKey, pestId: pest.id, fieldLotId: data.fieldLotId,
        infestationLevel: data.infestationLevel, latitude: data.latitude, longitude: data.longitude,
        recordedBy: userId, metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EphpPestRecord', recordKey, 'pest_recorded', userId);
    return row;
  }
}
