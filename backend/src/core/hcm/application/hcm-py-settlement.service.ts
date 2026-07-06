import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { computeSettlementBreakdown, generatePyKey, type PyConceptDef } from '../domain/hcm-payroll.engine';
import type { HcmPyGarnishmentType, HcmPySettlementType } from '@prisma/client';

@Injectable()
export class HcmPyGarnishmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmPyGarnishment.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}), isActive: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, input: {
    employeeKey: string; garnishmentType: HcmPyGarnishmentType;
    creditorName?: string; reference?: string; fixedAmount?: number; percentage?: number;
    balance?: number; startDate: string; endDate?: string;
  }) {
    const garnishmentKey = generatePyKey('GRN', (await this.prisma.hcmPyGarnishment.count({ where: { organizationId } })) + 1);
    const g = await this.prisma.hcmPyGarnishment.create({
      data: {
        organizationId, garnishmentKey, employeeKey: input.employeeKey,
        garnishmentType: input.garnishmentType, creditorName: input.creditorName,
        reference: input.reference, fixedAmount: input.fixedAmount, percentage: input.percentage,
        balance: input.balance, startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyGarnishment', garnishmentKey, 'created', userId);
    return g;
  }
}

@Injectable()
export class HcmPySettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmPySettlement.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async calculate(organizationId: string, userId: string, input: {
    employeeKey: string; contractKey: string; settlementType: HcmPySettlementType; terminationDate: string;
  }) {
    const [employee, contract, config, concepts, vacation] = await Promise.all([
      this.prisma.hcmEmployee.findFirst({ where: { organizationId, employeeKey: input.employeeKey } }),
      this.prisma.hcmContract.findFirst({ where: { organizationId, contractKey: input.contractKey } }),
      this.prisma.hcmPyConfig.findFirst({ where: { organizationId, isDefault: true } }),
      this.prisma.hcmPyConcept.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey: input.employeeKey } }),
    ]);

    if (!employee || !contract) throw new NotFoundException('Empleado o contrato no encontrado');
    if (!contract.salary) throw new BadRequestException('Contrato sin salario');

    const conceptDefs: PyConceptDef[] = concepts.map((c) => ({
      code: c.code, name: c.name, kind: c.kind as PyConceptDef['kind'], category: c.category,
    }));

    const breakdown = computeSettlementBreakdown({
      baseSalary: contract.salary,
      hireDate: contract.startDate,
      terminationDate: new Date(input.terminationDate),
      smmlv: config?.smmlv ?? 1300000,
      transportAllowance: config?.transportAllowance ?? 162000,
      pendingVacationDays: vacation?.availableDays ?? 0,
      concepts: conceptDefs,
    });

    const settlementKey = generatePyKey('LQD', (await this.prisma.hcmPySettlement.count({ where: { organizationId } })) + 1);
    const settlement = await this.prisma.hcmPySettlement.create({
      data: {
        organizationId, settlementKey, employeeKey: input.employeeKey,
        contractKey: input.contractKey, settlementType: input.settlementType,
        terminationDate: new Date(input.terminationDate),
        totalEarnings: breakdown.totalEarnings,
        totalDeductions: breakdown.totalDeductions,
        totalNet: breakdown.totalNet,
        status: 'pending_approval',
        breakdown: breakdown.lines,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'HcmPySettlement', settlementKey, 'calculated', userId);
    await this.core.emitUserAction(organizationId, 'HcmPySettlement', settlementKey, EVENT_TYPES.HCM_PY_SETTLEMENT_CALCULATED, input);
    return settlement;
  }
}

@Injectable()
export class HcmPyProvisionService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, filters?: { employeeKey?: string; periodCode?: string }) {
    return this.prisma.hcmPyProvision.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.periodCode ? { periodCode: filters.periodCode } : {}),
      },
      orderBy: { accruedAt: 'desc' },
    });
  }
}

@Injectable()
export class HcmPyVacationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  getBalance(organizationId: string, employeeKey: string) {
    return this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey } });
  }

  async requestVacation(organizationId: string, userId: string, input: {
    employeeKey: string; days: number; startDate: string; reason?: string;
  }) {
    const balance = await this.getBalance(organizationId, input.employeeKey);
    if (!balance || balance.availableDays < input.days) {
      throw new BadRequestException('Días de vacaciones insuficientes');
    }

    const noveltyKey = generatePyKey('VAC-REQ', Date.now() % 100000);
    await this.prisma.hcmTaTimeNovelty.create({
      data: {
        organizationId,
        noveltyKey,
        employeeKey: input.employeeKey,
        noveltyType: 'vacation',
        status: 'pending',
        startDate: new Date(input.startDate),
        endDate: new Date(new Date(input.startDate).getTime() + input.days * 86400000),
        quantity: input.days,
        reason: input.reason,
        createdBy: userId,
        metadata: { source: 'payroll_vacation_request' },
      },
    });

    await this.prisma.hcmPyVacationBalance.update({
      where: { id: balance.id },
      data: { pendingDays: balance.pendingDays + input.days, availableDays: balance.availableDays - input.days },
    });

    await this.audit.log(organizationId, 'HcmPyVacationBalance', balance.balanceKey, 'vacation_requested', userId, input);
    return { noveltyKey, days: input.days, availableDays: balance.availableDays - input.days };
  }
}
