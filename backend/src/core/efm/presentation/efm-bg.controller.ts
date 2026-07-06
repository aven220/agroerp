import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmBgCenterService } from '../application/efm-bg-center.service';
import { EfmBgDimensionService } from '../application/efm-bg-dimension.service';
import { EfmBgBudgetService } from '../application/efm-bg-budget.service';
import { EfmBgControlService } from '../application/efm-bg-control.service';
import { EfmBgValidationService } from '../application/efm-bg-validation.service';
import { EfmBgAnalysisService } from '../application/efm-bg-analysis.service';
import { EfmBgTransferService } from '../application/efm-bg-transfer.service';
import {
  EfmBgBudgetDto,
  EfmBgDimensionNodeDto,
  EfmBgExceptionApproveDto,
  EfmBgTransferDto,
  EfmBgValidateDto,
  EfmBgVersionDto,
} from './efm-bg.dto';

@ApiTags('EFM — Presupuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm/bg')
export class EfmBgController {
  constructor(
    private readonly center: EfmBgCenterService,
    private readonly dimensions: EfmBgDimensionService,
    private readonly budgets: EfmBgBudgetService,
    private readonly control: EfmBgControlService,
    private readonly validation: EfmBgValidationService,
    private readonly analysis: EfmBgAnalysisService,
    private readonly transfers: EfmBgTransferService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  bgCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('dimensions/hierarchy')
  @RequirePermissions('finance:read')
  hierarchy(@CurrentUser() user: { organizationId: string }) {
    return this.dimensions.hierarchy(user.organizationId);
  }

  @Get('dimensions/nodes')
  @RequirePermissions('finance:read')
  listNodes(
    @CurrentUser() user: { organizationId: string },
    @Query('dimensionType') dimensionType?: string,
  ) {
    return this.dimensions.listNodes(user.organizationId, dimensionType);
  }

  @Post('dimensions/nodes')
  @RequirePermissions('finance:bg_config')
  upsertNode(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmBgDimensionNodeDto) {
    return this.dimensions.upsertNode(user.organizationId, user.id, dto);
  }

  @Post('dimensions/seed')
  @RequirePermissions('finance:config')
  seedDimensions(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.dimensions.seed(user.organizationId, user.id);
  }

  @Get('budgets')
  @RequirePermissions('finance:read')
  listBudgets(
    @CurrentUser() user: { organizationId: string },
    @Query('fiscalYear') fiscalYear?: string,
    @Query('status') status?: string,
    @Query('budgetType') budgetType?: string,
  ) {
    return this.budgets.list(user.organizationId, {
      fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) : undefined,
      status,
      budgetType,
    });
  }

  @Get('budgets/:budgetKey')
  @RequirePermissions('finance:read')
  getBudget(@CurrentUser() user: { organizationId: string }, @Param('budgetKey') budgetKey: string) {
    return this.budgets.getOne(user.organizationId, budgetKey);
  }

  @Post('budgets')
  @RequirePermissions('finance:bg_manage')
  createBudget(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmBgBudgetDto) {
    return this.budgets.create(user.organizationId, user.id, dto as never);
  }

