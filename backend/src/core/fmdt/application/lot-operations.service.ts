import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { calculatePolygonAreaHa } from '@/core/ftip/application/geometry.util';
import { LotsService } from './lots.service';
import { LotTwinService } from './lot-twin.service';
import { CreateFieldOperationDto } from '../presentation/lots.dto';

@Injectable()
export class LotOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly lots: LotsService,
    private readonly twin: LotTwinService,
  ) {}

  async list(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.fieldOperation.findMany({
      where: { fieldLotId, organizationId, deletedAt: null },
      orderBy: { operationDate: 'desc' },
    });
  }

  async create(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: CreateFieldOperationDto,
    ctx?: RequestContext,
  ) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    if (!['active', 'renovation'].includes(lot.status)) {
      throw new UnprocessableEntityException('Lote no admite labores en este estado');
    }

    const maxArea = Number(lot.plantedAreaHa ?? lot.totalAreaHa ?? 0);
    if (dto.areaTreatedHa > maxArea) {
      throw new UnprocessableEntityException('Área tratada excede área del lote');
    }

    if (dto.externalId) {
      const dup = await this.prisma.fieldOperation.findFirst({
        where: { organizationId, externalId: dto.externalId },
      });
      if (dup) return dup;
    }

    const totalCost =
      (dto.laborCost ?? 0) +
      (dto.inputCost ?? 0) +
      (dto.equipmentCost ?? 0) +
      (dto.transportCost ?? 0);

    const operation = await this.prisma.fieldOperation.create({
      data: {
        organizationId,
        fieldLotId,
        operationTypeCode: dto.operationTypeCode,
        operationDate: new Date(dto.operationDate),
        performedByType: dto.performedByType ?? 'technician',
        performerIds: dto.performerIds ?? [userId],
        areaTreatedHa: dto.areaTreatedHa,
        managementZoneOpId: dto.managementZoneOpId,
        inputsUsed: (dto.inputsUsed ?? []) as Prisma.InputJsonValue,
        equipmentUsed: (dto.equipmentUsed ?? []) as Prisma.InputJsonValue,
        weatherConditions: (dto.weatherConditions ?? {}) as Prisma.InputJsonValue,
        laborCost: dto.laborCost,
        inputCost: dto.inputCost,
        equipmentCost: dto.equipmentCost,
        transportCost: dto.transportCost,
        totalCost,
        gpsGeo: dto.gpsGeo as Prisma.InputJsonValue,
        visitId: dto.visitId,
        formSubmissionId: dto.formSubmissionId,
        evidenceDocumentIds: dto.evidenceDocumentIds ?? [],
        signatureContentId: dto.signatureContentId,
        notes: dto.notes,
        externalId: dto.externalId,
        recordedBy: userId,
      },
    });

    if (totalCost > 0) {
      await this.prisma.lotCostEntry.create({
        data: {
          organizationId,
          fieldLotId,
          campaignCode: dto.campaignCode ?? new Date().getFullYear().toString(),
          costCategoryCode: 'labor',
          amount: totalCost,
          sourceType: 'labor',
          fieldOperationId: operation.id,
          description: `Labor ${dto.operationTypeCode}`,
          approvalStatus: 'approved',
          costDate: new Date(dto.operationDate),
          createdBy: userId,
        },
      });
    }

    if (dto.gpsGeo && dto.gpsGeo.type === 'Polygon') {
      const area = calculatePolygonAreaHa(dto.gpsGeo as Record<string, unknown>);
      await this.prisma.lotGeometryRevision.create({
        data: {
          organizationId,
          fieldLotId,
          entityType: 'FieldOperation',
          entityId: operation.id,
          toGeometry: dto.gpsGeo as Prisma.InputJsonValue,
          toAreaHa: area,
          reasonNotes: 'Geometría aplicación labor',
          actorId: userId,
        },
      });
    }

    await this.prisma.fieldLotProfile.update({
      where: { id: fieldLotId },
      data: { lastOperationAt: new Date(), updatedBy: userId },
    });

    await this.twin.refresh(organizationId, fieldLotId, ctx);
    await this.core.emitFieldOperationRecorded(
      organizationId,
      operation.id,
      { fieldLotId, operationTypeCode: dto.operationTypeCode },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return operation;
  }

  async verify(organizationId: string, operationId: string, userId: string) {
    const op = await this.prisma.fieldOperation.findFirst({
      where: { id: operationId, organizationId },
    });
    if (!op) throw new UnprocessableEntityException('Operación no encontrada');

    return this.prisma.fieldOperation.update({
      where: { id: operationId },
      data: {
        status: 'verified',
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    });
  }

  async voidOperation(
    organizationId: string,
    operationId: string,
    userId: string,
    reason: string,
  ) {
    const op = await this.prisma.fieldOperation.findFirst({
      where: { id: operationId, organizationId },
    });
    if (!op) throw new UnprocessableEntityException('Operación no encontrada');

    const updated = await this.prisma.fieldOperation.update({
      where: { id: operationId },
      data: {
        status: 'voided',
        voidReason: reason,
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    });

    await this.twin.refresh(organizationId, op.fieldLotId);
    return updated;
  }
}
