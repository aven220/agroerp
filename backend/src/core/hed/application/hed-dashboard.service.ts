import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HedAuditService } from './hed-audit.service';
import {
  averageScore,
  bucketByMonth,
  computeHeadcountEvolution,
  computeMonthlyRotation,
  countByKey,
  isClosedVacancyStatus,
  isInactiveEmployment,
  isOpenVacancyStatus,
  loadFactor,
  monthsInRange,
  objectiveCompliance,
  resolveDateRange,
  trainingCompliance,
} from '../domain/hed-dashboard.engine';

@Injectable()
export class HedDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HedAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async dashboard(organizationId: string, userId: string, filters?: {
    from?: string; to?: string; companyKey?: string; branchKey?: string; departmentKey?: string;
  }) {
    const { from, to } = resolveDateRange(filters?.from, filters?.to);
    const months = monthsInRange(from, to);
    const employeeWhere = {
      organizationId,
      ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
      ...(filters?.branchKey ? { branchKey: filters.branchKey } : {}),
      ...(filters?.departmentKey ? { departmentKey: filters.departmentKey } : {}),
    };

    const [
      employees,
      vacancies,
      absences,
      latePunches,
      novelties,
      enrollments,
      certifications,
      plans,
      planAssignments,
      evaluations,
      objectives,
      actionPlans,
      departments,
      positions,
      branches,
    ] = await Promise.all([
      this.prisma.hcmEmployee.findMany({
        where: employeeWhere,
        select: {
          employeeKey: true, employmentStatus: true, hireDate: true, terminationDate: true,
          departmentKey: true, positionKey: true, branchKey: true, companyKey: true,
        },
      }),
      this.prisma.hcmRcVacancy.findMany({
        where: { organizationId },
        select: { vacancyKey: true, status: true, createdAt: true },
      }),
      this.prisma.hcmTaAbsenceRecord.findMany({
        where: { organizationId, workDate: { gte: from, lte: to } },
        select: { absenceKey: true, absenceType: true, workDate: true, employeeKey: true },
      }),
      this.prisma.hcmTaTimePunch.findMany({
        where: { organizationId, workDate: { gte: from, lte: to }, minutesLate: { gt: 0 } },
        select: { punchKey: true, minutesLate: true, workDate: true },
      }),
      this.prisma.hcmTaTimeNovelty.findMany({
        where: { organizationId, startDate: { gte: from, lte: to } },
        select: { noveltyKey: true, noveltyType: true, status: true, startDate: true, endDate: true, hours: true },
      }),
      this.prisma.hcmTdEnrollment.findMany({
        where: { organizationId },
        select: { enrollmentKey: true, status: true, courseKey: true },
      }),
      this.prisma.hcmTdCertification.findMany({
        where: { organizationId, status: { in: ['active', 'pending_renewal'] } },
        select: { certificationKey: true, status: true, expiresAt: true },
      }),
      this.prisma.hcmTdTrainingPlan.findMany({
        where: { organizationId, isActive: true },
        select: { planKey: true, courseKeys: true },
      }),
      this.prisma.hcmTdPlanAssignment.findMany({
        where: { organizationId },
        select: { assignmentKey: true, status: true },
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId },
        select: { evaluationKey: true, status: true, overallScore: true },
      }),
      this.prisma.hcmTdObjective.findMany({
        where: { organizationId },
        select: { objectiveKey: true, status: true },
      }),
      this.prisma.hcmTdActionPlan.findMany({
        where: { organizationId },
        select: { actionKey: true, isCompleted: true },
      }),
      this.prisma.hcmDepartment.findMany({ where: { organizationId }, select: { departmentKey: true, name: true } }),
      this.prisma.hcmPosition.findMany({ where: { organizationId }, select: { positionKey: true, name: true } }),
      this.prisma.hcmBranch.findMany({ where: { organizationId }, select: { branchKey: true, name: true } }),
    ]);

    const activeEmployees = employees.filter((e) => e.employmentStatus === 'active');
    const inactiveEmployees = employees.filter((e) => isInactiveEmployment(e.employmentStatus));
    const hires = employees.filter((e) => e.hireDate && e.hireDate >= from && e.hireDate <= to);
    const terminations = employees.filter((e) =>
      (e.terminationDate && e.terminationDate >= from && e.terminationDate <= to)
      || (e.employmentStatus === 'terminated' && e.terminationDate && e.terminationDate >= from && e.terminationDate <= to),
    );
    const openVacancies = vacancies.filter((v) => isOpenVacancyStatus(v.status));
    const closedVacancies = vacancies.filter((v) => isClosedVacancyStatus(v.status));

    const overtime = novelties.filter((n) => n.noveltyType === 'overtime' && ['approved', 'pending'].includes(n.status));
    const medicalLeaves = novelties.filter((n) => n.noveltyType === 'medical_leave' && n.status === 'approved');
    const activeVacations = novelties.filter((n) => {
      if (n.noveltyType !== 'vacation' || n.status !== 'approved') return false;
      const start = n.startDate;
      const end = n.endDate ?? n.startDate;
      return start <= to && end >= from;
    });

    const pendingCourses = enrollments.filter((e) => ['enrolled', 'in_progress'].includes(e.status));
    const approvedCourses = enrollments.filter((e) => e.status === 'completed');
    const expiringCerts = certifications.filter((c) => {
      if (!c.expiresAt) return c.status === 'pending_renewal';
      const days = Math.ceil((c.expiresAt.getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30 || c.status === 'pending_renewal';
    });
    const planAssignmentTotal = planAssignments.length;
    const planAssignmentDone = planAssignments.filter((a) => a.status === 'completed').length;

    const pendingEvaluations = evaluations.filter((e) => ['draft', 'pending', 'in_review'].includes(e.status));
    const completedEvaluations = evaluations.filter((e) => e.status === 'completed');
    const completedObjectives = objectives.filter((o) => o.status === 'completed');
    const activeImprovementPlans = actionPlans.filter((a) => !a.isCompleted);

    const hireBuckets = bucketByMonth(hires, (e) => e.hireDate, months);
    const termBuckets = bucketByMonth(terminations, (e) => e.terminationDate, months);
    const openingHeadcount = Math.max(0, activeEmployees.length - hires.length + terminations.length);
    const headcountEvolution = computeHeadcountEvolution(months, hireBuckets, termBuckets, openingHeadcount);
    const monthlyRotation = computeMonthlyRotation(months, termBuckets, headcountEvolution);

    const deptNames = new Map(departments.map((d) => [d.departmentKey, d.name]));
    const posNames = new Map(positions.map((p) => [p.positionKey, p.name]));
    const branchNames = new Map(branches.map((b) => [b.branchKey, b.name]));

    const byArea = countByKey(activeEmployees, (e) => e.departmentKey).map((r) => ({
      key: r.key,
      label: deptNames.get(r.key) ?? r.key,
      count: r.count,
    }));
    const byPosition = countByKey(activeEmployees, (e) => e.positionKey).map((r) => ({
      key: r.key,
      label: posNames.get(r.key) ?? r.key,
      count: r.count,
    }));
    const byBranch = countByKey(activeEmployees, (e) => e.branchKey).map((r) => ({
      key: r.key,
      label: branchNames.get(r.key) ?? r.key,
      count: r.count,
    }));

    const payload = {
      filters: { from, to, companyKey: filters?.companyKey, branchKey: filters?.branchKey, departmentKey: filters?.departmentKey },
      kpis: {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        inactiveEmployees: inactiveEmployees.length,
        newHires: hires.length,
        terminations: terminations.length,
        openVacancies: openVacancies.length,
        closedVacancies: closedVacancies.length,
      },
      attendance: {
        absenteeism: absences.length,
        lateArrivals: latePunches.length,
        overtimeHours: overtime.reduce((s, n) => s + (n.hours ?? 0), 0),
        medicalLeaves: medicalLeaves.length,
        activeVacations: activeVacations.length,
      },
      training: {
        pendingCourses: pendingCourses.length,
        approvedCourses: approvedCourses.length,
        certificationsExpiring: expiringCerts.length,
        planCompliance: trainingCompliance(planAssignmentDone, planAssignmentTotal || plans.length),
      },
      performance: {
        pendingEvaluations: pendingEvaluations.length,
        averagePerformance: averageScore(completedEvaluations.map((e) => e.overallScore)),
        objectivesCompleted: completedObjectives.length,
        objectivesCompliance: objectiveCompliance(completedObjectives.length, objectives.length),
        activeImprovementPlans: activeImprovementPlans.length,
      },
      charts: {
        monthlyRotation,
        headcountEvolution,
        byArea,
        byPosition,
        byBranch,
      },
      generatedAt: new Date().toISOString(),
    };

    await this.audit.log({
      organizationId,
      action: 'query',
      resource: 'HedDashboard',
      userId,
      filters: filters as Record<string, unknown>,
      details: { kpis: payload.kpis },
    });
    await this.core.emitUserAction(organizationId, 'HedDashboard', 'executive', EVENT_TYPES.HED_DASHBOARD_VIEWED, {
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return payload;
  }

  async exportSnapshot(organizationId: string, userId: string, filters?: {
    from?: string; to?: string; companyKey?: string; branchKey?: string; departmentKey?: string;
  }) {
    const data = await this.dashboard(organizationId, userId, filters);
    await this.audit.log({
      organizationId,
      action: 'export',
      resource: 'HedDashboardExport',
      userId,
      filters: filters as Record<string, unknown>,
      details: { exportedAt: new Date().toISOString() },
    });
    await this.core.emitUserAction(organizationId, 'HedDashboard', 'export', EVENT_TYPES.HED_DASHBOARD_EXPORTED, {
      userId,
    });
    return {
      format: 'json',
      fileName: `hr-executive-dashboard-${new Date().toISOString().slice(0, 10)}.json`,
      content: data,
    };
  }

  async loadCheck(organizationId: string) {
    const counts = await Promise.all([
      this.prisma.hcmEmployee.count({ where: { organizationId } }),
      this.prisma.hcmTaTimePunch.count({ where: { organizationId } }),
      this.prisma.hcmTdEnrollment.count({ where: { organizationId } }),
      this.prisma.hcmTdEvaluation.count({ where: { organizationId } }),
    ]);
    const total = counts.reduce((a, b) => a + b, 0);
    return { totalRows: total, ...loadFactor(total) };
  }

  async mobileSync(organizationId: string, userId: string, filters?: {
    from?: string; to?: string;
  }) {
    const data = await this.dashboard(organizationId, userId, filters);
    return {
      kpis: data.kpis,
      attendance: data.attendance,
      training: data.training,
      performance: data.performance,
      charts: data.charts,
      syncedAt: new Date().toISOString(),
    };
  }
}
