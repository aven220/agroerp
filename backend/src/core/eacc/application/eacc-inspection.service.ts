import { Injectable, NotFoundException } from '@nestjs/common';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { EACC_ACTION_TYPES, EACC_AUDIT_TYPES, EACC_FINDING_TYPES, generateEaccKey, simulateAuditScore } from '../domain/eacc.engine';
import { EaccAuditService } from './eacc-audit.service';

@Injectable()
export class EaccInspectionService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  listPlans(organizationId: string) {
    return this.prisma.eaccAuditPlan.findMany({ where: { organizationId }, orderBy: { plannedStart: 'desc' } });
  }

  async createPlan(
    organizationId: string,
    userId: string,
    data: { name: string; auditType: string; plannedStart?: string; plannedEnd?: string; auditorName?: string },
  ) {
    const count = await this.prisma.eaccAuditPlan.count({ where: { organizationId } });
    const planKey = generateEaccKey('PLN', count + 1);
    const row = await this.prisma.eaccAuditPlan.create({
      data: {
        organizationId, planKey, name: data.name, auditType: data.auditType, auditorName: data.auditorName,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined,
        status: 'scheduled',
      },
    });
    await this.audit.log(organizationId, 'EaccAuditPlan', planKey, 'audit_scheduled', userId);
    return row;
  }

  listAudits(organizationId: string, auditType?: string) {
    return this.prisma.eaccAudit.findMany({
      where: { organizationId, ...(auditType ? { auditType } : {}) },
      include: { findings: true, plan: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async recordAudit(
    organizationId: string,
    userId: string,
    data: { auditType: string; planId?: string; certificationId?: string; auditorName?: string },
  ) {
    const count = await this.prisma.eaccAudit.count({ where: { organizationId } });
    const auditKey = generateEaccKey('AUD', count + 1);
    const row = await this.prisma.eaccAudit.create({
      data: {
        organizationId, auditKey, auditType: data.auditType, planId: data.planId,
        certificationId: data.certificationId, auditorName: data.auditorName,
        startedAt: new Date(), status: 'in_progress',
      },
    });
    await this.audit.log(organizationId, 'EaccAudit', auditKey, 'audit_scheduled', userId);
    return row;
  }

  async completeAudit(organizationId: string, userId: string, auditKey: string) {
    const auditRow = await this.prisma.eaccAudit.findFirst({
      where: { organizationId, auditKey },
      include: { findings: true },
    });
    if (!auditRow) throw new NotFoundException('Audit not found');
    const score = simulateAuditScore(auditRow.findings.map((f) => ({ severity: f.severity, findingType: f.findingType })));
    const updated = await this.prisma.eaccAudit.update({
      where: { id: auditRow.id },
      data: { status: 'completed', completedAt: new Date(), score },
    });
    await this.audit.log(organizationId, 'EaccAudit', auditKey, 'audit_completed', userId, { score });
    return updated;
  }

  listFindings(organizationId: string, auditId?: string) {
    return this.prisma.eaccFinding.findMany({
      where: { organizationId, ...(auditId ? { auditId } : {}), status: 'active' },
      include: { actions: true },
      orderBy: { severity: 'desc' },
    });
  }

  async recordFinding(
    organizationId: string,
    userId: string,
    data: { auditId: string; findingType: string; severity?: string; description: string },
  ) {
    const count = await this.prisma.eaccFinding.count({ where: { organizationId } });
    const findingKey = generateEaccKey('FND', count + 1);
    const row = await this.prisma.eaccFinding.create({
      data: {
        organizationId, findingKey, auditId: data.auditId, findingType: data.findingType,
        severity: (data.severity ?? 'medium') as never, description: data.description,
      },
    });
    await this.audit.log(organizationId, 'EaccFinding', findingKey, 'finding_recorded', userId);
    return row;
  }

  async openCorrectiveAction(
    organizationId: string,
    userId: string,
    data: { findingId: string; actionType: string; description: string; responsibleId?: string; dueDate?: string },
  ) {
    const count = await this.prisma.eaccCorrectiveAction.count({ where: { organizationId } });
    const actionKey = generateEaccKey('CAP', count + 1);
    const row = await this.prisma.eaccCorrectiveAction.create({
      data: {
        organizationId, actionKey, findingId: data.findingId, actionType: data.actionType,
        description: data.description, responsibleId: data.responsibleId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined, status: 'pending',
      },
    });
    await this.audit.log(organizationId, 'EaccCorrectiveAction', actionKey, 'corrective_action_opened', userId);
    return row;
  }

  async closeCorrectiveAction(organizationId: string, userId: string, actionKey: string) {
    const action = await this.prisma.eaccCorrectiveAction.findFirst({ where: { organizationId, actionKey } });
    if (!action) throw new NotFoundException('Action not found');
    const updated = await this.prisma.eaccCorrectiveAction.update({
      where: { id: action.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EaccCorrectiveAction', actionKey, 'corrective_action_closed', userId);
    return updated;
  }

  auditTypes() { return EACC_AUDIT_TYPES; }
  findingTypes() { return EACC_FINDING_TYPES; }
  actionTypes() { return EACC_ACTION_TYPES; }
}
