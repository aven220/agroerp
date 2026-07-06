import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmConfigService } from '../application/efm-config.service';
import { EfmCoaService } from '../application/efm-coa.service';
import { EfmParameterService } from '../application/efm-parameter.service';
import { EfmDimensionService } from '../application/efm-dimension.service';
import { EfmPeriodService } from '../application/efm-period.service';
import { EfmRuleService } from '../application/efm-rule.service';
import { EfmAccountingEngineService } from '../application/efm-accounting-engine.service';
import { EfmValidationService } from '../application/efm-validation.service';
import { EfmAuditService } from '../application/efm-audit.service';
import { EfmVoucherTypeService } from '../application/efm-voucher-type.service';
import { EfmVoucherService } from '../application/efm-voucher.service';
import { EfmJournalBookService } from '../application/efm-journal-book.service';
import { EfmLedgerService } from '../application/efm-ledger.service';
import {
  EfmAccountDto,
  EfmAccountingRuleDto,
  EfmBranchDto,
  EfmCoaVersionDto,
  EfmCompanyDto,
  EfmCostCenterDto,
  EfmCurrencyDto,
  EfmFiscalYearDto,
  EfmGenerateFromEventDto,
  EfmJournalEntryDto,
  EfmManualVoucherDto,
  EfmParameterDto,
  EfmProfitCenterDto,
  EfmProjectDto,
  EfmSimulateRuleDto,
  EfmVoucherActionDto,
  EfmVoucherTypeDto,
} from './efm.dto';

@ApiTags('EFM — Enterprise Financial Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm')
export class EfmController {
  constructor(
    private readonly config: EfmConfigService,
    private readonly coa: EfmCoaService,
    private readonly parameters: EfmParameterService,
    private readonly dimensions: EfmDimensionService,
    private readonly periods: EfmPeriodService,
    private readonly rules: EfmRuleService,
    private readonly engine: EfmAccountingEngineService,
    private readonly validation: EfmValidationService,
    private readonly audit: EfmAuditService,
    private readonly voucherTypes: EfmVoucherTypeService,
    private readonly vouchers: EfmVoucherService,
    private readonly journalBook: EfmJournalBookService,
    private readonly ledger: EfmLedgerService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.config.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.config.seed(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('finance:audit')
  auditLog(
    @CurrentUser() user: { organizationId: string },
    @Query('entityType') entityType?: string,
  ) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('coa/versions')
  @RequirePermissions('finance:read')
  listCoaVersions(@CurrentUser() user: { organizationId: string }) {
    return this.coa.listVersions(user.organizationId);
  }

  @Post('coa/versions')
  @RequirePermissions('finance:coa')
  createCoaVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmCoaVersionDto,
  ) {
    return this.coa.createVersion(user.organizationId, user.id, dto);
  }

  @Post('coa/versions/:versionKey/activate')
  @RequirePermissions('finance:coa')
  activateCoaVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    return this.coa.activateVersion(user.organizationId, versionKey, user.id);
  }

  @Get('coa/accounts')
  @RequirePermissions('finance:read')
  listAccounts(
    @CurrentUser() user: { organizationId: string },
    @Query('versionKey') versionKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('accountType') accountType?: string,
  ) {
    const active = versionKey;
    return active
      ? this.coa.listAccounts(user.organizationId, active, { companyKey, accountType })
      : this.coa.getActiveVersion(user.organizationId).then((v) =>
          this.coa.listAccounts(user.organizationId, v?.versionKey, { companyKey, accountType }),
        );
  }

  @Get('coa/hierarchy')
  @RequirePermissions('finance:read')
  coaHierarchy(
    @CurrentUser() user: { organizationId: string },
    @Query('versionKey') versionKey?: string,
  ) {
    return (versionKey
      ? Promise.resolve(versionKey)
      : this.coa.getActiveVersion(user.organizationId).then((v) => v?.versionKey ?? ''))
      .then((vk) => this.coa.getHierarchy(user.organizationId, vk));
  }

