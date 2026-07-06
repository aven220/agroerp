import { Injectable, NotFoundException } from '@nestjs/common';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { evaluateDeadlineAlerts, evaluateRequirementCompliance, generateEaccKey } from '../domain/eacc.engine';
import { EaccAuditService } from './eacc-audit.service';

@Injectable()
export class EaccComplianceService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  listRequirements(organizationId: string, certificationId?: string) {
    return this.prisma.eaccRequirement.findMany({
      where: { organizationId, status: 'active', ...(certificationId ? { certificationId } : {}) },
      include: { evidences: true, checklistItems: true },
    });
  }

  async registerRequirement(
    organizationId: string,
    userId: string,
    data: {
      code: string; title: string; description?: string; frameworkId?: string;
      certificationId?: string; responsibleId?: string; dueDate?: string;
    },
  ) {
    const count = await this.prisma.eaccRequirement.count({ where: { organizationId } });
    const requirementKey = generateEaccKey('REQ', count + 1);
    const row = await this.prisma.eaccRequirement.create({
      data: {
        organizationId, requirementKey, code: data.code, title: data.title, description: data.description,
        frameworkId: data.frameworkId, certificationId: data.certificationId,
        responsibleId: data.responsibleId, dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
    if (data.dueDate) await this.generateDeadlineAlerts(organizationId, 'EaccRequirement', requirementKey, new Date(data.dueDate));
    await this.audit.log(organizationId, 'EaccRequirement', requirementKey, 'requirement_updated', userId);
    return row;
  }

  async recalculateCompliance(organizationId: string, requirementKey: string) {
    const req = await this.prisma.eaccRequirement.findFirst({
      where: { organizationId, requirementKey },
      include: { evidences: true, checklistItems: true },
    });
    if (!req) throw new NotFoundException('Requirement not found');
    const completed = req.checklistItems.filter((i) => i.isCompleted).length;
    const result = evaluateRequirementCompliance({
      evidencesCount: req.evidences.length,
      requiredEvidences: 1,
      checklistCompleted: completed,
      checklistTotal: req.checklistItems.length || 1,
    });
    return this.prisma.eaccRequirement.update({
      where: { id: req.id },
      data: { compliancePct: result.compliancePct, isCompliant: result.isCompliant },
    });
  }

  listChecklists(organizationId: string) {
    return this.prisma.eaccChecklist.findMany({
      where: { organizationId, status: 'active' },
      include: { items: true },
    });
  }

  async createChecklist(
    organizationId: string,
    data: { name: string; certType?: string; auditType?: string; items?: Array<{ question: string; requirementId?: string }> },
  ) {
    const count = await this.prisma.eaccChecklist.count({ where: { organizationId } });
    const checklistKey = generateEaccKey('CHK', count + 1);
    const checklist = await this.prisma.eaccChecklist.create({
      data: { organizationId, checklistKey, name: data.name, certType: data.certType, auditType: data.auditType },
    });
    for (const [i, item] of (data.items ?? []).entries()) {
      const itemKey = `${checklistKey}-I${String(i + 1).padStart(3, '0')}`;
      await this.prisma.eaccChecklistItem.create({
        data: { organizationId, itemKey, checklistId: checklist.id, question: item.question, requirementId: item.requirementId },
      });
    }
    return this.prisma.eaccChecklist.findUnique({ where: { id: checklist.id }, include: { items: true } });
  }

  async completeChecklistItem(
    organizationId: string,
    userId: string,
    itemKey: string,
    data?: { signatureRef?: string; photoRefs?: string[] },
  ) {
    const item = await this.prisma.eaccChecklistItem.findFirst({ where: { organizationId, itemKey } });
    if (!item) throw new NotFoundException('Checklist item not found');
    const updated = await this.prisma.eaccChecklistItem.update({
      where: { id: item.id },
      data: {
        isCompleted: true, completedAt: new Date(), completedBy: userId,
        signatureRef: data?.signatureRef, photoRefs: data?.photoRefs ?? [],
      },
    });
    if (item.requirementId) {
      const req = await this.prisma.eaccRequirement.findUnique({ where: { id: item.requirementId } });
      if (req) await this.recalculateCompliance(organizationId, req.requirementKey);
    }
    await this.audit.log(organizationId, 'EaccChecklistItem', itemKey, 'checklist_completed', userId);
    return updated;
  }

  listEvidences(organizationId: string, requirementId?: string) {
    return this.prisma.eaccEvidence.findMany({
      where: { organizationId, ...(requirementId ? { requirementId } : {}) },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadEvidence(
    organizationId: string,
    userId: string,
    data: { title: string; requirementId?: string; auditId?: string; documentRef?: string; photoRef?: string; signatureRef?: string },
  ) {
    const count = await this.prisma.eaccEvidence.count({ where: { organizationId } });
    const evidenceKey = generateEaccKey('EVD', count + 1);
    const row = await this.prisma.eaccEvidence.create({
      data: {
        organizationId, evidenceKey, title: data.title, requirementId: data.requirementId,
        auditId: data.auditId, documentRef: data.documentRef, photoRef: data.photoRef,
        signatureRef: data.signatureRef, uploadedBy: userId,
      },
    });
    if (data.requirementId) {
      const req = await this.prisma.eaccRequirement.findUnique({ where: { id: data.requirementId } });
      if (req) await this.recalculateCompliance(organizationId, req.requirementKey);
    }
    await this.audit.log(organizationId, 'EaccEvidence', evidenceKey, 'evidence_uploaded', userId);
    return row;
  }

  listAlerts(organizationId: string) {
    return this.prisma.eaccAlert.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  private async generateDeadlineAlerts(organizationId: string, entityType: string, entityKey: string, dueDate: Date) {
    const candidates = evaluateDeadlineAlerts({ dueDate });
    for (const c of candidates) {
      const count = await this.prisma.eaccAlert.count({ where: { organizationId } });
      const alertKey = generateEaccKey('ALT', count + 1);
      await this.prisma.eaccAlert.create({
        data: {
          organizationId, alertKey, alertType: c.alertType, title: `Alerta ${c.alertType}`,
          entityType, entityKey, dueDate: c.dueDate, isActive: c.active,
          severity: c.alertType === 'deadline_overdue' ? 'high' : 'medium',
        },
      });
      await this.audit.log(organizationId, 'EaccAlert', alertKey, 'alert_generated');
    }
  }
}
