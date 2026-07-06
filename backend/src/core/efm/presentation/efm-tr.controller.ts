import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmTrCenterService } from '../application/efm-tr-center.service';
import { EfmTrBankService } from '../application/efm-tr-bank.service';
import { EfmTrCashboxService } from '../application/efm-tr-cashbox.service';
import { EfmTrMovementService } from '../application/efm-tr-movement.service';
import { EfmTrReconciliationService } from '../application/efm-tr-reconciliation.service';
import { EfmTrCashflowService } from '../application/efm-tr-cashflow.service';
import {
  EfmTrAdjustmentDto,
  EfmTrBankAccountDto,
  EfmTrBankDto,
  EfmTrBankSignerDto,
  EfmTrCashBoxDto,
  EfmTrCashCountDto,
  EfmTrCloseSessionDto,
  EfmTrImportStatementDto,
  EfmTrManualMatchDto,
  EfmTrMovementDto,
  EfmTrOpenSessionDto,
  EfmTrStartReconciliationDto,
  EfmTrVoidDto,
} from './efm-tr.dto';

@ApiTags('EFM — Tesorería')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm/tr')
export class EfmTrController {
  constructor(
    private readonly center: EfmTrCenterService,
    private readonly banks: EfmTrBankService,
    private readonly cashboxes: EfmTrCashboxService,
    private readonly movements: EfmTrMovementService,
    private readonly reconciliation: EfmTrReconciliationService,
    private readonly cashflow: EfmTrCashflowService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  trCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('banks')
  @RequirePermissions('finance:read')
  listBanks(@CurrentUser() user: { organizationId: string }) {
    return this.banks.listBanks(user.organizationId);
  }

  @Post('banks')
  @RequirePermissions('finance:tr_config')
  upsertBank(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrBankDto) {
    return this.banks.upsertBank(user.organizationId, user.id, dto);
  }

  @Get('accounts')
  @RequirePermissions('finance:read')
  listAccounts(
    @CurrentUser() user: { organizationId: string },
    @Query('bankKey') bankKey?: string,
    @Query('currencyKey') currencyKey?: string,
  ) {
    return this.banks.listAccounts(user.organizationId, { bankKey, currencyKey });
  }

  @Get('balances')
  @RequirePermissions('finance:read')
  balances(@CurrentUser() user: { organizationId: string }) {
    return this.banks.getBalances(user.organizationId);
  }

  @Post('accounts')
  @RequirePermissions('finance:tr_config')
  upsertAccount(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrBankAccountDto) {
    return this.banks.upsertAccount(user.organizationId, user.id, dto);
  }

  @Post('signers')
  @RequirePermissions('finance:tr_config')
  addSigner(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrBankSignerDto) {
    return this.banks.addSigner(user.organizationId, user.id, dto);
  }

  @Get('cash-boxes')
  @RequirePermissions('finance:read')
  listCashBoxes(@CurrentUser() user: { organizationId: string }) {
    return this.cashboxes.list(user.organizationId);
  }

  @Post('cash-boxes')
  @RequirePermissions('finance:tr_config')
  upsertCashBox(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrCashBoxDto) {
    return this.cashboxes.upsert(user.organizationId, user.id, dto);
  }

  @Post('cash-boxes/:cashBoxKey/open')
  @RequirePermissions('finance:tr_cash')
  openSession(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('cashBoxKey') cashBoxKey: string,
    @Body() dto: EfmTrOpenSessionDto,
  ) {
    return this.cashboxes.openSession(user.organizationId, user.id, cashBoxKey, dto.openingBalance);
  }

  @Post('cash-sessions/:sessionKey/close')
  @RequirePermissions('finance:tr_cash')
  closeSession(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: EfmTrCloseSessionDto,
  ) {
    return this.cashboxes.closeSession(user.organizationId, user.id, sessionKey, dto.closingBalance, dto.observations);
  }

  @Post('cash-sessions/:sessionKey/count')
  @RequirePermissions('finance:tr_cash')
  submitCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: EfmTrCashCountDto,
  ) {
    return this.cashboxes.submitCount(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('cash-counts/:countKey/approve')
  @RequirePermissions('finance:tr_approve')
  approveCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.cashboxes.approveCount(user.organizationId, user.id, countKey);
  }

  @Get('movements')
  @RequirePermissions('finance:read')
  listMovements(
    @CurrentUser() user: { organizationId: string },
    @Query('movementType') movementType?: string,
    @Query('status') status?: string,
    @Query('bankAccountKey') bankAccountKey?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.movements.list(user.organizationId, { movementType, status, bankAccountKey, dateFrom, dateTo });
  }

  @Post('movements')
  @RequirePermissions('finance:tr_move')
  createMovement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrMovementDto) {
    return this.movements.create(user.organizationId, user.id, dto);
  }

