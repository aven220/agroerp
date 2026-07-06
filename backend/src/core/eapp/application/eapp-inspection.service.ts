import { Injectable } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { generateEappKey } from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappInspectionService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly audit: EappAuditService,
  ) {}

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.eappFieldInspection.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { inspectedAt: 'desc' },
      take: 200,
    });
  }

  async record(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      photoRefs?: string[];
      findings?: unknown[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappFieldInspection.count({ where: { organizationId } });
    const inspectionKey = generateEappKey('INS', count + 1);
    const row = await this.prisma.eappFieldInspection.create({
      data: {
        organizationId,
        inspectionKey,
        fieldLotId: data.fieldLotId,
        inspectorId: userId,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        photoRefs: data.photoRefs ?? [],
        findings: (data.findings ?? []) as object,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EappFieldInspection', inspectionKey, 'inspection_recorded', userId, {
      fieldLotId: data.fieldLotId,
    });
    return row;
  }
}
