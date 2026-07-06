import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { DEFAULT_PY_CONCEPTS, DEFAULT_PY_FUNDS, generatePyKey } from '../domain/hcm-payroll.engine';
import type { HcmPyConceptCategory, HcmPyConceptKind, HcmPyFundType, HcmPyPeriodicity } from '@prisma/client';

@Injectable()
export class HcmPyConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  listConfigs(organizationId: string) {
    return this.prisma.hcmPyConfig.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  listConcepts(organizationId: string) {
    return this.prisma.hcmPyConcept.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  listFunds(organizationId: string) {
    return this.prisma.hcmPyFund.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  async seedDefaults(organizationId: string, userId: string) {
    const configKey = generatePyKey('CFG', 1);
    await this.prisma.hcmPyConfig.create({
      data: {
        organizationId,
        configKey,
        companyKey: 'CO-MAIN',
        name: 'Nómina principal Colombia',
        periodicity: 'monthly',
        isDefault: true,
        settings: { country: 'CO', payrollEngine: 'v1' },
      },
    });

    for (const [i, c] of DEFAULT_PY_CONCEPTS.entries()) {
      await this.prisma.hcmPyConcept.create({
        data: {
          organizationId,
          conceptKey: generatePyKey('CPT', i + 1),
          code: c.code,
          name: c.name,
          kind: c.kind as HcmPyConceptKind,
          category: c.category as HcmPyConceptCategory,
          rate: c.rate,
          fixedAmount: c.fixedAmount,
          isTaxable: c.isTaxable ?? true,
          isSocialBase: c.isSocialBase ?? true,
          affectsNet: c.affectsNet ?? true,
        },
      });
    }

    for (const [i, f] of DEFAULT_PY_FUNDS.entries()) {
      await this.prisma.hcmPyFund.create({
        data: {
          organizationId,
          fundKey: generatePyKey('FND', i + 1),
          fundType: f.fundType as HcmPyFundType,
          code: f.code,
          name: f.name,
          entityName: f.entityName,
          employeeRate: f.employeeRate,
          employerRate: f.employerRate,
        },
      });
    }

    await this.audit.log(organizationId, 'HcmPyConfig', configKey, 'seeded', userId);
  }

  async upsertConfig(organizationId: string, userId: string, input: {
    configKey?: string; companyKey: string; name: string; periodicity?: HcmPyPeriodicity;
    smmlv?: number; transportAllowance?: number; uvt?: number; isDefault?: boolean;
  }) {
    if (input.isDefault) {
      await this.prisma.hcmPyConfig.updateMany({ where: { organizationId }, data: { isDefault: false } });
    }
    if (input.configKey) {
      const existing = await this.prisma.hcmPyConfig.findFirst({ where: { organizationId, configKey: input.configKey } });
      if (existing) {
        return this.prisma.hcmPyConfig.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            periodicity: input.periodicity,
            smmlv: input.smmlv,
            transportAllowance: input.transportAllowance,
            uvt: input.uvt,
            isDefault: input.isDefault,
          },
        });
      }
    }
    const configKey = input.configKey ?? generatePyKey('CFG', (await this.prisma.hcmPyConfig.count({ where: { organizationId } })) + 1);
    const cfg = await this.prisma.hcmPyConfig.create({
      data: {
        organizationId, configKey, companyKey: input.companyKey, name: input.name,
        periodicity: input.periodicity ?? 'monthly',
        smmlv: input.smmlv, transportAllowance: input.transportAllowance, uvt: input.uvt,
        isDefault: input.isDefault ?? false,
      },
    });
    await this.audit.log(organizationId, 'HcmPyConfig', configKey, 'created', userId);
    return cfg;
  }

  async upsertConcept(organizationId: string, userId: string, input: {
    conceptKey?: string; code: string; name: string; kind: HcmPyConceptKind; category: HcmPyConceptCategory;
    rate?: number; fixedAmount?: number; isTaxable?: boolean; isSocialBase?: boolean;
  }) {
    if (input.conceptKey) {
      const existing = await this.prisma.hcmPyConcept.findFirst({ where: { organizationId, conceptKey: input.conceptKey } });
      if (existing) {
        return this.prisma.hcmPyConcept.update({
          where: { id: existing.id },
          data: { name: input.name, rate: input.rate, fixedAmount: input.fixedAmount, isTaxable: input.isTaxable, isSocialBase: input.isSocialBase },
        });
      }
    }
    const conceptKey = input.conceptKey ?? generatePyKey('CPT', (await this.prisma.hcmPyConcept.count({ where: { organizationId } })) + 1);
    const concept = await this.prisma.hcmPyConcept.create({
      data: {
        organizationId, conceptKey, code: input.code, name: input.name,
        kind: input.kind, category: input.category,
        rate: input.rate, fixedAmount: input.fixedAmount,
        isTaxable: input.isTaxable ?? true, isSocialBase: input.isSocialBase ?? true,
      },
    });
    await this.audit.log(organizationId, 'HcmPyConcept', conceptKey, 'created', userId);
    return concept;
  }

  async upsertFund(organizationId: string, userId: string, input: {
    fundKey?: string; code: string; name: string; fundType: HcmPyFundType;
    entityName?: string; entityCode?: string; employeeRate?: number; employerRate?: number;
  }) {
    if (input.fundKey) {
      const existing = await this.prisma.hcmPyFund.findFirst({ where: { organizationId, fundKey: input.fundKey } });
      if (existing) {
        return this.prisma.hcmPyFund.update({
          where: { id: existing.id },
          data: { name: input.name, employeeRate: input.employeeRate, employerRate: input.employerRate, entityName: input.entityName },
        });
      }
    }
    const fundKey = input.fundKey ?? generatePyKey('FND', (await this.prisma.hcmPyFund.count({ where: { organizationId } })) + 1);
    const fund = await this.prisma.hcmPyFund.create({
      data: {
        organizationId, fundKey, code: input.code, name: input.name, fundType: input.fundType,
        entityName: input.entityName, entityCode: input.entityCode,
        employeeRate: input.employeeRate ?? 0, employerRate: input.employerRate ?? 0,
      },
    });
    await this.audit.log(organizationId, 'HcmPyFund', fundKey, 'created', userId);
    return fund;
  }
}
