import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  DEFAULT_SS_CHECKLIST,
  generateSsKey,
  mergeBulkInspections,
  validateInspectionChecklist,
} from '../domain/hcm-sst.engine';
import type { HcmSsFindingSeverity, HcmSsInspectionType } from '@prisma/client';

@Injectable()
export class HcmSsInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { status?: string; inspectionType?: HcmSsInspectionType }) {
    return this.prisma.hcmSsInspection.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.inspectionType ? { inspectionType: filters.inspectionType } : {}),
      },
      include: { findings: true, actions: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, input: {
    inspectionType: HcmSsInspectionType; title: string; location?: string;
    workCenterKey?: string; inspectorKey?: string; scheduledAt?: string;
    checklist?: Array<{ itemKey: string; label: string; checked?: boolean }>;
    offlineBatchKey?: string;
  }) {
    const inspectionKey = generateSsKey('INS', (await this.prisma.hcmSsInspection.count({ where: { organizationId } })) + 1);
    const checklist = input.checklist ?? DEFAULT_SS_CHECKLIST.map((c) => ({ ...c, checked: false }));
    const inspection = await this.prisma.hcmSsInspection.create({
      data: {
        organizationId, inspectionKey, inspectionType: input.inspectionType,
        title: input.title, location: input.location, workCenterKey: input.workCenterKey,
        inspectorKey: input.inspectorKey,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        checklist, status: 'in_progress', offlineBatchKey: input.offlineBatchKey, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsInspection', inspectionKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsInspection', inspectionKey, EVENT_TYPES.HCM_SS_INSPECTION_CREATED, input);
    return inspection;
  }

  async addFinding(organizationId: string, userId: string, input: {
    inspectionKey: string; description: string; severity?: HcmSsFindingSeverity;
    checklistItem?: string; photoKey?: string;
  }) {
    const findingKey = generateSsKey('FND', (await this.prisma.hcmSsInspectionFinding.count({ where: { organizationId } })) + 1);
    const finding = await this.prisma.hcmSsInspectionFinding.create({
      data: {
        organizationId, findingKey, inspectionKey: input.inspectionKey,
        description: input.description, severity: input.severity ?? 'medium',
        checklistItem: input.checklistItem, photoKey: input.photoKey,
      },
    });
    await this.audit.log(organizationId, 'HcmSsInspectionFinding', findingKey, 'created', userId);
    return finding;
  }

  async addAction(organizationId: string, input: {
    inspectionKey: string; title: string; ownerKey?: string; dueAt?: string;
  }) {
    const actionKey = generateSsKey('IAC', (await this.prisma.hcmSsInspectionAction.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsInspectionAction.create({
      data: {
        organizationId, actionKey, inspectionKey: input.inspectionKey,
        title: input.title, ownerKey: input.ownerKey,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      },
    });
  }

  async complete(organizationId: string, inspectionKey: string, userId: string, checklist?: Array<{ itemKey: string; label: string; checked?: boolean }>) {
    const inspection = await this.prisma.hcmSsInspection.findFirst({ where: { organizationId, inspectionKey } });
    if (!inspection) throw new NotFoundException('Inspección no encontrada');
    const items = checklist ?? (inspection.checklist as Array<{ itemKey: string; checked?: boolean }>);
    const stats = validateInspectionChecklist(items);
    const updated = await this.prisma.hcmSsInspection.update({
      where: { id: inspection.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        checklist: items,
        metadata: { checklistStats: stats },
      },
    });
    await this.audit.log(organizationId, 'HcmSsInspection', inspectionKey, 'completed', userId, stats);
    await this.core.emitUserAction(organizationId, 'HcmSsInspection', inspectionKey, EVENT_TYPES.HCM_SS_INSPECTION_COMPLETED, stats);
    return updated;
  }

  async bulkCreate(organizationId: string, userId: string, rows: Array<{
    inspectionType: HcmSsInspectionType; title: string; location?: string; scheduledAt?: string;
  }>) {
    const prepared = rows.map((r, i) => ({ ...r, inspectionKey: generateSsKey('INS', Date.now() % 100000 + i) }));
    const uniqueKeys = new Set(mergeBulkInspections(prepared).map((r) => r.inspectionKey));
    const unique = prepared.filter((r) => uniqueKeys.has(r.inspectionKey));
    const results = [];
    for (const row of unique) {
      const { inspectionKey: _key, ...payload } = row;
      results.push(await this.create(organizationId, userId, payload));
    }
    await this.audit.log(organizationId, 'HcmSsInspection', 'bulk', 'created', userId, { count: results.length });
    return { created: results.length, inspections: results };
  }

  async syncOffline(organizationId: string, userId: string, input: {
    employeeKey: string; deviceId?: string;
    inspections: Array<{
      inspectionType: HcmSsInspectionType; title: string; location?: string;
      findings?: Array<{ description: string; severity?: HcmSsFindingSeverity; photoKey?: string }>;
      checklist?: Array<{ itemKey: string; label: string; checked?: boolean }>;
    }>;
  }) {
    const batchKey = generateSsKey('BAT', (await this.prisma.hcmSsOfflineSyncBatch.count({ where: { organizationId } })) + 1);
    const results = [];
    for (const row of input.inspections) {
      const inspection = await this.create(organizationId, userId, {
        ...row,
        inspectorKey: input.employeeKey,
        offlineBatchKey: batchKey,
      });
      for (const f of row.findings ?? []) {
        await this.addFinding(organizationId, userId, { inspectionKey: inspection.inspectionKey, ...f });
      }
      await this.complete(organizationId, inspection.inspectionKey, userId, row.checklist);
      results.push(inspection);
    }
    await this.prisma.hcmSsOfflineSyncBatch.create({
      data: {
        organizationId, batchKey, employeeKey: input.employeeKey,
        deviceId: input.deviceId, inspectionCount: results.length,
      },
    });
    await this.audit.log(organizationId, 'HcmSsOfflineSyncBatch', batchKey, 'inspections_synced', userId, { count: results.length });
    return { batchKey, synced: results.length, inspections: results };
  }
}
