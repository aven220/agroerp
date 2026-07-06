import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmCoaService } from './efm-coa.service';
import { EfmParameterService } from './efm-parameter.service';
import { EfmDimensionService } from './efm-dimension.service';
import { EfmPeriodService } from './efm-period.service';
import { EfmRuleService } from './efm-rule.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { EfmVoucherTypeService } from './efm-voucher-type.service';

@Injectable()
export class EfmConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly coa: EfmCoaService,
    private readonly parameters: EfmParameterService,
    private readonly dimensions: EfmDimensionService,
    private readonly periods: EfmPeriodService,
    private readonly rules: EfmRuleService,
    private readonly engine: EfmAccountingEngineService,
    private readonly voucherTypes: EfmVoucherTypeService,
  ) {}

  async center(organizationId: string) {
    const [
      versions,
      activeVersion,
      accountsCount,
      parameters,
      companies,
      costCenters,
      fiscalYears,
      rulesCount,
      journalsCount,
      postedCount,
      voucherTypesCount,
      recentAudit,
    ] = await Promise.all([
      this.coa.listVersions(organizationId),
      this.coa.getActiveVersion(organizationId),
      this.prisma.efmAccount.count({ where: { organizationId, isActive: true } }),
      this.parameters.list(organizationId),
      this.dimensions.listCompanies(organizationId),
      this.dimensions.listCostCenters(organizationId),
      this.periods.listFiscalYears(organizationId),
      this.prisma.efmAccountingRule.count({ where: { organizationId } }),
      this.prisma.efmJournalEntry.count({ where: { organizationId } }),
      this.prisma.efmJournalEntry.count({ where: { organizationId, status: 'posted' } }),
      this.prisma.efmVoucherType.count({ where: { organizationId, isActive: true } }),
      this.audit.findAll(organizationId, undefined, 20),
    ]);

    return {
      coaVersionsCount: versions.length,
      activeCoaVersion: activeVersion?.versionKey ?? null,
      accountsCount,
      parametersCount: parameters.length,
      companiesCount: companies.length,
      costCentersCount: costCenters.length,
      fiscalYearsCount: fiscalYears.length,
      rulesCount,
      journalsCount,
      postedJournalsCount: postedCount,
      voucherTypesCount,
      recentAudit,
    };
  }

  async seed(organizationId: string, userId: string) {
    await this.dimensions.seed(organizationId, userId);
    await this.parameters.seed(organizationId, userId);
    const year = new Date().getFullYear();
    const fyExists = await this.prisma.efmFiscalYear.findFirst({ where: { organizationId, year } });
    if (!fyExists) await this.periods.createFiscalYear(organizationId, userId, { year });

    let version = await this.coa.getActiveVersion(organizationId);
    if (!version) {
      version = await this.coa.createVersion(organizationId, userId, {
        name: `Plan de cuentas ${year}`,
        effectiveFrom: `${year}-01-01`,
      });
      await this.coa.seedDefaultCoa(organizationId, userId, version.versionKey);
      await this.coa.activateVersion(organizationId, version.versionKey, userId);
    }

    await this.rules.seed(organizationId, userId);
    await this.voucherTypes.seed(organizationId, userId);
    await this.audit.log(organizationId, 'EfmConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }
}
