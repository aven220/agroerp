import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgQmsEvidenceType, EmfgQmsInspectionResult, EmfgQmsInspectionType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { deriveInspectionResult, evaluateMeasurement } from '../domain/emfg-qms.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgQmsIntegrationService } from './emfg-qms-integration.service';

@Injectable()
export class EmfgQmsInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgQmsIntegrationService,
  ) {}

  list(organizationId: string, filters?: { inspectionType?: EmfgQmsInspectionType; result?: EmfgQmsInspectionResult }) {
    return this.prisma.emfgQmsInspection.findMany({
      where: {
        organizationId,
        ...(filters?.inspectionType ? { inspectionType: filters.inspectionType } : {}),
        ...(filters?.result ? { result: filters.result } : {}),
      },
      include: { measurements: true, evidences: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  get(organizationId: string, inspectionKey: string) {
    return this.prisma.emfgQmsInspection.findUnique({
      where: { organizationId_inspectionKey: { organizationId, inspectionKey } },
      include: { measurements: true, evidences: true, plan: { include: { criteria: true } } },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    inspectionType: EmfgQmsInspectionType;
    planKey?: string;
    itemKey?: string;
    lotKey?: string;
    orderKey?: string;
    supplierKey?: string;
    purchaseKey?: string;
    lineKey?: string;
    inspectorKey?: string;
    notes?: string;
  }) {
    const seq = await this.prisma.emfgQmsInspection.count({ where: { organizationId } });
    const inspectionKey = generateEmfgKey('QI', seq + 1);

    const inspection = await this.prisma.emfgQmsInspection.create({
      data: {
        organizationId,
        inspectionKey,
        planKey: payload.planKey,
        inspectionType: payload.inspectionType,
        itemKey: payload.itemKey,
        lotKey: payload.lotKey,
        orderKey: payload.orderKey,
        supplierKey: payload.supplierKey,
        purchaseKey: payload.purchaseKey,
        lineKey: payload.lineKey,
        inspectorKey: payload.inspectorKey,
        notes: payload.notes,
        inspectedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgQmsInspection', inspectionKey, 'created', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgQmsInspection', inspectionKey, EVENT_TYPES.EMFG_QMS_INSPECTION_CREATED, payload);
    return inspection;
  }

  async addMeasurement(organizationId: string, userId: string, inspectionKey: string, payload: {
    criterionKey?: string; name: string; value: number; unit?: string;
    minValue?: number; maxValue?: number;
  }) {
    const inspection = await this.get(organizationId, inspectionKey);
    if (!inspection) throw new NotFoundException('inspection_not_found');

    let min = payload.minValue;
    let max = payload.maxValue;
    if (payload.criterionKey) {
      const crit = inspection.plan?.criteria.find((c) => c.criterionKey === payload.criterionKey);
      if (crit) { min = crit.minValue ?? min; max = crit.maxValue ?? max; }
    }
    const passed = evaluateMeasurement(payload.value, { minValue: min, maxValue: max });

    const seq = await this.prisma.emfgQmsInspectionMeasurement.count({ where: { organizationId } });
    const measurementKey = generateEmfgKey('QM', seq + 1);

    return this.prisma.emfgQmsInspectionMeasurement.create({
      data: {
        organizationId,
        measurementKey,
        inspectionKey,
        criterionKey: payload.criterionKey,
        name: payload.name,
        value: payload.value,
        unit: payload.unit,
        passed,
        recordedBy: userId,
      },
    });
  }

  async addEvidence(organizationId: string, userId: string, inspectionKey: string, payload: {
    evidenceType: EmfgQmsEvidenceType; value: string; storageUrl?: string;
  }) {
    const inspection = await this.get(organizationId, inspectionKey);
    if (!inspection) throw new NotFoundException('inspection_not_found');

    const seq = await this.prisma.emfgQmsInspectionEvidence.count({ where: { organizationId } });
    const evidenceKey = generateEmfgKey('QE', seq + 1);

    return this.prisma.emfgQmsInspectionEvidence.create({
      data: {
        organizationId,
        evidenceKey,
        inspectionKey,
        evidenceType: payload.evidenceType,
        value: payload.value,
        storageUrl: payload.storageUrl,
        uploadedBy: userId,
      },
    });
  }

  async complete(organizationId: string, userId: string, inspectionKey: string, forceResult?: EmfgQmsInspectionResult) {
    const inspection = await this.get(organizationId, inspectionKey);
    if (!inspection) throw new NotFoundException('inspection_not_found');
    if (inspection.result !== 'pending') throw new BadRequestException('inspection_already_completed');

    const derived = forceResult ?? deriveInspectionResult(inspection.measurements);
    const result = derived as EmfgQmsInspectionResult;

    const updated = await this.prisma.emfgQmsInspection.update({
      where: { organizationId_inspectionKey: { organizationId, inspectionKey } },
      data: { result, inspectedAt: new Date(), inspectedBy: userId },
    });

    await this.audit.log(organizationId, 'EmfgQmsInspection', inspectionKey, 'inspected', userId, { result });
    await this.core.emitUserAction(organizationId, 'EmfgQmsInspection', inspectionKey, EVENT_TYPES.EMFG_QMS_INSPECTION_COMPLETED, {
      result, lotKey: inspection.lotKey, orderKey: inspection.orderKey,
    });
    await this.integration.onInspectionCompleted(organizationId, inspectionKey, result, {
      lotKey: inspection.lotKey,
      orderKey: inspection.orderKey,
      itemKey: inspection.itemKey,
      supplierKey: inspection.supplierKey,
      purchaseKey: inspection.purchaseKey,
    });

    if (result === 'fail' && inspection.lotKey) {
      await this.integration.ensureLotReleasePending(organizationId, inspection.lotKey, inspection.itemKey ?? '', inspection.orderKey);
    }

    return updated;
  }
}