  @Post('budgets/:budgetKey/versions')
  @RequirePermissions('finance:bg_manage')
  createVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('budgetKey') budgetKey: string,
    @Body() dto: EfmBgVersionDto,
  ) {
    return this.budgets.createVersion(user.organizationId, budgetKey, user.id, dto);
  }

  @Post('budgets/:budgetKey/approve')
  @RequirePermissions('finance:bg_approve')
  approveBudget(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('budgetKey') budgetKey: string,
  ) {
    return this.budgets.approve(user.organizationId, budgetKey, user.id);
  }

  @Get('availability')
  @RequirePermissions('finance:read')
  availability(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey: string,
    @Query('periodKey') periodKey: string,
    @Query('accountKey') accountKey: string,
    @Query('costCenterKey') costCenterKey?: string,
  ) {
    return this.control.getAvailability(user.organizationId, { budgetKey, periodKey, accountKey, costCenterKey });
  }

  @Post('validate')
  @RequirePermissions('finance:bg_validate')
  validate(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmBgValidateDto) {
    return this.validation.validateOnly(user.organizationId, { ...dto, userId: user.id });
  }

  @Post('validate/reserve')
  @RequirePermissions('finance:bg_validate')
  validateAndReserve(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmBgValidateDto) {
    return this.validation.checkAndReserve(user.organizationId, { ...dto, userId: user.id });
  }

  @Get('commitments')
  @RequirePermissions('finance:read')
  listCommitments(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey?: string,
  ) {
    return this.control.listCommitments(user.organizationId, budgetKey);
  }

  @Get('executions')
  @RequirePermissions('finance:read')
  listExecutions(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey?: string,
  ) {
    return this.control.listExecutions(user.organizationId, budgetKey);
  }

  @Post('reservations/:reservationKey/release')
  @RequirePermissions('finance:bg_manage')
  releaseReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reservationKey') reservationKey: string,
  ) {
    return this.control.releaseReservation(user.organizationId, reservationKey, user.id);
  }

  @Get('transfers')
  @RequirePermissions('finance:read')
  listTransfers(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey?: string,
  ) {
    return this.transfers.list(user.organizationId, budgetKey);
  }

  @Post('transfers')
  @RequirePermissions('finance:bg_manage')
  createTransfer(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmBgTransferDto) {
    return this.transfers.create(user.organizationId, user.id, dto);
  }

  @Post('transfers/:transferKey/approve')
  @RequirePermissions('finance:bg_approve')
  approveTransfer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfers.approve(user.organizationId, transferKey, user.id);
  }

  @Post('exceptions/:exceptionKey/approve')
  @RequirePermissions('finance:bg_approve')
  approveException(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('exceptionKey') exceptionKey: string,
    @Body() dto: EfmBgExceptionApproveDto,
  ) {
    return this.validation.approveException(user.organizationId, exceptionKey, user.id, dto.approvedAmount);
  }

  @Get('analysis/budget-vs-executed')
  @RequirePermissions('finance:read')
  budgetVsExecuted(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey: string,
    @Query('periodKey') periodKey?: string,
  ) {
    return this.analysis.budgetVsExecuted(user.organizationId, budgetKey, periodKey);
  }

  @Get('analysis/by-cost-center')
  @RequirePermissions('finance:read')
  byCostCenter(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey: string,
  ) {
    return this.analysis.byCostCenter(user.organizationId, budgetKey);
  }

  @Get('analysis/by-project')
  @RequirePermissions('finance:read')
  byProject(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey: string,
  ) {
    return this.analysis.byProject(user.organizationId, budgetKey);
  }

  @Get('analysis/closing-projection')
  @RequirePermissions('finance:read')
  closingProjection(
    @CurrentUser() user: { organizationId: string },
    @Query('budgetKey') budgetKey: string,
  ) {
    return this.analysis.closingProjection(user.organizationId, budgetKey);
  }

  @Get('alerts')
  @RequirePermissions('finance:read')
  listAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('resolved') resolved?: string,
  ) {
    return this.analysis.listAlerts(user.organizationId, resolved === 'true');
  }

  @Post('control-rules/seed')
  @RequirePermissions('finance:config')
  seedRules(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.validation.seedRules(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    const org = user.organizationId;
    const year = new Date().getFullYear();
    return Promise.all([
      this.center.center(org),
      this.budgets.list(org, { fiscalYear: year, status: 'active' }),
      this.control.listExecutions(org),
      this.analysis.listAlerts(org, false),
      this.validation.resolveActiveBudget(org),
    ]).then(([center, budgets, executions, alerts, activeBudget]) => ({
      center,
      budgets,
      executions: executions.slice(0, 100),
      alerts,
      activeBudget,
      syncedAt: new Date().toISOString(),
    }));
  }

  @Get('mobile/pending-approvals')
  @RequirePermissions('finance:bg_approve')
  pendingApprovals(@CurrentUser() user: { organizationId: string }) {
    return this.validation.listPendingExceptions(user.organizationId);
  }
}
