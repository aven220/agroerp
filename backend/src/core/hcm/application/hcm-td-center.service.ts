import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmTdTrainingService } from './hcm-td-training.service';
import { HcmTdCompetencyService } from './hcm-td-competency.service';
import { HcmTdEvaluationService } from './hcm-td-evaluation.service';
import { HcmTdObjectiveService, HcmTdCareerService } from './hcm-td-objective.service';
import { certificationNeedsAlert } from '../domain/hcm-talent-development.engine';

@Injectable()
export class HcmTdCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly training: HcmTdTrainingService,
    private readonly competencies: HcmTdCompetencyService,
    private readonly evaluations: HcmTdEvaluationService,
    private readonly objectives: HcmTdObjectiveService,
    private readonly career: HcmTdCareerService,
  ) {}

  async center(organizationId: string) {
    const [
      courseCount, planCount, enrollmentCount, certificationCount,
      competencyCount, cycleCount, evaluationCount, objectiveCount,
      careerPlanCount, pendingEvaluations, expiringCerts,
    ] = await Promise.all([
      this.prisma.hcmTdCourse.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTdTrainingPlan.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTdEnrollment.count({ where: { organizationId } }),
      this.prisma.hcmTdCertification.count({ where: { organizationId, status: 'active' } }),
      this.prisma.hcmTdCompetency.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTdPerformanceCycle.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTdEvaluation.count({ where: { organizationId } }),
      this.prisma.hcmTdObjective.count({ where: { organizationId, status: 'active' } }),
      this.prisma.hcmTdCareerPlan.count({ where: { organizationId } }),
      this.prisma.hcmTdEvaluation.count({ where: { organizationId, status: { in: ['draft', 'pending', 'in_review'] } } }),
      this.prisma.hcmTdCertification.count({ where: { organizationId, status: { in: ['active', 'pending_renewal'] } } }),
    ]);

    const recentEnrollments = await this.prisma.hcmTdEnrollment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { course: true },
    });

    return {
      courseCount, planCount, enrollmentCount, certificationCount,
      competencyCount, cycleCount, evaluationCount, objectiveCount,
      careerPlanCount, pendingEvaluations, expiringCerts, recentEnrollments,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmTdCourse.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    await this.training.seedDefaults(organizationId, userId);
    await this.competencies.seedDefaults(organizationId, userId);
    const cycle = await this.evaluations.createCycle(organizationId, userId, {
      name: `Evaluación ${new Date().getFullYear()}`,
      year: new Date().getFullYear(),
      startDate: `${new Date().getFullYear()}-01-01`,
      endDate: `${new Date().getFullYear()}-12-31`,
    });

    const emp = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employmentStatus: 'active' } });
    if (emp) {
      const course = await this.prisma.hcmTdCourse.findFirst({ where: { organizationId, code: 'IND-SAFE' } });
      if (course) {
        await this.training.enroll(organizationId, userId, {
          courseKey: course.courseKey,
          employeeKey: emp.employeeKey,
        });
      }
      const leadComp = await this.prisma.hcmTdCompetency.findFirst({ where: { organizationId, code: 'LEAD' } });
      if (leadComp) {
        await this.competencies.assessEmployee(organizationId, userId, {
          employeeKey: emp.employeeKey,
          competencyKey: leadComp.competencyKey,
          currentLevel: 'intermediate',
          targetLevel: 'advanced',
        });
      }
      await this.objectives.create(organizationId, userId, {
        employeeKey: emp.employeeKey,
        objectiveType: 'okr',
        title: 'Mejorar productividad del equipo',
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        startDate: `${new Date().getFullYear()}-01-01`,
        dueDate: `${new Date().getFullYear()}-06-30`,
        submit: true,
      });
      await this.career.createPlan(organizationId, userId, {
        employeeKey: emp.employeeKey,
        planType: 'growth',
        isHighPotential: false,
      });
      await this.evaluations.create(organizationId, userId, {
        cycleKey: cycle.cycleKey,
        employeeKey: emp.employeeKey,
        evaluationType: 'self',
        submit: true,
      });
    }

    await this.audit.log(organizationId, 'HcmTdConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async dashboard(organizationId: string) {
    const enrollmentsByStatus = await this.prisma.hcmTdEnrollment.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });
    const evaluationsByType = await this.prisma.hcmTdEvaluation.groupBy({
      by: ['evaluationType', 'status'],
      where: { organizationId },
      _count: { id: true },
    });
    const objectivesByStatus = await this.prisma.hcmTdObjective.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });
    const gaps = await this.prisma.hcmTdEmployeeCompetency.findMany({
      where: { organizationId, gapScore: { gt: 0 } },
      orderBy: { gapScore: 'desc' },
      take: 20,
      include: { competency: true },
    });
    const highPotential = await this.prisma.hcmTdCareerPlan.findMany({
      where: { organizationId, isHighPotential: true },
      take: 10,
    });
    return { enrollmentsByStatus, evaluationsByType, objectivesByStatus, gaps, highPotential };
  }

  async mobileSync(organizationId: string, employeeKey?: string) {
    const [center, courses, enrollments, certifications, objectives, evaluations, reminders] = await Promise.all([
      this.center(organizationId),
      this.training.listCourses(organizationId),
      employeeKey ? this.training.listEnrollments(organizationId, employeeKey) : [],
      employeeKey ? this.training.listCertifications(organizationId, employeeKey) : [],
      employeeKey ? this.objectives.list(organizationId, employeeKey) : [],
      employeeKey ? this.evaluations.list(organizationId, { employeeKey }) : [],
      employeeKey ? this.training.listReminders(organizationId, employeeKey) : [],
    ]);
    return { center, courses, enrollments, certifications, objectives, evaluations, reminders, syncedAt: new Date().toISOString() };
  }

  async processCertificationAlerts(organizationId: string, userId: string) {
    const certs = await this.prisma.hcmTdCertification.findMany({
      where: { organizationId, status: 'active', expiresAt: { not: null } },
    });
    let created = 0;
    for (const cert of certs) {
      if (!cert.expiresAt || !certificationNeedsAlert(cert.expiresAt, cert.renewalDays)) continue;
      const existing = await this.prisma.hcmTdReminder.findFirst({
        where: { organizationId, referenceKey: cert.certificationKey, reminderType: 'certification_expiry', isSent: false },
      });
      if (existing) continue;
      await this.training.createReminder(organizationId, {
        employeeKey: cert.employeeKey,
        reminderType: 'certification_expiry',
        referenceKey: cert.certificationKey,
        title: `Renovación: ${cert.name}`,
        dueAt: cert.expiresAt.toISOString(),
      });
      await this.prisma.hcmTdCertification.update({
        where: { id: cert.id },
        data: { status: 'pending_renewal' },
      });
      created++;
    }
    await this.audit.log(organizationId, 'HcmTdCertification', 'alerts', 'processed', userId, { created });
    return { processed: certs.length, remindersCreated: created };
  }
}
