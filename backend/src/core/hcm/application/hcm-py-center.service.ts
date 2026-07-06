import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmPyConfigService } from './hcm-py-config.service';
import { HcmPyPeriodService } from './hcm-py-period.service';
import { HcmPyRunService } from './hcm-py-run.service';
import { HcmPyBenefitService } from './hcm-py-benefit.service';
import { HcmPyDocumentService } from './hcm-py-document.service';

@Injectable()
export class HcmPyCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly config: HcmPyConfigService,
    private readonly periods: HcmPyPeriodService,
    private readonly runs: HcmPyRunService,
    private readonly benefits: HcmPyBenefitService,
    private readonly documents: HcmPyDocumentService,
  ) {}

  async center(organizationId: string) {
    const [
      configCount, conceptCount, fundCount, periodCount,
      runCount, payslipCount, pendingRuns, benefitCount,
    ] = await Promise.all([
      this.prisma.hcmPyConfig.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPyConcept.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPyFund.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPyPeriod.count({ where: { organizationId } }),
      this.prisma.hcmPyRun.count({ where: { organizationId } }),
      this.prisma.hcmPyPayslip.count({ where: { organizationId } }),
      this.prisma.hcmPyRun.count({ where: { organizationId, status: { in: ['calculating', 'pending_approval'] } } }),
      this.prisma.hcmPyBenefit.count({ where: { organizationId, isActive: true } }),
    ]);

    const recentRuns = await this.prisma.hcmPyRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { period: true },
    });

    const openPeriod = await this.prisma.hcmPyPeriod.findFirst({
      where: { organizationId, status: 'open' },
      orderBy: { startDate: 'desc' },
    });

    return {
      configCount, conceptCount, fundCount, periodCount, runCount,
      payslipCount, pendingRuns, benefitCount, recentRuns, openPeriod,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmPyConcept.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    await this.config.seedDefaults(organizationId, userId);
    const cfg = await this.prisma.hcmPyConfig.findFirst({ where: { organizationId, isDefault: true } });
    if (cfg) {
      const now = new Date();
      const period = await this.periods.create(organizationId, userId, {
        configKey: cfg.configKey,
        companyKey: cfg.companyKey,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
      const emp = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employmentStatus: 'active' } });
      if (emp) {
        await this.benefits.create(organizationId, userId, {
          employeeKey: emp.employeeKey,
          benefitType: 'wellness',
          name: 'Plan bienestar',
          amount: 50000,
          startDate: now.toISOString().slice(0, 10),
        });
        await this.prisma.hcmPyVacationBalance.create({
          data: {
            organizationId,
            balanceKey: `VAC-${emp.employeeKey}`,
            employeeKey: emp.employeeKey,
            accruedDays: 15,
            takenDays: 0,
            pendingDays: 0,
            availableDays: 15,
          },
        });
      }
      await this.audit.log(organizationId, 'HcmPyConfig', 'seed', 'period_created', userId, { periodKey: period.periodKey });
    }

    await this.audit.log(organizationId, 'HcmPyConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async dashboard(organizationId: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = to ? new Date(to) : new Date();
    const runs = await this.prisma.hcmPyRun.findMany({
      where: { organizationId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    });
    const byStatus = await this.prisma.hcmPyRun.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
      _sum: { totalNet: true },
    });
    const provisions = await this.prisma.hcmPyProvision.groupBy({
      by: ['provisionType'],
      where: { organizationId, accruedAt: { gte: start, lte: end } },
      _sum: { provisionAmount: true },
    });
    return { runs, byStatus, provisions, from: start, to: end };
  }

  async mobileSync(organizationId: string, employeeKey?: string) {
    const [center, payslips, documents, vacation] = await Promise.all([
      this.center(organizationId),
      employeeKey
        ? this.prisma.hcmPyPayslip.findMany({
            where: { organizationId, employeeKey },
            orderBy: { createdAt: 'desc' },
            take: 12,
            include: { lines: true, run: true },
          })
        : [],
      employeeKey
        ? this.documents.list(organizationId, { employeeKey })
        : [],
      employeeKey
        ? this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey } })
        : null,
    ]);
    return { center, payslips, documents, vacation, syncedAt: new Date().toISOString() };
  }
}
