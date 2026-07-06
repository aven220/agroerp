import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EpscmProposalStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EpscmCenterService } from '../application/epscm-center.service';
import { EpscmDemandService } from '../application/epscm-demand.service';
import { EpscmReplenishmentService } from '../application/epscm-replenishment.service';
import { EpscmSupplyPlanService } from '../application/epscm-supply-plan.service';
import { EpscmInventoryOptService } from '../application/epscm-inventory-opt.service';
import { EpscmAlertsService } from '../application/epscm-alerts.service';
import { EpscmIndicatorsService } from '../application/epscm-indicators.service';
import { EpscmEngineService } from '../application/epscm-engine.service';
import { EpscmAuditService } from '../application/epscm-audit.service';
import { EpscmIntegrationService } from '../application/epscm-integration.service';
import {
  EpscmDemandHistoryDto,
  EpscmForecastVersionDto,
  EpscmManualForecastDto,
  EpscmManualProposalDto,
  EpscmPlanningCycleDto,
  EpscmReplenishmentPolicyDto,
  EpscmSupplyPlanDto,
  EpscmSupplyPlanLineDto,
} from './epscm.dto';

@ApiTags('EPSCM — Supply Chain Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('epscm')
export class EpscmController {
  constructor(
    private readonly center: EpscmCenterService,
    private readonly demand: EpscmDemandService,
    private readonly replenishment: EpscmReplenishmentService,
    private readonly supplyPlan: EpscmSupplyPlanService,
    private readonly inventoryOpt: EpscmInventoryOptService,
    private readonly alerts: EpscmAlertsService,
    private readonly indicators: EpscmIndicatorsService,
    private readonly engine: EpscmEngineService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmIntegrationService,
  ) {}

  @Get('center')
  @RequirePermissions('supply_chain:read')
  getCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('supply_chain:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('supply_chain:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.center.mobileSync(user.organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('supply_chain:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('demand/panel')
  @RequirePermissions('supply_chain:read')
  demandPanel(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.demandPanel(user.organizationId);
  }

  @Get('demand/forecasts')
  @RequirePermissions('supply_chain:read')
  listForecasts(@CurrentUser() user: { organizationId: string }) {
    return this.demand.listVersions(user.organizationId);
  }

  @Get('demand/forecasts/:versionKey')
  @RequirePermissions('supply_chain:read')
  getForecast(
    @CurrentUser() user: { organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    return this.demand.getVersion(user.organizationId, versionKey);
  }

  @Post('demand/forecasts')
  @RequirePermissions('supply_chain:plan')
  createForecast(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmForecastVersionDto,
  ) {
    return this.demand.createVersion(user.organizationId, user.id, {
      name: dto.name,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
    });
  }

  @Post('demand/forecasts/:versionKey/compute')
  @RequirePermissions('supply_chain:plan')
  async computeForecast(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    const lines = await this.demand.computeAutomaticForecast(user.organizationId, user.id, versionKey);
    await this.integration.onForecastComputed(user.organizationId, versionKey);
    return lines;
  }

  @Post('demand/forecasts/:versionKey/manual')
  @RequirePermissions('supply_chain:plan')
  setManualForecast(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionKey') versionKey: string,
    @Body() dto: EpscmManualForecastDto,
  ) {
    return this.demand.setManualForecast(user.organizationId, user.id, versionKey, dto.itemKey, dto.manualQty);
  }

  @Post('demand/forecasts/:versionKey/activate')
  @RequirePermissions('supply_chain:plan')
  activateForecast(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    return this.demand.activateVersion(user.organizationId, user.id, versionKey);
  }

  @Post('demand/forecasts/:versionKey/compare')
  @RequirePermissions('supply_chain:plan')
  compareForecast(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    return this.demand.compareActualVsProjected(user.organizationId, user.id, versionKey);
  }

  @Get('demand/history')
  @RequirePermissions('supply_chain:read')
  demandHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
  ) {
    return this.demand.listHistory(user.organizationId, itemKey);
  }

  @Post('demand/history')
  @RequirePermissions('supply_chain:plan')
  recordHistory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmDemandHistoryDto,
  ) {
    return this.demand.recordHistory(user.organizationId, user.id, {
      itemKey: dto.itemKey,
      periodDate: new Date(dto.periodDate),
      actualQty: dto.actualQty,
      warehouseKey: dto.warehouseKey,
    });
  }

  @Get('replenishment/policies')
  @RequirePermissions('supply_chain:read')
  listPolicies(@CurrentUser() user: { organizationId: string }) {
    return this.replenishment.listPolicies(user.organizationId);
  }

  @Post('replenishment/policies')
  @RequirePermissions('supply_chain:replenish')
  upsertPolicy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmReplenishmentPolicyDto,
  ) {
    return this.replenishment.upsertPolicy(user.organizationId, user.id, dto);
  }

  @Get('replenishment/proposals')
  @RequirePermissions('supply_chain:read')
  listProposals(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmProposalStatus,
  ) {
    return this.replenishment.listProposals(user.organizationId, status);
  }

  @Post('replenishment/run')
  @RequirePermissions('supply_chain:replenish')
  async runReplenishment(@CurrentUser() user: { id: string; organizationId: string }) {
    const proposals = await this.replenishment.runAutomaticReplenishment(user.organizationId, user.id);
    for (const p of proposals) {
      await this.integration.onReplenishmentProposed(user.organizationId, p.proposalKey, p.proposalType);
    }
    return proposals;
  }

  @Post('replenishment/proposals')
  @RequirePermissions('supply_chain:replenish')
  createProposal(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmManualProposalDto,
  ) {
    return this.replenishment.createManualProposal(user.organizationId, user.id, dto);
  }

  @Post('replenishment/proposals/:proposalKey/approve')
  @RequirePermissions('supply_chain:replenish')
  approveProposal(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('proposalKey') proposalKey: string,
  ) {
    return this.replenishment.approveProposal(user.organizationId, user.id, proposalKey);
  }

  @Get('supply-plans')
  @RequirePermissions('supply_chain:read')
  listSupplyPlans(@CurrentUser() user: { organizationId: string }) {
    return this.supplyPlan.listPlans(user.organizationId);
  }

  @Get('supply-plans/:planKey')
  @RequirePermissions('supply_chain:read')
  getSupplyPlan(
    @CurrentUser() user: { organizationId: string },
    @Param('planKey') planKey: string,
  ) {
    return this.supplyPlan.getPlan(user.organizationId, planKey);
  }

  @Post('supply-plans')
  @RequirePermissions('supply_chain:plan')
  createSupplyPlan(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmSupplyPlanDto,
  ) {
    return this.supplyPlan.createPlan(user.organizationId, user.id, {
      name: dto.name,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      dcKey: dto.dcKey,
      companyKey: dto.companyKey,
      priority: dto.priority,
      constraints: dto.constraints,
    });
  }

  @Post('supply-plans/:planKey/lines')
  @RequirePermissions('supply_chain:plan')
  addSupplyPlanLine(
    @CurrentUser() user: { organizationId: string },
    @Param('planKey') planKey: string,
    @Body() dto: EpscmSupplyPlanLineDto,
  ) {
    return this.supplyPlan.addPlanLine(user.organizationId, planKey, {
      itemKey: dto.itemKey,
      plannedQty: dto.plannedQty,
      warehouseKey: dto.warehouseKey,
      priority: dto.priority,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
    });
  }

  @Post('supply-plans/:planKey/activate')
  @RequirePermissions('supply_chain:plan')
  async activateSupplyPlan(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('planKey') planKey: string,
  ) {
    const plan = await this.supplyPlan.activatePlan(user.organizationId, user.id, planKey);
    await this.integration.onSupplyPlanActivated(user.organizationId, planKey);
    return plan;
  }

  @Get('supply-calendar')
  @RequirePermissions('supply_chain:read')
  supplyCalendar(@CurrentUser() user: { organizationId: string }) {
    return this.supplyPlan.listCalendar(user.organizationId);
  }

  @Get('inventory/classifications')
  @RequirePermissions('supply_chain:read')
  listClassifications(@CurrentUser() user: { organizationId: string }) {
    return this.inventoryOpt.listClassifications(user.organizationId);
  }

  @Post('inventory/classify')
  @RequirePermissions('supply_chain:plan')
  async classifyInventory(@CurrentUser() user: { id: string; organizationId: string }) {
    const result = await this.inventoryOpt.computeClassifications(user.organizationId, user.id);
    await this.integration.onClassificationComputed(user.organizationId);
    return result;
  }

  @Get('inventory/indicators')
  @RequirePermissions('supply_chain:read')
  inventoryIndicators(@CurrentUser() user: { organizationId: string }) {
    return this.inventoryOpt.latestIndicators(user.organizationId);
  }

  @Get('alerts')
  @RequirePermissions('supply_chain:read')
  listAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.alerts.list(user.organizationId, unreadOnly === 'true');
  }

  @Post('alerts/:alertKey/read')
  @RequirePermissions('supply_chain:read')
  markAlertRead(
    @CurrentUser() user: { organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.alerts.markRead(user.organizationId, alertKey);
  }

  @Post('alerts/evaluate')
  @RequirePermissions('supply_chain:plan')
  evaluateAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.alerts.evaluateAll(user.organizationId, user.id);
  }

  @Get('distribution-centers')
  @RequirePermissions('supply_chain:read')
  listDCs(@CurrentUser() user: { organizationId: string }) {
    return this.center.listDistributionCenters(user.organizationId);
  }

  @Get('warehouses')
  @RequirePermissions('supply_chain:read')
  listWarehouses(
    @CurrentUser() user: { organizationId: string },
    @Query('dcKey') dcKey?: string,
  ) {
    return this.center.listWarehouses(user.organizationId, dcKey);
  }

  @Post('planning/run')
  @RequirePermissions('supply_chain:plan')
  runPlanningCycle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EpscmPlanningCycleDto,
  ) {
    return this.engine.runFullPlanningCycle(user.organizationId, user.id, dto.versionKey);
  }

  @Get('audit')
  @RequirePermissions('supply_chain:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }
}
