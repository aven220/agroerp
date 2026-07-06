import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { EatpAuditService } from './eatp-audit.service';
import { EATP_LABOR_TYPES, generateEatpKey, mapLaborToFmdt } from '../domain/eatp.engine';

@Injectable()
export class EatpLaborService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eatpPrisma: EatpPrismaService,
    private readonly lots: LotsService,
    private readonly audit: EatpAuditService,
  ) {}

  catalog() {
    return EATP_LABOR_TYPES;
  }

  listTasks(organizationId: string, fieldLotId?: string) {
    return this.eatpPrisma.eatpFieldTask.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { scheduledDate: 'desc' },
      take: 200,
    });
  }

  async createTask(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId?: string;
      campaignId?: string;
      laborType: string;
      title: string;
      scheduledDate?: Date;
      crewIds?: string[];
      equipmentIds?: string[];
      inputsPlanned?: unknown[];
      areaTreatedHa?: number;
      notes?: string;
      externalId?: string;
    },
  ) {
    const count = await this.eatpPrisma.eatpFieldTask.count({ where: { organizationId } });
    const taskKey = generateEatpKey('TSK', count + 1);
    const row = await this.eatpPrisma.eatpFieldTask.create({
      data: {
        organizationId,
        taskKey,
        fieldLotId: data.fieldLotId,
        campaignId: data.campaignId,
        laborType: data.laborType,
        title: data.title,
        scheduledDate: data.scheduledDate,
        crewIds: data.crewIds ?? [],
        equipmentIds: data.equipmentIds ?? [],
        inputsPlanned: (data.inputsPlanned ?? []) as object,
        areaTreatedHa: data.areaTreatedHa,
        notes: data.notes,
        externalId: data.externalId,
        recordedBy: userId,
        status: data.scheduledDate ? 'scheduled' : 'pending',
      },
    });
    await this.audit.log(organizationId, 'FieldTask', taskKey, 'labor_scheduled', userId);
    return row;
  }

  async recordLabor(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId: string;
      laborType: string;
      operationDate: string;
      areaTreatedHa: number;
      inputsUsed?: unknown[];
      equipmentUsed?: unknown[];
      notes?: string;
      photoRefs?: string[];
      externalId?: string;
      gpsGeo?: Record<string, unknown>;
    },
  ) {
    const lot = await this.lots.findOne(organizationId, data.fieldLotId);
    if (!['active', 'renovation'].includes(lot.status)) {
      throw new UnprocessableEntityException('Lote no admite labores en este estado');
    }
    const maxArea = Number(lot.plantedAreaHa ?? lot.totalAreaHa ?? 0);
    if (data.areaTreatedHa > maxArea && maxArea > 0) {
      throw new UnprocessableEntityException('Área tratada excede área del lote');
    }

    if (data.externalId) {
      const dup = await this.prisma.fieldOperation.findFirst({
        where: { organizationId, externalId: data.externalId },
      });
      if (dup) return { fieldOperation: dup, task: null };
    }

    const operationTypeCode = mapLaborToFmdt(data.laborType);
    const operation = await this.prisma.fieldOperation.create({
      data: {
        organizationId,
        fieldLotId: data.fieldLotId,
        operationTypeCode,
        operationDate: new Date(data.operationDate),
        performedByType: 'technician',
        performerIds: [userId],
        areaTreatedHa: data.areaTreatedHa,
        inputsUsed: (data.inputsUsed ?? []) as Prisma.InputJsonValue,
        equipmentUsed: (data.equipmentUsed ?? []) as Prisma.InputJsonValue,
        notes: data.notes,
        evidenceDocumentIds: data.photoRefs ?? [],
        gpsGeo: data.gpsGeo as Prisma.InputJsonValue,
        externalId: data.externalId,
        recordedBy: userId,
        status: 'recorded',
      },
    });

    await this.prisma.fieldLotProfile.update({
      where: { id: data.fieldLotId },
      data: { lastOperationAt: new Date() },
    });

    const count = await this.eatpPrisma.eatpFieldTask.count({ where: { organizationId } });
    const task = await this.eatpPrisma.eatpFieldTask.create({
      data: {
        organizationId,
        taskKey: generateEatpKey('TSK', count + 1),
        fieldLotId: data.fieldLotId,
        laborType: data.laborType,
        title: data.laborType,
        completedDate: new Date(data.operationDate),
        status: 'completed',
        inputsUsed: (data.inputsUsed ?? []) as object,
        areaTreatedHa: data.areaTreatedHa,
        photoRefs: data.photoRefs ?? [],
        fieldOperationId: operation.id,
        externalId: data.externalId,
        recordedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'FieldOperation', operation.id, 'labor_recorded', userId, {
      laborType: data.laborType,
    });
    return { fieldOperation: operation, task };
  }
}
