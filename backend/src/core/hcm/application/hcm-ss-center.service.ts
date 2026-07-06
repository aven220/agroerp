import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmSsHealthService } from './hcm-ss-health.service';
import { HcmSsRiskService } from './hcm-ss-risk.service';
import { HcmSsPpeService } from './hcm-ss-ppe.service';
import { HcmSsIncidentService } from './hcm-ss-incident.service';
import { HcmSsWellbeingService } from './hcm-ss-wellbeing.service';
import { HcmSsInspectionService } from './hcm-ss-inspection.service';
import { HcmSsEmergencyService } from './hcm-ss-emergency.service';

@Injectable()
export class HcmSsCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly health: HcmSsHealthService,
    private readonly risks: HcmSsRiskService,
    private readonly ppe: HcmSsPpeService,
    private readonly incidents: HcmSsIncidentService,
    private readonly wellbeing: HcmSsWellbeingService,
    private readonly inspections: HcmSsInspectionService,
    private readonly emergency: HcmSsEmergencyService,
  ) {}

  async center(organizationId: string) {
    const [
      examCount, overdueExams, activeRestrictions, followUpPending,
      riskCount, highRisks, mitigationActive, ppeCount, deliveryCount, ppeExpiring,
      incidentCount, openIncidents, inspectionCount, wellbeingPrograms, emergencyPlans,
    ] = await Promise.all([
      this.prisma.hcmSsMedicalExam.count({ where: { organizationId } }),
      this.prisma.hcmSsMedicalExam.count({ where: { organizationId, status: 'overdue' } }),
      this.prisma.hcmSsMedicalRestriction.count({ where: { organizationId, status: 'active' } }),
      this.prisma.hcmSsMedicalFollowUp.count({ where: { organizationId, isCompleted: false } }),
      this.prisma.hcmSsRisk.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmSsRiskAssessment.count({ where: { organizationId, riskLevel: { in: ['high', 'critical'] } } }),
      this.prisma.hcmSsMitigationPlan.count({ where: { organizationId, status: 'active' } }),
      this.prisma.hcmSsPpeItem.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmSsPpeDelivery.count({ where: { organizationId } }),
      this.ppe.expiryAlerts(organizationId).then((r) => r.length),
      this.prisma.hcmSsIncident.count({ where: { organizationId } }),
      this.prisma.hcmSsIncident.count({ where: { organizationId, status: { notIn: ['closed', 'cancelled'] } } }),
      this.prisma.hcmSsInspection.count({ where: { organizationId } }),
      this.prisma.hcmSsWellbeingProgram.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmSsEmergencyPlan.count({ where: { organizationId, isActive: true } }),
    ]);

    return {
      examCount, overdueExams, activeRestrictions, followUpPending,
      riskCount, highRisks, mitigationActive, ppeCount, deliveryCount, ppeExpiring,
      incidentCount, openIncidents, inspectionCount, wellbeingPrograms, emergencyPlans,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmSsPpeItem.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    await this.risks.seedDefaults(organizationId, userId);
    await this.ppe.seedDefaults(organizationId, userId);
    await this.wellbeing.seedDefaults(organizationId, userId);
    await this.emergency.seedDefaults(organizationId, userId);

    const emp = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employmentStatus: 'active' } });
    const risk = await this.prisma.hcmSsRisk.findFirst({ where: { organizationId } });
    const ppeItem = await this.prisma.hcmSsPpeItem.findFirst({ where: { organizationId, code: 'CASCO' } });

    if (emp) {
      const exam = await this.health.scheduleExam(organizationId, userId, {
        employeeKey: emp.employeeKey,
        examType: 'entry',
        scheduledAt: new Date().toISOString().slice(0, 10),
        nextDueAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        provider: 'IPS Ocupacional Demo',
      });
      await this.health.completeExam(organizationId, exam.examKey, userId, {
        fitnessStatus: 'fit',
        findings: 'Sin hallazgos relevantes',
        recommendations: 'Continuar controles periódicos',
      });
      if (ppeItem) {
        await this.ppe.assignToEmployee(organizationId, userId, {
          employeeKey: emp.employeeKey,
          ppeKey: ppeItem.ppeKey,
        });
        await this.ppe.deliver(organizationId, userId, {
          employeeKey: emp.employeeKey,
          ppeKey: ppeItem.ppeKey,
          deliveryType: 'initial',
          signatureName: `${emp.firstName} ${emp.lastName}`,
        });
      }
      await this.incidents.report(organizationId, userId, {
        incidentType: 'incident',
        severity: 'minor',
        title: 'Incidente de demostración',
        occurredAt: new Date().toISOString(),
        employeeKey: emp.employeeKey,
        reportedByKey: emp.employeeKey,
        location: 'Área de operaciones',
      });
      await this.inspections.create(organizationId, userId, {
        inspectionType: 'planned',
        title: 'Inspección preventiva inicial',
        inspectorKey: emp.employeeKey,
        location: 'Sede principal',
      });
    }

    if (risk) {
      await this.risks.assess(organizationId, userId, {
        riskKey: risk.riskKey,
        probability: 3,
        impact: 4,
        notes: 'Evaluación inicial',
      });
      await this.risks.addControl(organizationId, userId, {
        riskKey: risk.riskKey,
        controlType: 'ppe',
        description: 'Uso obligatorio de EPP',
        isImplemented: true,
        effectiveness: 0.8,
      });
      await this.risks.createMitigation(organizationId, userId, {
        riskKey: risk.riskKey,
        title: 'Plan de mitigación inicial',
        description: 'Implementar controles administrativos y EPP',
        dueAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      });
    }

    await this.audit.log(organizationId, 'HcmSsConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async dashboard(organizationId: string) {
    const examsByType = await this.prisma.hcmSsMedicalExam.groupBy({
      by: ['examType', 'status'],
      where: { organizationId },
      _count: { id: true },
    });
    const risksByLevel = await this.prisma.hcmSsRiskAssessment.groupBy({
      by: ['riskLevel'],
      where: { organizationId },
      _count: { id: true },
    });
    const deliveriesByType = await this.prisma.hcmSsPpeDelivery.groupBy({
      by: ['deliveryType', 'status'],
      where: { organizationId },
      _count: { id: true },
    });
    const incidentsByType = await this.prisma.hcmSsIncident.groupBy({
      by: ['incidentType', 'status'],
      where: { organizationId },
      _count: { id: true },
    });
    const inspectionsByStatus = await this.prisma.hcmSsInspection.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });
    const matrix = await this.risks.riskMatrix(organizationId);
    const ppeExpiring = await this.ppe.expiryAlerts(organizationId);
    return { examsByType, risksByLevel, deliveriesByType, incidentsByType, inspectionsByStatus, matrix, ppeExpiring };
  }

  async mobileSync(organizationId: string, employeeKey?: string) {
    const [center, ppeItems, assignments, deliveries, restrictions, risks, incidents, inspections, reminders] = await Promise.all([
      this.center(organizationId),
      this.ppe.listItems(organizationId),
      employeeKey ? this.ppe.listAssignments(organizationId, employeeKey) : [],
      employeeKey ? this.ppe.listDeliveries(organizationId, employeeKey) : [],
      employeeKey ? this.health.listRestrictions(organizationId, employeeKey, 'active') : [],
      this.risks.listRisks(organizationId),
      this.incidents.list(organizationId, employeeKey ? { employeeKey } : undefined),
      this.inspections.list(organizationId),
      this.ppe.expiryAlerts(organizationId),
    ]);
    return {
      center, ppeItems, assignments, deliveries, restrictions, risks, incidents, inspections,
      reminders: employeeKey ? reminders.filter((r) => r.employeeKey === employeeKey) : reminders,
      syncedAt: new Date().toISOString(),
    };
  }
}
