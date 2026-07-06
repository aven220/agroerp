import { Injectable, NotFoundException } from '@nestjs/common';
import { EphpSeverity } from '@agroerp/prisma-ephp-client';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpDiseaseService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  listCatalog(organizationId: string) {
    return this.prisma.ephpDiseaseCatalog.findMany({
      where: { organizationId, status: 'active' },
      include: { records: { take: 5, orderBy: { observedAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async registerCatalog(
    organizationId: string,
    data: { code: string; name: string; causalAgent?: string; symptoms?: string; affectedCrops?: string[] },
  ) {
    const count = await this.prisma.ephpDiseaseCatalog.count({ where: { organizationId } });
    const diseaseKey = generateEphpKey('DIS', count + 1);
    return this.prisma.ephpDiseaseCatalog.create({
      data: {
        organizationId, diseaseKey, code: data.code, name: data.name,
        causalAgent: data.causalAgent, symptoms: data.symptoms, affectedCrops: data.affectedCrops ?? [],
      },
    });
  }

  listRecords(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpDiseaseRecord.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { disease: true },
      orderBy: { observedAt: 'desc' },
      take: 200,
    });
  }

  async recordObservation(
    organizationId: string,
    userId: string,
    data: {
      diseaseKey: string; fieldLotId?: string; severity?: string;
      incidenceMap?: Record<string, unknown>; latitude?: number; longitude?: number;
    },
  ) {
    const disease = await this.prisma.ephpDiseaseCatalog.findFirst({ where: { organizationId, diseaseKey: data.diseaseKey } });
    if (!disease) throw new NotFoundException('Enfermedad no encontrada');
    const count = await this.prisma.ephpDiseaseRecord.count({ where: { organizationId } });
    const recordKey = generateEphpKey('DRD', count + 1);
    const row = await this.prisma.ephpDiseaseRecord.create({
      data: {
        organizationId, recordKey, diseaseId: disease.id, fieldLotId: data.fieldLotId,
        severity: (data.severity ?? 'medium') as EphpSeverity, incidenceMap: (data.incidenceMap ?? {}) as object,
        latitude: data.latitude, longitude: data.longitude, recordedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EphpDiseaseRecord', recordKey, 'disease_recorded', userId);
    return row;
  }
}
