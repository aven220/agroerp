import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HpaAuditService } from './hpa-audit.service';
import { HpaNotificationService } from './hpa-notification.service';
import { fullDisplayName } from '@/core/hep/domain/hep-portal.engine';

@Injectable()
export class HpaPersonalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HpaAuditService,
    private readonly notifications: HpaNotificationService,
    private readonly core: CoreEngineService,
  ) {}

  async resolveEmployeeKey(organizationId: string, userId: string, employeeKey?: string): Promise<string> {
    if (employeeKey) return employeeKey;
    const byUser = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, userId },
      select: { employeeKey: true },
    });
    if (byUser) return byUser.employeeKey;
    const profile = await this.prisma.hepProfile.findFirst({
      where: { organizationId, userId },
      select: { employeeKey: true },
    });
    if (profile) return profile.employeeKey;
    throw new NotFoundException('Empleado no vinculado al usuario');
  }

  async personalDashboard(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.resolveEmployeeKey(organizationId, userId, employeeKey);
    await this.notifications.refreshForEmployee(organizationId, key, userId);

    const [
      employee,
      vacationBalance,
      enrollments,
      evaluations,
      objectives,
      payslips,
      requests,
      notices,
      news,
      notifications,
    ] = await Promise.all([
      this.prisma.hcmEmployee.findFirst({ where: { organizationId, employeeKey: key } }),
      this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey: key } }),
      this.prisma.hcmTdEnrollment.findMany({
        where: { organizationId, employeeKey: key, status: { in: ['enrolled', 'in_progress'] } },
        include: { course: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId, employeeKey: key, status: { in: ['draft', 'pending', 'in_review'] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hcmTdObjective.findMany({
        where: { organizationId, employeeKey: key, status: 'active' },
        take: 10,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.hcmPyPayslip.findMany({
        where: { organizationId, employeeKey: key, status: { in: ['approved', 'paid', 'calculated'] } },
        orderBy: { periodCode: 'desc' },
        take: 5,
      }),
      this.prisma.hepRequest.findMany({
        where: { organizationId, employeeKey: key, status: { in: ['draft', 'submitted', 'pending_approval'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.hepNotice.findMany({
        where: { organizationId, isActive: true },
        orderBy: { startsAt: 'desc' },
        take: 5,
      }),
      this.prisma.hepNewsItem.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        take: 5,
      }),
      this.notifications.listForEmployee(organizationId, key),
    ]);

    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const [position, department] = await Promise.all([
      employee.positionKey
        ? this.prisma.hcmPosition.findFirst({ where: { organizationId, positionKey: employee.positionKey } })
        : null,
      employee.departmentKey
        ? this.prisma.hcmDepartment.findFirst({ where: { organizationId, departmentKey: employee.departmentKey } })
        : null,
    ]);

    const pendingApprovals = requests.filter((r) => r.status === 'pending_approval' || r.status === 'submitted');

    const payload = {
      summary: {
        employeeKey: employee.employeeKey,
        fullName: fullDisplayName(employee),
        employmentStatus: employee.employmentStatus,
        hireDate: employee.hireDate,
        position: position ? { positionKey: position.positionKey, name: position.name } : null,
        area: department ? { departmentKey: department.departmentKey, name: department.name } : null,
        photoUrl: employee.photoUrl,
      },
      vacationsAvailable: vacationBalance?.availableDays ?? 0,
      upcomingCourses: enrollments.map((e) => ({
        enrollmentKey: e.enrollmentKey,
        courseKey: e.courseKey,
        courseTitle: e.course?.title,
        status: e.status,
      })),
      pendingEvaluations: evaluations.map((e) => ({
        evaluationKey: e.evaluationKey,
        evaluationType: e.evaluationType,
        status: e.status,
      })),
      activeObjectives: objectives.map((o) => ({
        objectiveKey: o.objectiveKey,
        title: o.title,
        currentValue: o.currentValue,
        targetValue: o.targetValue,
        dueDate: o.dueDate,
      })),
      latestPayslips: payslips.map((p) => ({
        payslipKey: p.payslipKey,
        periodCode: p.periodCode,
        netPay: p.netPay,
        status: p.status,
      })),
      notifications,
      notices,
      news,
      pendingRequests: requests,
      pendingApprovals,
      generatedAt: new Date().toISOString(),
    };

    await this.audit.log({
      organizationId,
      action: 'query',
      resource: 'HpaPersonalDashboard',
      userId,
      employeeKey: key,
    });
    await this.core.emitUserAction(organizationId, 'HpaPersonalDashboard', key, EVENT_TYPES.HPA_PERSONAL_DASHBOARD_VIEWED, {
      employeeKey: key,
    });

    return payload;
  }
}
