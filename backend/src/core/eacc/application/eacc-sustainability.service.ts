import { Injectable } from '@nestjs/common';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { EACC_ESG_PILLARS, EACC_FOOTPRINT_TYPES, EACC_SUSTAINABILITY_CATEGORIES, generateEaccKey } from '../domain/eacc.engine';
import { EaccAuditService } from './eacc-audit.service';

@Injectable()
export class EaccSustainabilityService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  listIndicators(organizationId: string, category?: string) {
    return this.prisma.eaccSustainabilityIndicator.findMany({
      where: { organizationId, status: 'active', ...(category ? { category } : {}) },
      include: { records: { take: 10, orderBy: { recordedAt: 'desc' } } },
    });
  }

  async registerIndicator(
    organizationId: string,
    data: { category: string; name: string; unit?: string; targetValue?: number },
  ) {
    const count = await this.prisma.eaccSustainabilityIndicator.count({ where: { organizationId } });
    const indicatorKey = generateEaccKey('SUS', count + 1);
    return this.prisma.eaccSustainabilityIndicator.create({
      data: { organizationId, indicatorKey, category: data.category, name: data.name, unit: data.unit, targetValue: data.targetValue },
    });
  }

  async recordSustainability(
    organizationId: string,
    userId: string,
    data: { indicatorId: string; value: number; fieldLotId?: string },
  ) {
    const count = await this.prisma.eaccSustainabilityRecord.count({ where: { organizationId } });
    const recordKey = generateEaccKey('SUR', count + 1);
    const row = await this.prisma.eaccSustainabilityRecord.create({
      data: { organizationId, recordKey, indicatorId: data.indicatorId, value: data.value, fieldLotId: data.fieldLotId, recordedBy: userId },
    });
    await this.audit.log(organizationId, 'EaccSustainabilityRecord', recordKey, 'sustainability_recorded', userId);
    return row;
  }

  listEsgIndicators(organizationId: string, pillar?: string) {
    return this.prisma.eaccEsgIndicator.findMany({
      where: { organizationId, status: 'active', ...(pillar ? { pillar } : {}) },
    });
  }

  async registerEsgIndicator(
    organizationId: string,
    data: { pillar: string; name: string; unit?: string; targetValue?: number; currentValue?: number },
  ) {
    const count = await this.prisma.eaccEsgIndicator.count({ where: { organizationId } });
    const indicatorKey = generateEaccKey('ESG', count + 1);
    return this.prisma.eaccEsgIndicator.create({
      data: {
        organizationId, indicatorKey, pillar: data.pillar, name: data.name,
        unit: data.unit, targetValue: data.targetValue, currentValue: data.currentValue,
      },
    });
  }

  listEsgObjectives(organizationId: string) {
    return this.prisma.eaccEsgObjective.findMany({ where: { organizationId }, orderBy: { dueDate: 'asc' } });
  }

  async setEsgObjective(
    organizationId: string,
    userId: string,
    data: { pillar: string; title: string; targetValue?: number; dueDate?: string },
  ) {
    const count = await this.prisma.eaccEsgObjective.count({ where: { organizationId } });
    const objectiveKey = generateEaccKey('OBJ', count + 1);
    const row = await this.prisma.eaccEsgObjective.create({
      data: {
        organizationId, objectiveKey, pillar: data.pillar, title: data.title,
        targetValue: data.targetValue, dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: 'in_progress',
      },
    });
    await this.audit.log(organizationId, 'EaccEsgObjective', objectiveKey, 'esg_objective_set', userId);
    return row;
  }

  async generateEsgReport(organizationId: string, userId: string, data: { title: string; periodStart?: string; periodEnd?: string }) {
    const [indicators, objectives] = await Promise.all([
      this.listEsgIndicators(organizationId),
      this.listEsgObjectives(organizationId),
    ]);
    const count = await this.prisma.eaccEsgReport.count({ where: { organizationId } });
    const reportKey = generateEaccKey('RPT', count + 1);
    const row = await this.prisma.eaccEsgReport.create({
      data: {
        organizationId, reportKey, title: data.title, generatedBy: userId,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        results: { indicators, objectives } as object,
      },
    });
    await this.audit.log(organizationId, 'EaccEsgReport', reportKey, 'esg_report_generated', userId);
    return row;
  }

  listEsgReports(organizationId: string) {
    return this.prisma.eaccEsgReport.findMany({ where: { organizationId }, orderBy: { generatedAt: 'desc' } });
  }

  listFootprintConfigs(organizationId: string, footprintType?: string) {
    return this.prisma.eaccFootprintConfig.findMany({
      where: { organizationId, status: 'active', ...(footprintType ? { footprintType } : {}) },
      include: { records: { take: 10, orderBy: { recordedAt: 'desc' } } },
    });
  }

  async registerFootprintConfig(
    organizationId: string,
    data: { footprintType: string; name: string; calculationRef?: string; unit?: string },
  ) {
    const count = await this.prisma.eaccFootprintConfig.count({ where: { organizationId } });
    const configKey = generateEaccKey('FPC', count + 1);
    return this.prisma.eaccFootprintConfig.create({
      data: {
        organizationId, configKey, footprintType: data.footprintType, name: data.name,
        calculationRef: data.calculationRef, unit: data.unit,
      },
    });
  }

  async recordFootprint(
    organizationId: string,
    userId: string,
    data: { configId: string; value: number; offsetValue?: number; fieldLotId?: string },
  ) {
    const count = await this.prisma.eaccFootprintRecord.count({ where: { organizationId } });
    const recordKey = generateEaccKey('FPR', count + 1);
    const row = await this.prisma.eaccFootprintRecord.create({
      data: {
        organizationId, recordKey, configId: data.configId, value: data.value,
        offsetValue: data.offsetValue, fieldLotId: data.fieldLotId, recordedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EaccFootprintRecord', recordKey, 'footprint_recorded', userId);
    return row;
  }

  sustainabilityCategories() { return EACC_SUSTAINABILITY_CATEGORIES; }
  esgPillars() { return EACC_ESG_PILLARS; }
  footprintTypes() { return EACC_FOOTPRINT_TYPES; }
}

@Injectable()
export class EaccSafetyService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  listTrainings(organizationId: string) {
    return this.prisma.eaccSafetyTraining.findMany({ where: { organizationId }, orderBy: { conductedAt: 'desc' } });
  }

  async recordTraining(organizationId: string, data: { title: string; trainerName?: string; trainedCount?: number }) {
    const count = await this.prisma.eaccSafetyTraining.count({ where: { organizationId } });
    const trainingKey = generateEaccKey('TRN', count + 1);
    return this.prisma.eaccSafetyTraining.create({
      data: { organizationId, trainingKey, title: data.title, trainerName: data.trainerName, trainedCount: data.trainedCount ?? 0 },
    });
  }

  listPpeDeliveries(organizationId: string) {
    return this.prisma.eaccPpeDelivery.findMany({ where: { organizationId }, orderBy: { deliveredAt: 'desc' } });
  }

  async recordPpeDelivery(organizationId: string, data: { ppeType: string; employeeRef?: string; quantity?: number; deliveredBy?: string }) {
    const count = await this.prisma.eaccPpeDelivery.count({ where: { organizationId } });
    const deliveryKey = generateEaccKey('PPE', count + 1);
    return this.prisma.eaccPpeDelivery.create({
      data: { organizationId, deliveryKey, ppeType: data.ppeType, employeeRef: data.employeeRef, quantity: data.quantity ?? 1, deliveredBy: data.deliveredBy },
    });
  }

  listIncidents(organizationId: string) {
    return this.prisma.eaccSafetyIncident.findMany({ where: { organizationId }, orderBy: { occurredAt: 'desc' } });
  }

  async recordIncident(
    organizationId: string,
    userId: string,
    data: { incidentType: string; description: string; severity?: string; fieldLotId?: string },
  ) {
    const count = await this.prisma.eaccSafetyIncident.count({ where: { organizationId } });
    const incidentKey = generateEaccKey('INC', count + 1);
    const row = await this.prisma.eaccSafetyIncident.create({
      data: {
        organizationId, incidentKey, incidentType: data.incidentType, description: data.description,
        severity: (data.severity ?? 'medium') as never, fieldLotId: data.fieldLotId, reportedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EaccSafetyIncident', incidentKey, 'safety_incident_recorded', userId);
    return row;
  }

  listInspections(organizationId: string) {
    return this.prisma.eaccSafetyInspection.findMany({ where: { organizationId }, orderBy: { inspectedAt: 'desc' } });
  }

  async recordSafetyInspection(
    organizationId: string,
    userId: string,
    data: { inspectorName?: string; score?: number; signatureRef?: string; photoRefs?: string[] },
  ) {
    const count = await this.prisma.eaccSafetyInspection.count({ where: { organizationId } });
    const inspectionKey = generateEaccKey('SIN', count + 1);
    return this.prisma.eaccSafetyInspection.create({
      data: {
        organizationId, inspectionKey, inspectorName: data.inspectorName, score: data.score,
        signatureRef: data.signatureRef, photoRefs: data.photoRefs ?? [],
      },
    });
  }

  listWorkPermits(organizationId: string) {
    return this.prisma.eaccWorkPermit.findMany({ where: { organizationId, status: 'active' } });
  }

  async issueWorkPermit(
    organizationId: string,
    data: { workType: string; authorizedBy?: string; validFrom?: string; validUntil?: string },
  ) {
    const count = await this.prisma.eaccWorkPermit.count({ where: { organizationId } });
    const permitKey = generateEaccKey('PRM', count + 1);
    return this.prisma.eaccWorkPermit.create({
      data: {
        organizationId, permitKey, workType: data.workType, authorizedBy: data.authorizedBy,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });
  }
}

@Injectable()
export class EaccDocumentService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  list(organizationId: string, docType?: string) {
    return this.prisma.eaccDocumentLink.findMany({
      where: { organizationId, status: 'active', ...(docType ? { docType } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async link(
    organizationId: string,
    userId: string,
    data: {
      documentRef: string; docType: string; title: string; version?: string;
      entityType?: string; entityKey?: string; signatureRef?: string;
    },
  ) {
    const count = await this.prisma.eaccDocumentLink.count({ where: { organizationId } });
    const linkKey = generateEaccKey('DOC', count + 1);
    const row = await this.prisma.eaccDocumentLink.create({
      data: {
        organizationId, linkKey, documentRef: data.documentRef, docType: data.docType,
        title: data.title, version: data.version, entityType: data.entityType,
        entityKey: data.entityKey, signatureRef: data.signatureRef,
      },
    });
    await this.audit.log(organizationId, 'EaccDocumentLink', linkKey, 'document_linked', userId);
    return row;
  }
}
