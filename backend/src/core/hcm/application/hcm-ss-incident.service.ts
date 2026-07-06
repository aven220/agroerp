import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  computeIncidentClosureReady,
  generateSsKey,
  incidentRequiresInvestigation,
  validateEvidenceUpload,
  validateOfflineIncidentRow,
} from '../domain/hcm-sst.engine';
import type { HcmSsActionType, HcmSsIncidentSeverity, HcmSsIncidentStatus, HcmSsIncidentType } from '@prisma/client';

@Injectable()
export class HcmSsIncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { status?: HcmSsIncidentStatus; incidentType?: HcmSsIncidentType; employeeKey?: string }) {
    return this.prisma.hcmSsIncident.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.incidentType ? { incidentType: filters.incidentType } : {}),
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
      },
      include: { actions: true, evidences: true },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async report(organizationId: string, userId: string, input: {
    incidentType: HcmSsIncidentType; severity?: HcmSsIncidentSeverity; title: string;
    description?: string; occurredAt: string; location?: string; workCenterKey?: string;
    employeeKey?: string; reportedByKey?: string; offlineBatchKey?: string;
  }) {
    const incidentKey = generateSsKey('INC', (await this.prisma.hcmSsIncident.count({ where: { organizationId } })) + 1);
    const severity = input.severity ?? 'minor';
    const status: HcmSsIncidentStatus = incidentRequiresInvestigation(severity, input.incidentType) ? 'investigating' : 'reported';
    const incident = await this.prisma.hcmSsIncident.create({
      data: {
        organizationId, incidentKey, incidentType: input.incidentType, severity, status,
        title: input.title, description: input.description,
        occurredAt: new Date(input.occurredAt), location: input.location,
        workCenterKey: input.workCenterKey, employeeKey: input.employeeKey,
        reportedByKey: input.reportedByKey, offlineBatchKey: input.offlineBatchKey,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsIncident', incidentKey, 'reported', userId, { incidentType: input.incidentType, severity });
    await this.core.emitUserAction(organizationId, 'HcmSsIncident', incidentKey, EVENT_TYPES.HCM_SS_INCIDENT_REPORTED, input);
    return incident;
  }

  async investigate(organizationId: string, incidentKey: string, userId: string, input: {
    causes?: string; investigationNotes?: string;
  }) {
    const incident = await this.get(organizationId, incidentKey);
    const updated = await this.prisma.hcmSsIncident.update({
      where: { id: incident.id },
      data: {
        status: 'actions_pending',
        causes: input.causes,
        investigationNotes: input.investigationNotes,
      },
    });
    await this.audit.log(organizationId, 'HcmSsIncident', incidentKey, 'investigated', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsIncident', incidentKey, EVENT_TYPES.HCM_SS_INCIDENT_INVESTIGATED, input);
    return updated;
  }

  async addAction(organizationId: string, userId: string, input: {
    incidentKey: string; actionType: HcmSsActionType; title: string;
    description?: string; ownerKey?: string; dueAt?: string;
  }) {
    const actionKey = generateSsKey('IAC', (await this.prisma.hcmSsIncidentAction.count({ where: { organizationId } })) + 1);
    const action = await this.prisma.hcmSsIncidentAction.create({
      data: {
        organizationId, actionKey, incidentKey: input.incidentKey,
        actionType: input.actionType, title: input.title, description: input.description,
        ownerKey: input.ownerKey, dueAt: input.dueAt ? new Date(input.dueAt) : null, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsIncidentAction', actionKey, 'created', userId);
    return action;
  }

  async completeAction(organizationId: string, actionKey: string, userId: string) {
    const action = await this.prisma.hcmSsIncidentAction.findFirst({ where: { organizationId, actionKey } });
    if (!action) throw new NotFoundException('Acción no encontrada');
    const updated = await this.prisma.hcmSsIncidentAction.update({
      where: { id: action.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await this.audit.log(organizationId, 'HcmSsIncidentAction', actionKey, 'completed', userId);
    return updated;
  }

  async addEvidence(organizationId: string, userId: string, input: {
    incidentKey: string; fileName: string; mimeType?: string; storageKey?: string; caption?: string;
  }) {
    const check = validateEvidenceUpload(input.fileName, input.mimeType);
    if (!check.valid) throw new BadRequestException(check.reason);
    const evidenceKey = generateSsKey('EVD', (await this.prisma.hcmSsIncidentEvidence.count({ where: { organizationId } })) + 1);
    const evidence = await this.prisma.hcmSsIncidentEvidence.create({
      data: {
        organizationId, evidenceKey, incidentKey: input.incidentKey,
        fileName: input.fileName, mimeType: input.mimeType,
        storageKey: input.storageKey, caption: input.caption, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsIncidentEvidence', evidenceKey, 'uploaded', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsIncidentEvidence', evidenceKey, EVENT_TYPES.HCM_SS_EVIDENCE_UPLOADED, input);
    return evidence;
  }

  async close(organizationId: string, incidentKey: string, userId: string) {
    const incident = await this.get(organizationId, incidentKey);
    const actions = await this.prisma.hcmSsIncidentAction.findMany({ where: { organizationId, incidentKey } });
    if (!computeIncidentClosureReady(actions)) {
      throw new BadRequestException('Acciones correctivas/preventivas pendientes');
    }
    const updated = await this.prisma.hcmSsIncident.update({
      where: { id: incident.id },
      data: { status: 'closed', closedAt: new Date() },
    });
    await this.audit.log(organizationId, 'HcmSsIncident', incidentKey, 'closed', userId);
    return updated;
  }

  async syncOffline(organizationId: string, userId: string, input: {
    employeeKey: string; deviceId?: string;
    incidents: Array<{ title: string; incidentType: HcmSsIncidentType; severity?: HcmSsIncidentSeverity; occurredAt: string; description?: string; location?: string }>;
  }) {
    const batchKey = generateSsKey('BAT', (await this.prisma.hcmSsOfflineSyncBatch.count({ where: { organizationId } })) + 1);
    const results = [];
    const errors = [];
    for (const [i, row] of input.incidents.entries()) {
      const validation = validateOfflineIncidentRow(row, i);
      if (!validation.valid) { errors.push(validation); continue; }
      results.push(await this.report(organizationId, userId, {
        ...row,
        reportedByKey: input.employeeKey,
        employeeKey: input.employeeKey,
        offlineBatchKey: batchKey,
      }));
    }
    await this.prisma.hcmSsOfflineSyncBatch.create({
      data: {
        organizationId, batchKey, employeeKey: input.employeeKey,
        deviceId: input.deviceId, incidentCount: results.length,
        metadata: { errors },
      },
    });
    await this.audit.log(organizationId, 'HcmSsOfflineSyncBatch', batchKey, 'incidents_synced', userId, { count: results.length });
    return { batchKey, synced: results.length, errors, incidents: results };
  }

  private async get(organizationId: string, incidentKey: string) {
    const incident = await this.prisma.hcmSsIncident.findFirst({
      where: { organizationId, incidentKey },
      include: { actions: true, evidences: true },
    });
    if (!incident) throw new NotFoundException(`Incidente ${incidentKey} no encontrado`);
    return incident;
  }
}
