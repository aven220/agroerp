import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  calculatePayslip,
  generatePyKey,
  mergeBulkPayslipResults,
  type PyConceptDef,
  validatePayrollRunConcurrency,
} from '../domain/hcm-payroll.engine';
import type { HcmPyRunStatus } from '@prisma/client';

@Injectable()
export class HcmPyRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { periodKey?: string; status?: HcmPyRunStatus }) {
    return this.prisma.hcmPyRun.findMany({
      where: {
        organizationId,
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { period: true, payslips: true },
    });
  }

  async get(organizationId: string, runKey: string) {
    const run = await this.prisma.hcmPyRun.findFirst({
      where: { organizationId, runKey },
      include: { period: true, payslips: { include: { lines: true } } },
    });
    if (!run) throw new NotFoundException(`Proceso ${runKey} no encontrado`);
    return run;
  }

  async create(organizationId: string, userId: string, input: { periodKey: string; configKey: string; companyKey: string }) {
    const period = await this.prisma.hcmPyPeriod.findFirst({ where: { organizationId, periodKey: input.periodKey } });
    if (!period) throw new BadRequestException('Período no encontrado');
    if (period.status === 'locked') throw new BadRequestException('Período bloqueado');

    const activeRuns = await this.prisma.hcmPyRun.count({
      where: { organizationId, periodKey: input.periodKey, status: { in: ['calculating', 'reprocessing'] } },
    });
    const check = validatePayrollRunConcurrency(activeRuns);
    if (!check.valid) throw new BadRequestException(check.reason);

    const runNumber = (await this.prisma.hcmPyRun.count({ where: { organizationId, periodKey: input.periodKey } })) + 1;
    const runKey = generatePyKey('RUN', (await this.prisma.hcmPyRun.count({ where: { organizationId } })) + 1);

    const run = await this.prisma.hcmPyRun.create({
      data: {
        organizationId, runKey, configKey: input.configKey, periodKey: input.periodKey,
        companyKey: input.companyKey, runNumber, status: 'draft', createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyRun', runKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmPyRun', runKey, EVENT_TYPES.HCM_PY_RUN_CREATED, input);
    return run;
  }

  async calculate(organizationId: string, runKey: string, userId: string) {
    const run = await this.get(organizationId, runKey);
    if (!['draft', 'reprocessing'].includes(run.status)) throw new BadRequestException('Proceso no calculable');

    await this.prisma.hcmPyRun.update({ where: { id: run.id }, data: { status: 'calculating' } });

    const period = await this.prisma.hcmPyPeriod.findFirst({ where: { organizationId, periodKey: run.periodKey } });
    if (!period) throw new BadRequestException('Período inválido');

    const [config, concepts, employees, novelties, garnishments, benefits] = await Promise.all([
      this.prisma.hcmPyConfig.findFirst({ where: { organizationId, configKey: run.configKey } }),
      this.prisma.hcmPyConcept.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmEmployee.findMany({
        where: { organizationId, employmentStatus: 'active' },
        include: { contracts: { where: { status: 'active' }, take: 1 } },
      }),
      this.prisma.hcmTaTimeNovelty.findMany({
        where: { organizationId, payrollPeriod: period.periodCode, payrollReady: true, status: 'approved' },
      }),
      this.prisma.hcmPyGarnishment.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPyBenefit.findMany({ where: { organizationId, isActive: true } }),
    ]);

    if (!config) throw new BadRequestException('Configuración inválida');

    await this.prisma.hcmPyPayslipLine.deleteMany({
      where: { organizationId, payslip: { runKey } },
    });
    await this.prisma.hcmPyPayslip.deleteMany({ where: { organizationId, runKey } });

    const conceptDefs: PyConceptDef[] = concepts.map((c) => ({
      code: c.code,
      name: c.name,
      kind: c.kind as PyConceptDef['kind'],
      category: c.category,
      rate: c.rate ?? undefined,
      fixedAmount: c.fixedAmount ?? undefined,
      isTaxable: c.isTaxable,
      isSocialBase: c.isSocialBase,
      affectsNet: c.affectsNet,
    }));

    const conceptMap = new Map(concepts.map((c) => [c.code, c]));
    const periodDays = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / 86400000) + 1;
    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployer = 0;
    let employeeCount = 0;

    const uniqueEmployees = mergeBulkPayslipResults(employees.map((e) => ({ employeeKey: e.employeeKey, employee: e })));

    for (const { employee } of uniqueEmployees) {
      const contract = employee.contracts[0];
      const baseSalary = contract?.salary ?? 0;
      if (baseSalary <= 0) continue;

      const empNovelties = novelties.filter((n) => n.employeeKey === employee.employeeKey).map((n) => ({
        noveltyType: n.noveltyType,
        hours: n.hours,
        quantity: n.quantity,
        multiplier: n.multiplier,
      }));
      const empGarnishments = garnishments.filter((g) => g.employeeKey === employee.employeeKey).map((g) => ({
        garnishmentType: g.garnishmentType,
        fixedAmount: g.fixedAmount,
        percentage: g.percentage,
        balance: g.balance,
      }));
      const empBenefits = benefits.filter((b) => b.employeeKey === employee.employeeKey).map((b) => ({
        name: b.name,
        amount: b.amount,
        benefitType: b.benefitType,
      }));

      const result = calculatePayslip({
        baseSalary,
        workedDays: periodDays,
        periodDays,
        smmlv: config.smmlv,
        transportAllowance: config.transportAllowance,
        uvt: config.uvt,
        concepts: conceptDefs,
        novelties: empNovelties,
        garnishments: empGarnishments,
        benefits: empBenefits,
      });

      const payslipKey = generatePyKey('PSL', employeeCount + 1);
      await this.prisma.hcmPyPayslip.create({
        data: {
          organizationId,
          payslipKey,
          runKey,
          employeeKey: employee.employeeKey,
          contractKey: contract?.contractKey,
          periodCode: period.periodCode,
          baseSalary: result.baseSalary,
          totalEarnings: result.totalEarnings,
          totalDeductions: result.totalDeductions,
          totalEmployer: result.totalEmployer,
          netPay: result.netPay,
          workedDays: periodDays,
          status: 'calculated',
          metadata: { socialBase: result.socialBase },
        },
      });

      for (const [i, line] of result.lines.entries()) {
        const concept = conceptMap.get(line.conceptCode);
        if (!concept) continue;
        await this.prisma.hcmPyPayslipLine.create({
          data: {
            organizationId,
            lineKey: generatePyKey('LNE', employeeCount * 100 + i + 1),
            payslipKey,
            conceptKey: concept.conceptKey,
            conceptCode: line.conceptCode,
            conceptName: line.conceptName,
            kind: line.kind as never,
            category: line.category as never,
            quantity: line.quantity,
            rate: line.rate,
            amount: line.amount,
          },
        });
      }

      await this.accrueProvisions(organizationId, employee.employeeKey, period.periodCode, result.baseSalary, conceptDefs);

      totalEarnings += result.totalEarnings;
      totalDeductions += result.totalDeductions;
      totalNet += result.netPay;
      totalEmployer += result.totalEmployer;
      employeeCount++;
    }

    const updated = await this.prisma.hcmPyRun.update({
      where: { id: run.id },
      data: {
        status: 'pending_approval',
        employeeCount,
        totalEarnings,
        totalDeductions,
        totalNet,
        totalEmployer,
        metadata: { calculatedAt: new Date().toISOString(), calculatedBy: userId },
      },
    });

    await this.audit.log(organizationId, 'HcmPyRun', runKey, 'calculated', userId, { employeeCount, totalNet });
    await this.core.emitUserAction(organizationId, 'HcmPyRun', runKey, EVENT_TYPES.HCM_PY_RUN_CALCULATED, { employeeCount, totalNet });
    return updated;
  }

  private async accrueProvisions(organizationId: string, employeeKey: string, periodCode: string, baseSalary: number, concepts: PyConceptDef[]) {
    const provisionTypes: Array<{ type: 'cesantias' | 'cesantias_interest' | 'prima' | 'vacation' | 'dotacion'; category: string }> = [
      { type: 'cesantias', category: 'cesantias' },
      { type: 'cesantias_interest', category: 'cesantias_interest' },
      { type: 'prima', category: 'prima' },
      { type: 'vacation', category: 'vacation_provision' },
      { type: 'dotacion', category: 'dotacion' },
    ];
    for (const p of provisionTypes) {
      const concept = concepts.find((c) => c.category === p.category && c.kind === 'provision');
      if (!concept?.rate) continue;
      const amount = Math.round(baseSalary * concept.rate * 100) / 100;
      const provisionKey = generatePyKey('PRV', Date.now() % 1000000 + Math.floor(Math.random() * 1000));
      await this.prisma.hcmPyProvision.create({
        data: {
          organizationId,
          provisionKey,
          employeeKey,
          provisionType: p.type,
          periodCode,
          baseAmount: baseSalary,
          provisionAmount: amount,
          balance: amount,
          accruedAt: new Date(),
        },
      });
    }
  }

  async approve(organizationId: string, runKey: string, userId: string) {
    const run = await this.get(organizationId, runKey);
    if (run.status !== 'pending_approval') throw new BadRequestException('Proceso no pendiente de aprobación');

    await this.prisma.hcmPyPayslip.updateMany({
      where: { organizationId, runKey },
      data: { status: 'approved' },
    });

    const updated = await this.prisma.hcmPyRun.update({
      where: { id: run.id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });

    await this.audit.log(organizationId, 'HcmPyRun', runKey, 'approved', userId);
    await this.core.emitUserAction(organizationId, 'HcmPyRun', runKey, EVENT_TYPES.HCM_PY_RUN_APPROVED, {});
    return updated;
  }

  async markPaid(organizationId: string, runKey: string, userId: string) {
    const run = await this.get(organizationId, runKey);
    if (run.status !== 'approved') throw new BadRequestException('Proceso no aprobado');

    await this.prisma.hcmPyPayslip.updateMany({
      where: { organizationId, runKey },
      data: { status: 'paid' },
    });

    const updated = await this.prisma.hcmPyRun.update({
      where: { id: run.id },
      data: { status: 'paid', paidAt: new Date() },
    });

    await this.audit.log(organizationId, 'HcmPyRun', runKey, 'paid', userId, { totalNet: run.totalNet });
    await this.core.emitUserAction(organizationId, 'HcmPyRun', runKey, EVENT_TYPES.HCM_PY_RUN_PAID, { totalNet: run.totalNet });
    return updated;
  }

  async reprocess(organizationId: string, runKey: string, userId: string) {
    const run = await this.get(organizationId, runKey);
    if (!['approved', 'paid', 'pending_approval'].includes(run.status)) throw new BadRequestException('Proceso no reprocesable');

    await this.prisma.hcmPyRun.update({ where: { id: run.id }, data: { status: 'reprocessing' } });
    await this.audit.log(organizationId, 'HcmPyRun', runKey, 'reprocessing', userId);
    await this.core.emitUserAction(organizationId, 'HcmPyRun', runKey, EVENT_TYPES.HCM_PY_RUN_REPROCESSED, {});
    return this.calculate(organizationId, runKey, userId);
  }

  listPayslips(organizationId: string, filters?: { runKey?: string; employeeKey?: string }) {
    return this.prisma.hcmPyPayslip.findMany({
      where: {
        organizationId,
        ...(filters?.runKey ? { runKey: filters.runKey } : {}),
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { lines: true, run: true },
    });
  }

  async importFromAttendance(organizationId: string, payrollPeriod: string) {
    const novelties = await this.prisma.hcmTaTimeNovelty.findMany({
      where: { organizationId, payrollPeriod, payrollReady: true, status: 'approved' },
    });
    return { payrollPeriod, imported: novelties.length, novelties };
  }
}
