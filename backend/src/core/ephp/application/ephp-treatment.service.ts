import { Injectable, NotFoundException } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { EPHP_TREATMENT_TYPES, generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';
import { EphpIntervalService } from './ephp-compliance.service';

@Injectable()
export class EphpTreatmentService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  types() { return EPHP_TREATMENT_TYPES; }

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpTreatment.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { applications: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async schedule(
    organizationId: string,
    userId: string,
    data: {
      name: string; treatmentType: string; fieldLotId?: string; targetType?: string; targetKey?: string;
      scheduledAt?: Date; isPreventive?: boolean; metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.ephpTreatment.count({ where: { organizationId } });
    const treatmentKey = generateEphpKey('TRT', count + 1);
    const row = await this.prisma.ephpTreatment.create({
      data: {
        organizationId, treatmentKey, name: data.name, treatmentType: data.treatmentType,
        fieldLotId: data.fieldLotId, targetType: data.targetType, targetKey: data.targetKey,
        scheduledAt: data.scheduledAt, isPreventive: data.isPreventive ?? false,
        createdBy: userId, metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EphpTreatment', treatmentKey, 'treatment_scheduled', userId);
    return row;
  }

  async complete(organizationId: string, userId: string, treatmentKey: string) {
    const row = await this.prisma.ephpTreatment.findFirst({ where: { organizationId, treatmentKey } });
    if (!row) throw new NotFoundException('Tratamiento no encontrado');
    await this.prisma.ephpTreatment.update({ where: { id: row.id }, data: { status: 'completed' } });
    await this.audit.log(organizationId, 'EphpTreatment', treatmentKey, 'treatment_applied', userId);
    return { completed: true, treatmentKey };
  }
}

@Injectable()
export class EphpApplicationService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
    private readonly intervals: EphpIntervalService,
  ) {}

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpApplication.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { treatment: true },
      orderBy: { appliedAt: 'desc' },
      take: 500,
    });
  }

  async record(
    organizationId: string,
    userId: string,
    data: {
      treatmentKey?: string; productName: string; activeIngredient?: string;
      dose?: number; doseUnit?: string; volumeL?: number; equipment?: string;
      climateConditions?: Record<string, unknown>; fieldLotId?: string; cropCode?: string;
      appliedAt?: Date;
    },
  ) {
    let treatmentId: string | undefined;
    if (data.treatmentKey) {
      const t = await this.prisma.ephpTreatment.findFirst({ where: { organizationId, treatmentKey: data.treatmentKey } });
      treatmentId = t?.id;
    }
    const count = await this.prisma.ephpApplication.count({ where: { organizationId } });
    const applicationKey = generateEphpKey('APL', count + 1);
    const row = await this.prisma.ephpApplication.create({
      data: {
        organizationId, applicationKey, treatmentId, productName: data.productName,
        activeIngredient: data.activeIngredient, dose: data.dose, doseUnit: data.doseUnit,
        volumeL: data.volumeL, equipment: data.equipment, operatorId: userId,
        climateConditions: (data.climateConditions ?? {}) as object,
        appliedAt: data.appliedAt ?? new Date(), fieldLotId: data.fieldLotId, cropCode: data.cropCode,
      },
    });
    await this.audit.log(organizationId, 'EphpApplication', applicationKey, 'application_recorded', userId);
    await this.intervals.generateFromApplication(organizationId, userId, {
      applicationId: row.id,
      fieldLotId: data.fieldLotId,
      productName: data.productName,
      appliedAt: row.appliedAt,
    });
    return row;
  }
}