  @Post('movements/:movementKey/process')
  @RequirePermissions('finance:tr_move')
  processMovement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('movementKey') movementKey: string,
  ) {
    return this.movements.process(user.organizationId, movementKey, user.id);
  }

  @Post('movements/:movementKey/void')
  @RequirePermissions('finance:tr_move')
  voidMovement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('movementKey') movementKey: string,
    @Body() dto: EfmTrVoidDto,
  ) {
    return this.movements.voidMovement(user.organizationId, movementKey, user.id, dto.reason);
  }

  @Post('statements/import')
  @RequirePermissions('finance:tr_reconcile')
  importStatement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrImportStatementDto) {
    return this.reconciliation.importStatement(user.organizationId, user.id, dto as never);
  }

  @Get('reconciliations')
  @RequirePermissions('finance:read')
  listReconciliations(
    @CurrentUser() user: { organizationId: string },
    @Query('bankAccountKey') bankAccountKey?: string,
    @Query('status') status?: string,
  ) {
    return this.reconciliation.list(user.organizationId, { bankAccountKey, status });
  }

  @Post('reconciliations')
  @RequirePermissions('finance:tr_reconcile')
  startReconciliation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmTrStartReconciliationDto) {
    return this.reconciliation.startReconciliation(user.organizationId, user.id, dto);
  }

  @Get('reconciliations/:reconciliationKey')
  @RequirePermissions('finance:read')
  getReconciliation(
    @CurrentUser() user: { organizationId: string },
    @Param('reconciliationKey') reconciliationKey: string,
  ) {
    return this.reconciliation.getOne(user.organizationId, reconciliationKey);
  }

  @Post('reconciliations/:reconciliationKey/match')
  @RequirePermissions('finance:tr_reconcile')
  manualMatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reconciliationKey') reconciliationKey: string,
    @Body() dto: EfmTrManualMatchDto,
  ) {
    return this.reconciliation.manualMatch(user.organizationId, user.id, reconciliationKey, dto);
  }

  @Post('reconciliations/:reconciliationKey/adjust')
  @RequirePermissions('finance:tr_reconcile')
  adjustment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reconciliationKey') reconciliationKey: string,
    @Body() dto: EfmTrAdjustmentDto,
  ) {
    return this.reconciliation.createAdjustment(user.organizationId, user.id, reconciliationKey, dto);
  }

  @Post('reconciliations/:reconciliationKey/complete')
  @RequirePermissions('finance:tr_reconcile')
  completeReconciliation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reconciliationKey') reconciliationKey: string,
  ) {
    return this.reconciliation.complete(user.organizationId, user.id, reconciliationKey);
  }

  @Get('reconciliation-rules')
  @RequirePermissions('finance:read')
  listRules(@CurrentUser() user: { organizationId: string }) {
    return this.reconciliation.listRules(user.organizationId);
  }

  @Post('reconciliation-rules/seed')
  @RequirePermissions('finance:config')
  seedRules(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.reconciliation.seedRules(user.organizationId, user.id);
  }

  @Get('cashflow/daily')
  @RequirePermissions('finance:read')
  cashflowDaily(
    @CurrentUser() user: { organizationId: string },
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.cashflow.daily(user.organizationId, dateFrom, dateTo);
  }

  @Get('cashflow/weekly')
  @RequirePermissions('finance:read')
  cashflowWeekly(
    @CurrentUser() user: { organizationId: string },
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.cashflow.weekly(user.organizationId, dateFrom, dateTo);
  }

  @Get('cashflow/monthly')
  @RequirePermissions('finance:read')
  cashflowMonthly(
    @CurrentUser() user: { organizationId: string },
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.cashflow.monthly(user.organizationId, dateFrom, dateTo);
  }

  @Get('cashflow/projection')
  @RequirePermissions('finance:read')
  projection(
    @CurrentUser() user: { organizationId: string },
    @Query('days') days?: string,
  ) {
    return this.cashflow.projection(user.organizationId, days ? parseInt(days, 10) : 90);
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    const org = user.organizationId;
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const dateFrom = monthAgo.toISOString().slice(0, 10);
    const dateTo = now.toISOString().slice(0, 10);

    return Promise.all([
      this.center.center(org),
      this.banks.getBalances(org),
      this.cashboxes.list(org),
      this.movements.list(org, { status: 'processed', dateFrom, dateTo }),
      this.cashflow.monthly(org, dateFrom, dateTo),
      this.cashflow.projection(org, 90),
      this.reconciliation.list(org, { status: 'in_progress' }),
    ]).then(([center, balances, cashBoxes, movements, cashflow, projection, reconciliations]) => ({
      center,
      balances,
      cashBoxes,
      movements: movements.slice(0, 200),
      cashflow,
      projection,
      reconciliations,
      syncedAt: new Date().toISOString(),
    }));
  }
}
