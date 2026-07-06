import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_COMPANY, DEFAULT_CURRENCIES } from '../domain/efm.catalogs';

@Injectable()
export class EfmDimensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  listCompanies(organizationId: string) {
    return this.prisma.efmCompany.findMany({ where: { organizationId, isActive: true } });
  }

  upsertCompany(organizationId: string, userId: string, input: {
    companyKey: string; legalName: string; taxId?: string; countryCode?: string; baseCurrency?: string; isDefault?: boolean;
  }) {
    return this.prisma.efmCompany.upsert({
      where: { organizationId_companyKey: { organizationId, companyKey: input.companyKey } },
      update: { ...input, isActive: true },
      create: { organizationId, ...input, isActive: true },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmCompany', input.companyKey, 'upserted', userId);
      return row;
    });
  }

  listBranches(organizationId: string, companyKey?: string) {
    return this.prisma.efmBranch.findMany({
      where: { organizationId, isActive: true, ...(companyKey ? { companyKey } : {}) },
    });
  }

  upsertBranch(organizationId: string, userId: string, input: {
    branchKey: string; companyKey: string; name: string; regionKey?: string;
  }) {
    return this.prisma.efmBranch.upsert({
      where: { organizationId_branchKey: { organizationId, branchKey: input.branchKey } },
      update: { ...input, isActive: true },
      create: { organizationId, ...input, isActive: true },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmBranch', input.branchKey, 'upserted', userId);
      return row;
    });
  }

  listCostCenters(organizationId: string) {
    return this.prisma.efmCostCenter.findMany({ where: { organizationId, isActive: true }, orderBy: { code: 'asc' } });
  }

  upsertCostCenter(organizationId: string, userId: string, input: {
    costCenterKey: string; code: string; name: string; companyKey?: string; parentKey?: string;
  }) {
    return this.prisma.efmCostCenter.upsert({
      where: { organizationId_costCenterKey: { organizationId, costCenterKey: input.costCenterKey } },
      update: { ...input, isActive: true },
      create: { organizationId, ...input, isActive: true },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmCostCenter', input.costCenterKey, 'upserted', userId);
      return row;
    });
  }

  listProfitCenters(organizationId: string) {
    return this.prisma.efmProfitCenter.findMany({ where: { organizationId, isActive: true } });
  }

  upsertProfitCenter(organizationId: string, userId: string, input: {
    profitCenterKey: string; code: string; name: string; companyKey?: string;
  }) {
    return this.prisma.efmProfitCenter.upsert({
      where: { organizationId_profitCenterKey: { organizationId, profitCenterKey: input.profitCenterKey } },
      update: { ...input, isActive: true },
      create: { organizationId, ...input, isActive: true },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmProfitCenter', input.profitCenterKey, 'upserted', userId);
      return row;
    });
  }

  listProjects(organizationId: string) {
    return this.prisma.efmProject.findMany({ where: { organizationId, isActive: true } });
  }

  upsertProject(organizationId: string, userId: string, input: {
    projectKey: string; code: string; name: string; companyKey?: string; costCenterKey?: string;
    startDate?: string; endDate?: string;
  }) {
    return this.prisma.efmProject.upsert({
      where: { organizationId_projectKey: { organizationId, projectKey: input.projectKey } },
      update: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      },
      create: {
        organizationId,
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmProject', input.projectKey, 'upserted', userId);
      return row;
    });
  }

  listCurrencies(organizationId: string) {
    return this.prisma.efmCurrency.findMany({ where: { organizationId, isActive: true } });
  }

  upsertCurrency(organizationId: string, userId: string, input: {
    currencyKey: string; name: string; symbol?: string; exchangeRate?: number; isBase?: boolean;
  }) {
    return this.prisma.efmCurrency.upsert({
      where: { organizationId_currencyKey: { organizationId, currencyKey: input.currencyKey } },
      update: { ...input, isActive: true },
      create: { organizationId, ...input, isActive: true },
    }).then(async (row) => {
      await this.audit.log(organizationId, 'EfmCurrency', input.currencyKey, 'upserted', userId);
      return row;
    });
  }

  async seed(organizationId: string, userId: string) {
    await this.upsertCompany(organizationId, userId, DEFAULT_COMPANY);
    for (const c of DEFAULT_CURRENCIES) {
      await this.upsertCurrency(organizationId, userId, c);
    }
    await this.upsertCostCenter(organizationId, userId, {
      costCenterKey: 'CC-ADMIN',
      code: '100',
      name: 'Administración',
      companyKey: DEFAULT_COMPANY.companyKey,
    });
    await this.upsertBranch(organizationId, userId, {
      branchKey: 'BR-MAIN',
      companyKey: DEFAULT_COMPANY.companyKey,
      name: 'Sede principal',
    });
    return {
      companies: await this.listCompanies(organizationId),
      currencies: await this.listCurrencies(organizationId),
    };
  }
}
