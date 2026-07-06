import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HpaAuditService } from './hpa-audit.service';
import {
  absenteeismRate,
  averageTenureYears,
  averageTimeToHire,
  bucketSeries,
  distributionBy,
  loadVolumeScore,
  monthsInRange,
  orgPyramid,
  resolveDateRange,
  rotationRate,
} from '../domain/hpa-analytics.engine';

@Injectable()
export class HpaAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HpaAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async kpis(organizationId: string, userId: string, filters?: {
    from?: string; to?: string; companyKey?: string; branchKey?: string; departmentKey?: string;
  }) {
    const { from, to } = resolveDateRange(filters?.from, filters?.to);
    const employeeWhere = {
      organizationId,
      ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
      ...(filters?.branchKey ? { branchKey: filters.branchKey } : {}),
      ...(filters?.departmentKey ? { departmentKey: filters.departmentKey } : {}),
    };

    const [employees, absences, novelties, vacancies, enrollments, evaluations, objectives, vacationBalances] = await Promise.all([
      this.prisma.hcmEmployee.findMany({
        where: employeeWhere,
        select: {
          employeeKey: true, employmentStatus: true, hireDate: true, terminationDate: true,
          departmentKey: true, positionKey: true, branchKey: true,
        },
      }),
      this.prisma.hcmTaAbsenceRecord.findMany({
        where: { organizationId, workDate: { gte: from, lte: to } },
        select: { absenceKey: true, workDate: true },
      }),
      this.prisma.hcmTaTimeNovelty.findMany({
        where: { organizationId, noveltyType: 'overtime', startDate: { gte: from, lte: to }, status: 'approved' },
        select: { hours: true },
      }),
      this.prisma.hcmRcVacancy.findMany({
        where: { organizationId },
        select: { vacancyKey: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.hcmTdEnrollment.findMany({
        where: { organizationId, status: 'completed' },
        select: { employeeKey: true },
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId, status: 'completed' },
        select: { evaluationKey: true },
      }),
      this.prisma.hcmTdObjective.findMany({
        where: { organizationId },
        select: { status: true },
      }),
      this.prisma.hcmPyVacationBalance.findMany({
        where: { organizationId },
        select: { pendingDays: true, availableDays: true },
      }),
    ]);

    const active = employees.filter((e) => e.employmentStatus === 'active');
    const terminations = employees.filter((e) =>
      e.terminationDate && e.terminationDate >= from && e.terminationDate <= to,
    );
    const filledVacancies = vacancies.filter((v) => v.status === 'filled');
    const trainingByEmployee = new Map<string, number>();
    for (const e of enrollments) {
      trainingByEmployee.set(e.employeeKey, (trainingByEmployee.get(e.employeeKey) ?? 0) + 1);
    }
    const daysInRange = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);

    const payload = {
      rotation: rotationRate(terminations.length, active.length),
      absenteeism: absenteeismRate(absences.length, active.length * daysInRange),
      averageTenureYears: averageTenureYears(active.map((e) => e.hireDate)),
      averageTimeToHireDays: averageTimeToHire(
        filledVacancies.map((v) => ({ openedAt: v.createdAt, filledAt: v.updatedAt })),
      ),
      overtimeHours: novelties.reduce((s, n) => s + (n.hours ?? 0), 0),
      trainingPerEmployee: active.length
        ? Math.round((enrollments.length / active.length) * 100) / 100
        : 0,
      evaluationsCompleted: evaluations.length,
      objectivesCompliance: objectives.length
        ? Math.round((objectives.filter((o) => o.status === 'completed').length / objectives.length) * 10000) / 100
        : 0,
      pendingVacationsDays: vacationBalances.reduce((s, v) => s + (v.pendingDays ?? 0), 0),
      availableVacationsDays: vacationBalances.reduce((s, v) => s + (v.availableDays ?? 0), 0),
      byBranch: distributionBy(active.map((e) => ({ key: e.branchKey }))),
      byArea: distributionBy(active.map((e) => ({ key: e.departmentKey }))),
      byPosition: distributionBy(active.map((e) => ({ key: e.positionKey }))),
      filters: { from, to },
    };

    await this.audit.log({
      organizationId, action: 'query', resource: 'HpaKpis', userId,
      filters: filters as Record<string, unknown>, details: { rotation: payload.rotation },
    });
    return payload;
  }

  async analytics(organizationId: string, userId: string, filters?: { from?: string; to?: string }) {
    const { from, to } = resolveDateRange(filters?.from, filters?.to);
    const months = monthsInRange(from, to);

    const [employees, absences, overtime, evaluations, enrollments, positions] = await Promise.all([
      this.prisma.hcmEmployee.findMany({
        where: { organizationId },
        select: {
          hireDate: true, terminationDate: true, employmentStatus: true,
          departmentKey: true, positionKey: true, branchKey: true,
        },
      }),
      this.prisma.hcmTaAbsenceRecord.findMany({
        where: { organizationId, workDate: { gte: from, lte: to } },
        select: { workDate: true },
      }),
      this.prisma.hcmTaTimeNovelty.findMany({
        where: { organizationId, noveltyType: 'overtime', startDate: { gte: from, lte: to }, status: 'approved' },
        select: { startDate: true, hours: true },
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId, status: 'completed', completedAt: { gte: from, lte: to } },
        select: { completedAt: true, overallScore: true },
      }),
      this.prisma.hcmTdEnrollment.findMany({
        where: { organizationId, status: 'completed' },
        select: { createdAt: true },
      }),
      this.prisma.hcmPosition.findMany({
        where: { organizationId },
        select: { positionKey: true, hierarchyLevelKey: true },
      }),
    ]);

    const active = employees.filter((e) => e.employmentStatus === 'active');
    const levelByPosition = new Map(positions.map((p) => [p.positionKey, p.hierarchyLevelKey ?? 'SIN_NIVEL']));

    const overtimeByMonth = months.map((month) => ({
      month,
      value: overtime
        .filter((o) => o.startDate && `${o.startDate.getUTCFullYear()}-${String(o.startDate.getUTCMonth() + 1).padStart(2, '0')}` === month)
        .reduce((s, o) => s + (o.hours ?? 0), 0),
    }));

    const performanceByMonth = months.map((month) => {
      const scores = evaluations
        .filter((e) => e.completedAt && `${e.completedAt.getUTCFullYear()}-${String(e.completedAt.getUTCMonth() + 1).padStart(2, '0')}` === month)
        .map((e) => e.overallScore)
        .filter((s): s is number => typeof s === 'number');
      return {
        month,
        value: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0,
      };
    });

    const payload = {
      historicalRotation: bucketSeries(months, employees.filter((e) => e.terminationDate).map((e) => ({ at: e.terminationDate }))),
      historicalAbsenteeism: bucketSeries(months, absences.map((a) => ({ at: a.workDate }))),
      overtime: overtimeByMonth,
      performance: performanceByMonth,
      training: bucketSeries(months, enrollments.map((e) => ({ at: e.createdAt }))),
      hires: bucketSeries(months, employees.map((e) => ({ at: e.hireDate }))),
      terminations: bucketSeries(months, employees.filter((e) => e.terminationDate).map((e) => ({ at: e.terminationDate }))),
      staffDistribution: {
        byArea: distributionBy(active.map((e) => ({ key: e.departmentKey }))),
        byPosition: distributionBy(active.map((e) => ({ key: e.positionKey }))),
        byBranch: distributionBy(active.map((e) => ({ key: e.branchKey }))),
      },
      orgPyramid: orgPyramid(active.map((e) => ({
        level: e.positionKey ? (levelByPosition.get(e.positionKey) ?? 'SIN_NIVEL') : 'SIN_NIVEL',
      }))),
      filters: { from, to },
    };

    await this.audit.log({
      organizationId, action: 'query', resource: 'HpaAnalytics', userId,
      filters: filters as Record<string, unknown>,
    });
    await this.core.emitUserAction(organizationId, 'HpaAnalytics', 'center', EVENT_TYPES.HPA_ANALYTICS_VIEWED, {
      from: from.toISOString(), to: to.toISOString(),
    });
    return payload;
  }

  async exportAnalytics(organizationId: string, userId: string, filters?: { from?: string; to?: string }) {
    const [kpis, analytics] = await Promise.all([
      this.kpis(organizationId, userId, filters),
      this.analytics(organizationId, userId, filters),
    ]);
    await this.audit.log({
      organizationId, action: 'export', resource: 'HpaAnalyticsExport', userId,
      filters: filters as Record<string, unknown>,
    });
    return {
      format: 'json',
      fileName: `hr-analytics-${new Date().toISOString().slice(0, 10)}.json`,
      content: { kpis, analytics },
    };
  }

  async loadCheck(organizationId: string) {
    const counts = await Promise.all([
      this.prisma.hcmEmployee.count({ where: { organizationId } }),
      this.prisma.hcmTaAbsenceRecord.count({ where: { organizationId } }),
      this.prisma.hcmTdEnrollment.count({ where: { organizationId } }),
      this.prisma.hcmTdEvaluation.count({ where: { organizationId } }),
      this.prisma.hepRequest.count({ where: { organizationId } }),
    ]);
    return loadVolumeScore(counts.reduce((a, b) => a + b, 0));
  }
}