  @Post('coa/accounts')
  @RequirePermissions('finance:coa')
  upsertAccount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmAccountDto,
  ) {
    return this.coa.upsertAccount(user.organizationId, user.id, dto);
  }

  @Get('parameters')
  @RequirePermissions('finance:read')
  listParameters(@CurrentUser() user: { organizationId: string }) {
    return this.parameters.list(user.organizationId);
  }

  @Post('parameters')
  @RequirePermissions('finance:config')
  upsertParameter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmParameterDto,
  ) {
    return this.parameters.upsert(user.organizationId, user.id, dto);
  }

  @Get('companies')
  @RequirePermissions('finance:read')
  listCompanies(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.listCompanies(user.organizationId);
  }

  @Post('companies')
  @RequirePermissions('finance:config')
  upsertCompany(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmCompanyDto,
  ) {
    return this.dimensions.upsertCompany(user.organizationId, user.id, dto);
  }

  @Get('branches')
  @RequirePermissions('finance:read')
  listBranches(
    @CurrentUser() user: { organizationId: string },
    @Query('companyKey') companyKey?: string,
  ) {
    return this.dimensions.listBranches(user.organizationId, companyKey);
  }

  @Post('branches')
  @RequirePermissions('finance:config')
  upsertBranch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmBranchDto,
  ) {
    return this.dimensions.upsertBranch(user.organizationId, user.id, dto);
  }

  @Get('cost-centers')
  @RequirePermissions('finance:read')
  listCostCenters(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.listCostCenters(user.organizationId);
  }

  @Post('cost-centers')
  @RequirePermissions('finance:config')
  upsertCostCenter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmCostCenterDto,
  ) {
    return this.dimensions.upsertCostCenter(user.organizationId, user.id, dto);
  }

  @Get('profit-centers')
  @RequirePermissions('finance:read')
  listProfitCenters(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.listProfitCenters(user.organizationId);
  }

  @Post('profit-centers')
  @RequirePermissions('finance:config')
  upsertProfitCenter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmProfitCenterDto,
  ) {
    return this.dimensions.upsertProfitCenter(user.organizationId, user.id, dto);
  }

  @Get('projects')
  @RequirePermissions('finance:read')
  listProjects(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.listProjects(user.organizationId);
  }

  @Post('projects')
  @RequirePermissions('finance:config')
  upsertProject(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmProjectDto,
  ) {
    return this.dimensions.upsertProject(user.organizationId, user.id, dto);
  }

  @Get('currencies')
  @RequirePermissions('finance:read')
  listCurrencies(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.listCurrencies(user.organizationId);
  }

  @Post('currencies')
  @RequirePermissions('finance:config')
  upsertCurrency(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmCurrencyDto,
  ) {
    return this.dimensions.upsertCurrency(user.organizationId, user.id, dto);
  }

  @Get('fiscal-years')
  @RequirePermissions('finance:read')
  listFiscalYears(@CurrentUser() user: { organizationId: string }) {
    return this.periods.listFiscalYears(user.organizationId);
  }

  @Post('fiscal-years')
  @RequirePermissions('finance:period')
  createFiscalYear(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmFiscalYearDto,
  ) {
    return this.periods.createFiscalYear(user.organizationId, user.id, dto);
  }

  @Get('periods')
  @RequirePermissions('finance:read')
  listPeriods(
    @CurrentUser() user: { organizationId: string },
    @Query('fiscalYearKey') fiscalYearKey?: string,
  ) {
    return this.periods.listPeriods(user.organizationId, fiscalYearKey);
  }

  @Post('periods/:periodKey/close')
  @RequirePermissions('finance:period')
  closePeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
  ) {
    return this.periods.closePeriod(user.organizationId, periodKey, user.id);
  }

  @Post('periods/:periodKey/lock')
  @RequirePermissions('finance:period')
  lockPeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
  ) {
    return this.periods.lockPeriod(user.organizationId, periodKey, user.id);
  }

  @Post('periods/:periodKey/reopen')
  @RequirePermissions('finance:period')
  reopenPeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
  ) {
    return this.periods.reopenPeriod(user.organizationId, periodKey, user.id);
  }

  @Get('rules')
  @RequirePermissions('finance:read')
  listRules(
    @CurrentUser() user: { organizationId: string },
    @Query('sourceModule') sourceModule?: string,
    @Query('status') status?: string,
  ) {
    return this.rules.list(user.organizationId, { sourceModule, status });
  }

  @Post('rules')
  @RequirePermissions('finance:rule')
  upsertRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmAccountingRuleDto,
  ) {
    return this.rules.upsert(user.organizationId, user.id, dto as never);
  }

  @Post('rules/:ruleKey/activate')
  @RequirePermissions('finance:rule')
  activateRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ruleKey') ruleKey: string,
  ) {
    return this.rules.activate(user.organizationId, ruleKey, user.id);
  }

  @Get('journals')
  @RequirePermissions('finance:read')
  listJournals(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('periodKey') periodKey?: string,
    @Query('sourceModule') sourceModule?: string,
  ) {
    return this.engine.listEntries(user.organizationId, { status, periodKey, sourceModule });
  }

  @Get('journals/:entryKey')
  @RequirePermissions('finance:read')
  getJournal(
    @CurrentUser() user: { organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.engine.getEntry(user.organizationId, entryKey);
  }

  @Post('journals')
  @RequirePermissions('finance:journal')
  createJournal(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmJournalEntryDto,
  ) {
    return this.engine.createEntry(user.organizationId, user.id, dto);
  }

  @Post('journals/:entryKey/post')
  @RequirePermissions('finance:journal')
  postJournal(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.engine.postEntry(user.organizationId, entryKey, user.id);
  }

  @Post('journals/:entryKey/void')
  @RequirePermissions('finance:journal')
  voidJournal(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.engine.voidEntry(user.organizationId, entryKey, user.id);
  }

  @Post('engine/generate')
  @RequirePermissions('finance:journal')
  generateFromEvent(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmGenerateFromEventDto,
  ) {
    return this.engine.generateFromEvent(user.organizationId, dto.eventType, dto.payload, user.id);
  }

  @Get('validation')
  @RequirePermissions('finance:read')
  validationPanel(@CurrentUser() user: { organizationId: string }) {
    return this.validation.validatePanel(user.organizationId);
  }

  @Post('validation/simulate')
  @RequirePermissions('finance:rule')
  simulateRule(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: EfmSimulateRuleDto,
  ) {
    return this.validation.simulateRule(user.organizationId, dto.eventType, dto.payload);
  }

  @Get('mobile/coa')
  @RequirePermissions('finance:read')
  mobileCoa(@CurrentUser() user: { organizationId: string }) {
    return this.coa.getActiveVersion(user.organizationId).then((v) =>
      v ? this.coa.listAccounts(user.organizationId, v.versionKey) : [],
    );
  }

  @Get('mobile/parameters')
  @RequirePermissions('finance:read')
  mobileParameters(@CurrentUser() user: { organizationId: string }) {
    return this.parameters.list(user.organizationId);
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return Promise.all([
      this.coa.getActiveVersion(user.organizationId).then((v) =>
        v ? this.coa.listAccounts(user.organizationId, v.versionKey) : [],
      ),
      this.parameters.list(user.organizationId),
      this.config.center(user.organizationId),
      this.voucherTypes.list(user.organizationId),
      this.vouchers.list(user.organizationId, { status: 'posted' }, 200),
      this.journalBook.query(user.organizationId, {}, 500),
      this.ledger.query(user.organizationId, {}),
    ]).then(([accounts, parameters, center, voucherTypes, vouchers, journalBook, ledgerReport]) => ({
      accounts,
      parameters,
      center,
      voucherTypes,
      vouchers,
      journalBook: journalBook.rows.slice(0, 500),
      ledger: ledgerReport.accounts.slice(0, 200),
      syncedAt: new Date().toISOString(),
    }));
  }

  @Get('voucher-types')
  @RequirePermissions('finance:read')
  listVoucherTypes(@CurrentUser() user: { organizationId: string }) {
    return this.voucherTypes.list(user.organizationId);
  }

  @Post('voucher-types')
  @RequirePermissions('finance:config')
  upsertVoucherType(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmVoucherTypeDto,
  ) {
    return this.voucherTypes.upsert(user.organizationId, user.id, dto);
  }

  @Post('voucher-types/seed')
  @RequirePermissions('finance:config')
  seedVoucherTypes(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.voucherTypes.seed(user.organizationId, user.id);
  }

  @Get('vouchers')
  @RequirePermissions('finance:read')
  listVouchers(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('voucherTypeKey') voucherTypeKey?: string,
    @Query('originType') originType?: string,
    @Query('sourceModule') sourceModule?: string,
    @Query('sourceDocumentKey') sourceDocumentKey?: string,
    @Query('createdBy') createdBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.vouchers.list(user.organizationId, {
      status, periodKey, companyKey, branchKey, voucherTypeKey, originType,
      sourceModule, sourceDocumentKey, createdBy, dateFrom, dateTo,
    });
  }

  @Get('vouchers/:entryKey')
  @RequirePermissions('finance:read')
  getVoucher(
    @CurrentUser() user: { organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.vouchers.getOne(user.organizationId, entryKey);
  }

  @Post('vouchers')
  @RequirePermissions('finance:voucher')
  createManualVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmManualVoucherDto,
  ) {
    return this.vouchers.createManual(user.organizationId, user.id, dto);
  }

  @Post('vouchers/:entryKey/submit')
  @RequirePermissions('finance:voucher')
  submitVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.vouchers.submitForApproval(user.organizationId, entryKey, user.id);
  }

  @Post('vouchers/:entryKey/approve')
  @RequirePermissions('finance:approve')
  approveVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
    @Body() dto: EfmVoucherActionDto,
  ) {
    return this.vouchers.approve(user.organizationId, entryKey, user.id, dto.comments);
  }

  @Post('vouchers/:entryKey/reject')
  @RequirePermissions('finance:approve')
  rejectVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
    @Body() dto: EfmVoucherActionDto,
  ) {
    return this.vouchers.reject(user.organizationId, entryKey, user.id, dto.reason ?? 'Rechazado');
  }

  @Post('vouchers/:entryKey/void')
  @RequirePermissions('finance:voucher')
  voidVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
    @Body() dto: EfmVoucherActionDto,
  ) {
    return this.vouchers.voidVoucher(user.organizationId, entryKey, user.id, dto.reason ?? 'Anulado');
  }

  @Post('vouchers/:entryKey/reverse')
  @RequirePermissions('finance:journal')
  reverseVoucher(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('entryKey') entryKey: string,
    @Body() dto: EfmVoucherActionDto,
  ) {
    return this.vouchers.reverse(user.organizationId, entryKey, user.id, dto.reason);
  }

  @Get('vouchers/:entryKey/validate')
  @RequirePermissions('finance:read')
  validateVoucher(
    @CurrentUser() user: { organizationId: string },
    @Param('entryKey') entryKey: string,
  ) {
    return this.vouchers.validateVoucher(user.organizationId, entryKey);
  }

  @Get('journal-book')
  @RequirePermissions('finance:read')
  journalBookQuery(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('sourceModule') sourceModule?: string,
    @Query('sourceDocumentKey') sourceDocumentKey?: string,
    @Query('createdBy') createdBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.journalBook.query(user.organizationId, {
      periodKey, companyKey, branchKey, sourceModule, sourceDocumentKey, createdBy, dateFrom, dateTo,
    });
  }

  @Get('journal-book/export')
  @RequirePermissions('finance:read')
  async journalBookExport(
    @CurrentUser() user: { organizationId: string },
    @Res() res: Response,
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const file = await this.journalBook.exportCsv(user.organizationId, {
      periodKey, companyKey, branchKey, dateFrom, dateTo,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }

  @Get('ledger')
  @RequirePermissions('finance:read')
  ledgerQuery(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('comparePeriodKey') comparePeriodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('accountKey') accountKey?: string,
  ) {
    return this.ledger.query(user.organizationId, { periodKey, comparePeriodKey, companyKey, branchKey, accountKey });
  }

  @Get('ledger/:accountKey/movements')
  @RequirePermissions('finance:read')
  ledgerMovements(
    @CurrentUser() user: { organizationId: string },
    @Param('accountKey') accountKey: string,
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
  ) {
    return this.ledger.accountMovements(user.organizationId, accountKey, { periodKey, companyKey, branchKey });
  }

  @Get('ledger/export')
  @RequirePermissions('finance:read')
  async ledgerExport(
    @CurrentUser() user: { organizationId: string },
    @Res() res: Response,
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
  ) {
    const file = await this.ledger.exportCsv(user.organizationId, { periodKey, companyKey, branchKey });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }
}
