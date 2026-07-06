import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/shared/presentation/decorators/public.decorator';

import {
  CpepCatalogEntryDefinition,
  CpepParameterDefinition,
  CpepQualityInput,
  CpepReceptionRuleDefinition,
  CpepSettlementInput,
  CpepTicketDefinition,
  CpepWeighingInput,
} from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { CoffeeCenterService } from '../application/coffee-center.service';
import { CoffeeReceptionService } from '../application/coffee-reception.service';
import { CoffeeQualityService } from '../application/coffee-quality.service';
import { CoffeeSettlementService } from '../application/coffee-settlement.service';
import { CoffeeDocumentsService } from '../application/coffee-documents.service';
import { CoffeeInventoryService } from '../application/coffee-inventory.service';
import { CoffeeTraceabilityService } from '../application/coffee-traceability.service';
import { CoffeeAiService } from '../application/coffee-ai.service';
import { CoffeeConfigService } from '../application/coffee-config.service';
import { CoffeeAuditService } from '../application/coffee-audit.service';
import { CoffeeLookupService } from '../application/coffee-lookup.service';
import { CoffeeIotService } from '../application/coffee-iot.service';
import { CoffeeStatsService } from '../application/coffee-stats.service';
import { CoffeeOpsService } from '../application/coffee-ops.service';
import { CoffeeReportsService } from '../application/coffee-reports.service';
import { CoffeeCatalogService } from '../application/coffee-catalog.service';
import { CoffeeParameterService } from '../application/coffee-parameter.service';
import { CoffeeReceptionRulesService } from '../application/coffee-reception-rules.service';
import { CoffeePurchaseCenterService } from '../application/coffee-purchase-center.service';
import { CoffeeConfigChangelogService } from '../application/coffee-config-changelog.service';
import { CoffeeConfigCenterService } from '../application/coffee-config-center.service';
import { CoffeeWizardService } from '../application/coffee-wizard.service';
import { CoffeeTurnService } from '../application/coffee-turn.service';
import { CoffeeGateService } from '../application/coffee-gate.service';
import { CoffeeScaleService } from '../application/coffee-scale.service';
import { CoffeeWeighingService } from '../application/coffee-weighing.service';
import {
  CaptureReadingDto,
  CatalogEntryDto,
  ConfigReasonDto,
  ContingencyDto,
  CreateTicketDto,
  GateValidateDto,
  IotWeighDto,
  ManualWeighDto,
  ParameterDto,
  PaymentDto,
  PhotoDto,
  PriceConfigDto,
  PriorityTurnDto,
  ProducerSignDto,
  PurchaseCenterDto,
  QualityDecisionDto,
  QualityDto,
  QualityLotDto,
  QualityReevaluateDto,
  QualitySampleDto,
  ReceptionRuleDto,
  ReorderTurnsDto,
  SampleCustodyDto,
  SampleDto,
  ScaleDto,
  ScaleHeartbeatDto,
  SettlementDto,
  SettlementSimulateDto,
  SignatureDto,
  StartWeighingDto,
  ValidateReceptionDto,
  VoidSettlementDto,
  InventoryMovementDto,
  InventoryRevalueDto,
  ReportGenerateDto,
  CustomReportDto,
  WeighDto,
  WizardArrivalDto,
  WizardConfirmDto,
  WizardOriginDto,
  WizardProducerDto,
  WizardTurnDto,
  WizardVehicleDto,
} from './cpep.dto';




@ApiTags('CPEP — Café Procurement Enterprise Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cpep')
export class CpepController {
  constructor(
    private readonly center: CoffeeCenterService,
    private readonly reception: CoffeeReceptionService,
    private readonly quality: CoffeeQualityService,
    private readonly settlements: CoffeeSettlementService,
    private readonly documents: CoffeeDocumentsService,
    private readonly inventory: CoffeeInventoryService,
    private readonly traceability: CoffeeTraceabilityService,
    private readonly ai: CoffeeAiService,
    private readonly config: CoffeeConfigService,
    private readonly audit: CoffeeAuditService,
    private readonly lookup: CoffeeLookupService,
    private readonly iot: CoffeeIotService,
    private readonly stats: CoffeeStatsService,
    private readonly ops: CoffeeOpsService,
    private readonly reports: CoffeeReportsService,
    private readonly catalogs: CoffeeCatalogService,
    private readonly parameters: CoffeeParameterService,
    private readonly receptionRules: CoffeeReceptionRulesService,
    private readonly purchaseCenters: CoffeePurchaseCenterService,
    private readonly configChangelog: CoffeeConfigChangelogService,
    private readonly configCenter: CoffeeConfigCenterService,
    private readonly wizard: CoffeeWizardService,
    private readonly turnService: CoffeeTurnService,
    private readonly gate: CoffeeGateService,
    private readonly scales: CoffeeScaleService,
    private readonly weighing: CoffeeWeighingService,
  ) {}



  @Get('center')
  @RequirePermissions('coffee:read')
  dashboard(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.dashboard(user.organizationId, user.id);
  }

  @Get('ops/center')
  @RequirePermissions('coffee:read')
  opsCenter(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.operationsCenter(user.organizationId, user.id);
  }

  @Get('ops/executive')
  @RequirePermissions('coffee:read')
  executiveDashboard(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.executiveDashboard(user.organizationId, user.id);
  }

  @Get('ops/operational')
  @RequirePermissions('coffee:read')
  operationalDashboard(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.operationalDashboard(user.organizationId, user.id);
  }

  @Get('ops/alerts')
  @RequirePermissions('coffee:read')
  opsAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.ops.listAlerts(user.organizationId, all !== 'true');
  }

  @Post('ops/alerts/evaluate')
  @RequirePermissions('coffee:read')
  evaluateOpsAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.evaluateAlerts(user.organizationId, user.id);
  }

  @Post('ops/alerts/:alertKey/ack')
  @RequirePermissions('coffee:read')
  ackOpsAlert(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.ops.acknowledgeAlert(user.organizationId, user.id, alertKey);
  }

  @Get('analytics')
  @RequirePermissions('coffee:read')
  analytics(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.stats.analytics(user.organizationId, user.id);
  }

  @Get('analytics/compare')
  @RequirePermissions('coffee:read')
  analyticsCompare(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('currentDays') currentDays?: string,
    @Query('previousDays') previousDays?: string,
  ) {
    return this.stats.comparePeriods(
      user.organizationId,
      currentDays ? Number(currentDays) : 30,
      previousDays ? Number(previousDays) : 30,
      user.id,
    );
  }

  @Get('analytics/audit')
  @RequirePermissions('coffee:audit:read')
  analyticsAudit(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listAnalyticsAudit(user.organizationId);
  }

  @Get('reports')
  @RequirePermissions('coffee:read')
  listReports(@CurrentUser() user: { organizationId: string }) {
    return this.reports.list(user.organizationId);
  }

  @Get('reports/:reportKey')
  @RequirePermissions('coffee:read')
  getReport(
    @CurrentUser() user: { organizationId: string },
    @Param('reportKey') reportKey: string,
  ) {
    return this.reports.getOne(user.organizationId, reportKey);
  }

  @Post('reports/generate')
  @RequirePermissions('coffee:read')
  generateReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ReportGenerateDto,
  ) {
    return this.reports.generate(user.organizationId, user.id, {
      reportType: dto.reportType,
      period: dto.period as 'day' | 'week' | 'month' | 'year' | 'custom',
      days: dto.days,
      format: dto.format as 'json' | 'csv' | 'excel' | 'pdf',
      filters: dto.filters,
    });
  }

  @Post('reports/custom')
  @RequirePermissions('coffee:read')
  customReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CustomReportDto,
  ) {
    return this.reports.customReport(user.organizationId, user.id, {
      title: dto.title,
      metrics: dto.metrics,
      groupBy: dto.groupBy,
      period: dto.period as 'day' | 'week' | 'month' | 'year' | 'custom',
      days: dto.days,
      format: dto.format as 'json' | 'csv' | 'excel' | 'pdf',
      filters: dto.filters,
    });
  }

  @Get('mobile/ops')
  @RequirePermissions('coffee:read')
  mobileOps(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.operationsCenter(user.organizationId, user.id);
  }

  @Get('mobile/kpis')
  @RequirePermissions('coffee:read')
  mobileKpis(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.stats.kpis(user.organizationId, 30, user.id);
  }

  @Get('mobile/alerts')
  @RequirePermissions('coffee:read')
  mobileAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listAlerts(user.organizationId, true);
  }

  @Get('tickets')
  @RequirePermissions('coffee:read')
  listTickets(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.reception.findAll(user.organizationId, status);
  }

  @Get('tickets/:ticketKey')
  @RequirePermissions('coffee:read')
  getTicket(@CurrentUser() user: { organizationId: string }, @Param('ticketKey') ticketKey: string) {
    return this.reception.findOne(user.organizationId, ticketKey);
  }

  @Post('tickets')
  @RequirePermissions('coffee:receive')
  createTicket(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateTicketDto) {
    return this.reception.create(user.organizationId, user.id, dto as CpepTicketDefinition);
  }

  @Post('tickets/:ticketKey/identity')
  @RequirePermissions('coffee:receive')
  validateIdentity(@CurrentUser() user: { id: string; organizationId: string }, @Param('ticketKey') ticketKey: string) {
    return this.reception.validateIdentity(user.organizationId, user.id, ticketKey);
  }

  @Post('tickets/:ticketKey/turn')
  @RequirePermissions('coffee:receive')
  assignTurn(@CurrentUser() user: { id: string; organizationId: string }, @Param('ticketKey') ticketKey: string) {
    return this.reception.assignTurn(user.organizationId, user.id, ticketKey);
  }

  @Get('queue')
  @RequirePermissions('coffee:read')
  queue(@CurrentUser() user: { organizationId: string }) {
    return this.reception.listQueue(user.organizationId);
  }

  @Post('tickets/:ticketKey/weigh')
  @RequirePermissions('coffee:weigh')
  weigh(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WeighDto,
  ) {
    if (dto.grossWeightKg != null && dto.tareWeightKg != null) {
      return this.weighing.quickWeigh(user.organizationId, user.id, ticketKey, dto);
    }
    return this.reception.weigh(user.organizationId, user.id, ticketKey, dto as CpepWeighingInput);
  }

  @Post('tickets/:ticketKey/photos')
  @RequirePermissions('coffee:receive')
  addPhoto(
    @CurrentUser() user: { organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: PhotoDto,
  ) {
    return this.reception.addPhoto(user.organizationId, ticketKey, dto);
  }

  @Post('tickets/:ticketKey/signatures')
  @RequirePermissions('coffee:receive')
  addSignature(
    @CurrentUser() user: { organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: SignatureDto,
  ) {
    return this.reception.addSignature(user.organizationId, ticketKey, dto);
  }

  @Post('tickets/:ticketKey/samples')
  @RequirePermissions('coffee:quality')
  addSample(
    @CurrentUser() user: { organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: SampleDto,
  ) {
    return this.reception.addSample(user.organizationId, ticketKey, dto);
  }

  @Post('tickets/:ticketKey/quality')
  @RequirePermissions('coffee:quality')
  recordQuality(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: QualityDto,
  ) {
    return this.quality.quickEvaluate(user.organizationId, user.id, ticketKey, dto as CpepQualityInput);
  }

  @Get('quality')
  @RequirePermissions('coffee:read')
  qualityHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('producerId') producerId?: string,
    @Query('farmId') farmId?: string,
    @Query('lotId') lotId?: string,
    @Query('lotCode') lotCode?: string,
  ) {
    return this.quality.history(user.organizationId, { producerId, farmId, lotId, lotCode });
  }

  @Get('quality/comparatives/:producerId')
  @RequirePermissions('coffee:read')
  qualityComparatives(@CurrentUser() user: { organizationId: string }, @Param('producerId') producerId: string) {
    return this.quality.comparatives(user.organizationId, producerId);
  }

  @Get('quality/pending')
  @RequirePermissions('coffee:quality')
  qualityPending(@CurrentUser() user: { organizationId: string }) {
    return this.quality.listPending(user.organizationId);
  }

  @Get('quality/sessions')
  @RequirePermissions('coffee:quality')
  qualitySessions(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.quality.listSessions(user.organizationId, status);
  }

  @Get('quality/sessions/:sessionKey')
  @RequirePermissions('coffee:quality')
  qualitySession(
    @CurrentUser() user: { organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.quality.getSession(user.organizationId, sessionKey);
  }

  @Get('quality/indicators')
  @RequirePermissions('coffee:read')
  qualityIndicators(@CurrentUser() user: { organizationId: string }) {
    return this.quality.indicators(user.organizationId);
  }

  @Get('quality/alerts')
  @RequirePermissions('coffee:quality')
  qualityAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.quality.listAlerts(user.organizationId, all !== 'true');
  }

  @Get('quality/photos')
  @RequirePermissions('coffee:read')
  qualityPhotos(
    @CurrentUser() user: { organizationId: string },
    @Query('ticketKey') ticketKey?: string,
  ) {
    return this.quality.listPhotos(user.organizationId, ticketKey);
  }

  @Get('quality/samples')
  @RequirePermissions('coffee:quality')
  qualitySamples(@CurrentUser() user: { organizationId: string }) {
    return this.quality.listSamples(user.organizationId);
  }

  @Get('quality/samples/:sampleKey')
  @RequirePermissions('coffee:quality')
  qualitySampleHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('sampleKey') sampleKey: string,
  ) {
    return this.quality.sampleHistory(user.organizationId, sampleKey);
  }

  @Post('quality/tickets/:ticketKey/start')
  @RequirePermissions('coffee:quality')
  startQuality(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.quality.startSession(user.organizationId, user.id, ticketKey);
  }

  @Post('quality/sessions/:sessionKey/lot')
  @RequirePermissions('coffee:quality')
  qualityIdentifyLot(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: QualityLotDto,
  ) {
    return this.quality.identifyLot(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('quality/sessions/:sessionKey/sample')
  @RequirePermissions('coffee:quality')
  qualityRegisterSample(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: QualitySampleDto,
  ) {
    return this.quality.registerSample(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('quality/sessions/:sessionKey/photos')
  @RequirePermissions('coffee:quality')
  qualityAddPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: PhotoDto,
  ) {
    return this.quality.addPhoto(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('quality/sessions/:sessionKey/parameters')
  @RequirePermissions('coffee:quality')
  qualityParameters(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: QualityDto,
  ) {
    return this.quality.recordParameters(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('quality/sessions/:sessionKey/evaluate')
  @RequirePermissions('coffee:quality')
  qualityEvaluate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.quality.calculateAndApplyRules(user.organizationId, user.id, sessionKey);
  }

  @Post('quality/sessions/:sessionKey/decide')
  @RequirePermissions('coffee:quality')
  qualityDecide(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: QualityDecisionDto,
  ) {
    return this.quality.decide(user.organizationId, user.id, sessionKey, {
      decision: dto.decision as never,
      reason: dto.reason,
      justification: dto.justification,
    });
  }

  @Post('quality/tickets/:ticketKey/reevaluate')
  @RequirePermissions('coffee:quality:decide')
  qualityReevaluate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: QualityReevaluateDto,
  ) {
    return this.quality.reevaluate(user.organizationId, user.id, ticketKey, dto as never);
  }

  @Post('quality/samples/:sampleKey/custody')
  @RequirePermissions('coffee:quality')
  updateSampleCustody(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sampleKey') sampleKey: string,
    @Body() dto: SampleCustodyDto,
  ) {
    return this.quality.updateSampleCustody(user.organizationId, user.id, sampleKey, dto);
  }

  @Get('mobile/quality/pending')
  @RequirePermissions('coffee:quality')
  mobileQualityPending(@CurrentUser() user: { organizationId: string }) {
    return this.quality.listPending(user.organizationId);
  }

  @Post('mobile/quality/:ticketKey')
  @RequirePermissions('coffee:quality')
  mobileQuality(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: QualityDto,
  ) {
    return this.quality.quickEvaluate(user.organizationId, user.id, ticketKey, dto as CpepQualityInput);
  }

  @Get('producers/:producerId/history')
  @RequirePermissions('coffee:read')
  producerHistory(@CurrentUser() user: { organizationId: string }, @Param('producerId') producerId: string) {
    return this.reception.producerHistory(user.organizationId, producerId);
  }

  @Get('settlements')
  @RequirePermissions('coffee:read')
  listSettlements(@CurrentUser() user: { organizationId: string }) {
    return this.settlements.list(user.organizationId);
  }

  @Get('settlements/pending')
  @RequirePermissions('coffee:settle')
  settlementsPending(@CurrentUser() user: { organizationId: string }) {
    return this.settlements.listPending(user.organizationId);
  }

  @Get('settlements/kpis')
  @RequirePermissions('coffee:read')
  settlementsKpis(@CurrentUser() user: { organizationId: string }) {
    return this.settlements.kpis(user.organizationId);
  }

  @Get('settlements/sessions')
  @RequirePermissions('coffee:settle')
  settlementSessions(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.settlements.listSessions(user.organizationId, status);
  }

  @Get('settlements/sessions/:sessionKey')
  @RequirePermissions('coffee:settle')
  settlementSession(
    @CurrentUser() user: { organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.settlements.getSession(user.organizationId, sessionKey);
  }

  @Get('settlements/:settlementKey')
  @RequirePermissions('coffee:read')
  getSettlement(
    @CurrentUser() user: { organizationId: string },
    @Param('settlementKey') settlementKey: string,
  ) {
    return this.settlements.getOne(user.organizationId, settlementKey);
  }

  @Post('settlements/tickets/:ticketKey/start')
  @RequirePermissions('coffee:settle')
  startSettlement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.settlements.startSession(user.organizationId, user.id, ticketKey);
  }

  @Post('settlements/tickets/:ticketKey/simulate')
  @RequirePermissions('coffee:settle')
  simulateSettlement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: SettlementSimulateDto,
  ) {
    return this.settlements.simulate(user.organizationId, user.id, ticketKey, dto as never);
  }

  @Post('settlements/sessions/:sessionKey/simulate')
  @RequirePermissions('coffee:settle')
  resimulateSettlement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: SettlementSimulateDto,
  ) {
    return this.settlements.applyRules(user.organizationId, user.id, sessionKey, dto as never);
  }

  @Post('settlements/sessions/:sessionKey/confirm-operator')
  @RequirePermissions('coffee:settle')
  confirmSettlementOperator(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.settlements.confirmOperator(user.organizationId, user.id, sessionKey);
  }

  @Post('settlements/sessions/:sessionKey/confirm-producer')
  @RequirePermissions('coffee:settle')
  confirmSettlementProducer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: ProducerSignDto,
  ) {
    return this.settlements.confirmProducer(user.organizationId, user.id, sessionKey, dto);
  }

  @Post('settlements/sessions/:sessionKey/register')
  @RequirePermissions('coffee:settle')
  registerSettlement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.settlements.register(user.organizationId, user.id, sessionKey);
  }

  @Post('settlements/:settlementKey/void')
  @RequirePermissions('coffee:settle:void')
  voidSettlement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('settlementKey') settlementKey: string,
    @Body() dto: VoidSettlementDto,
  ) {
    return this.settlements.voidSettlement(user.organizationId, user.id, settlementKey, dto.reason);
  }

  @Post('tickets/:ticketKey/settle')
  @RequirePermissions('coffee:settle')
  settle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: SettlementDto,
  ) {
    return this.settlements.settle(user.organizationId, user.id, ticketKey, dto as CpepSettlementInput);
  }

  @Post('tickets/:ticketKey/payment')
  @RequirePermissions('coffee:settle')
  payment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: PaymentDto,
  ) {
    return this.settlements.registerPayment(user.organizationId, ticketKey, dto.paidAmount, user.id, {
      method: dto.method,
      reference: dto.reference,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      walletProvider: dto.walletProvider,
      deferredUntil: dto.deferredUntil,
      notes: dto.notes,
      payments: dto.payments as never,
    });
  }

  @Get('documents')
  @RequirePermissions('coffee:read')
  listDocuments(@CurrentUser() user: { organizationId: string }, @Query('ticketKey') ticketKey?: string) {
    return this.documents.list(user.organizationId, ticketKey);
  }

  @Get('documents/:documentKey')
  @RequirePermissions('coffee:read')
  getDocument(
    @CurrentUser() user: { organizationId: string },
    @Param('documentKey') documentKey: string,
  ) {
    return this.documents.getOne(user.organizationId, documentKey);
  }

  @Post('documents/:documentKey/reprint')
  @RequirePermissions('coffee:settle')
  reprintDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('documentKey') documentKey: string,
  ) {
    return this.documents.reprint(user.organizationId, user.id, documentKey);
  }

  @Get('mobile/settlements/pending')
  @RequirePermissions('coffee:settle')
  mobileSettlementsPending(@CurrentUser() user: { organizationId: string }) {
    return this.settlements.listPending(user.organizationId);
  }

  @Post('mobile/settlements/:ticketKey')
  @RequirePermissions('coffee:settle')
  mobileSettle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: SettlementDto,
  ) {
    return this.settlements.settle(user.organizationId, user.id, ticketKey, dto as CpepSettlementInput);
  }

  @Post('mobile/settlements/:ticketKey/sign')
  @RequirePermissions('coffee:settle')
  mobileSettlementSign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: ProducerSignDto,
  ) {
    return this.settlements.simulate(user.organizationId, user.id, ticketKey).then(async (session) => {
      await this.settlements.confirmOperator(user.organizationId, user.id, session.sessionKey);
      await this.settlements.confirmProducer(user.organizationId, user.id, session.sessionKey, dto);
      return this.settlements.register(user.organizationId, user.id, session.sessionKey);
    });
  }

  @Post('tickets/:ticketKey/inventory')
  @RequirePermissions('coffee:inventory')
  postInventory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() body?: { warehouse?: string; locationLabel?: string },
  ) {
    return this.inventory.postToInventory(
      user.organizationId,
      user.id,
      ticketKey,
      body?.warehouse,
      body?.locationLabel,
    );
  }

  @Get('inventory')
  @RequirePermissions('coffee:read')
  listInventory(@CurrentUser() user: { organizationId: string }) {
    return this.inventory.list(user.organizationId);
  }

  @Get('inventory/lots')
  @RequirePermissions('coffee:inventory')
  listInventoryLots(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.inventory.listLots(user.organizationId, status);
  }

  @Get('inventory/lots/:lotKey')
  @RequirePermissions('coffee:inventory')
  getInventoryLot(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.inventory.getLot(user.organizationId, lotKey);
  }

  @Get('inventory/qr/:code')
  @RequirePermissions('coffee:inventory')
  inventoryByQr(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.inventory.findByQr(user.organizationId, code);
  }

  @Get('inventory/kardex')
  @RequirePermissions('coffee:inventory')
  inventoryKardex(
    @CurrentUser() user: { organizationId: string },
    @Query('lotKey') lotKey?: string,
    @Query('warehouse') warehouse?: string,
  ) {
    return this.inventory.kardex(user.organizationId, lotKey, warehouse);
  }

  @Get('inventory/costs')
  @RequirePermissions('coffee:inventory')
  inventoryCosts(
    @CurrentUser() user: { organizationId: string },
    @Query('lotKey') lotKey?: string,
  ) {
    return this.inventory.costHistory(user.organizationId, lotKey);
  }

  @Post('inventory/lots/:lotKey/movements')
  @RequirePermissions('coffee:inventory')
  inventoryMovement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('lotKey') lotKey: string,
    @Body() dto: InventoryMovementDto,
  ) {
    return this.inventory.registerMovement(user.organizationId, user.id, lotKey, {
      movementType: dto.movementType as never,
      quantityKg: dto.quantityKg,
      warehouse: dto.warehouse,
      toWarehouse: dto.toWarehouse,
      locationLabel: dto.locationLabel,
      reason: dto.reason,
      unitCost: dto.unitCost,
    });
  }

  @Post('inventory/lots/:lotKey/revalue')
  @RequirePermissions('coffee:inventory')
  inventoryRevalue(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('lotKey') lotKey: string,
    @Body() dto: InventoryRevalueDto,
  ) {
    return this.inventory.revalueLot(user.organizationId, user.id, lotKey, dto.unitCost, dto.reason);
  }

  @Get('traceability/ticket/:ticketKey')
  @RequirePermissions('coffee:read')
  traceByTicket(
    @CurrentUser() user: { organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.traceability.byTicket(user.organizationId, ticketKey);
  }

  @Get('traceability/lot/:lotKey')
  @RequirePermissions('coffee:read')
  traceByLot(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.traceability.byLot(user.organizationId, lotKey);
  }

  @Get('traceability/qr/:code')
  @RequirePermissions('coffee:read')
  traceByQr(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.traceability.byQr(user.organizationId, code);
  }

  @Get('traceability/audit')
  @RequirePermissions('coffee:audit:read')
  traceabilityAudit(@CurrentUser() user: { organizationId: string }) {
    return this.traceability.auditCenter(user.organizationId);
  }

  @Get('mobile/inventory/lots')
  @RequirePermissions('coffee:inventory')
  mobileInventoryLots(@CurrentUser() user: { organizationId: string }) {
    return this.inventory.listLots(user.organizationId);
  }

  @Get('mobile/inventory/qr/:code')
  @RequirePermissions('coffee:inventory')
  mobileInventoryQr(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.traceability.byQr(user.organizationId, code);
  }

  @Get('config/center')
  @RequirePermissions('coffee:config:read')
  getConfigCenter(@CurrentUser() user: { organizationId: string }) {
    return this.configCenter.dashboard(user.organizationId);
  }

  @Post('config/seed')
  @RequirePermissions('coffee:config:manage')
  seedConfig(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.configCenter.seedAll(user.organizationId, user.id);
  }

  @Get('config/prices')
  @RequirePermissions('coffee:config:read')
  listPrices(@CurrentUser() user: { organizationId: string }) {
    return this.config.list(user.organizationId);
  }

  @Post('config/prices')
  @RequirePermissions('coffee:config:manage')
  upsertPrice(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: PriceConfigDto) {
    return this.config.upsert(user.organizationId, dto, user.id, dto.reason);
  }

  @Get('config/catalogs')
  @RequirePermissions('coffee:config:read')
  listCatalogs(
    @CurrentUser() user: { organizationId: string },
    @Query('catalogKey') catalogKey?: string,
    @Query('all') all?: string,
  ) {
    return this.catalogs.list(user.organizationId, catalogKey, all !== 'true');
  }

  @Get('config/catalogs/keys')
  @RequirePermissions('coffee:config:read')
  catalogKeys() {
    return this.catalogs.catalogKeys();
  }

  @Post('config/catalogs')
  @RequirePermissions('coffee:catalog:manage')
  upsertCatalog(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CatalogEntryDto) {
    return this.catalogs.upsert(user.organizationId, user.id, dto as CpepCatalogEntryDefinition, dto.reason);
  }

  @Post('config/catalogs/:catalogKey/:entryKey/deactivate')
  @RequirePermissions('coffee:catalog:manage')
  deactivateCatalog(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('catalogKey') catalogKey: string,
    @Param('entryKey') entryKey: string,
    @Body() dto: ConfigReasonDto,
  ) {
    return this.catalogs.deactivate(user.organizationId, catalogKey, entryKey, user.id, dto.reason);
  }

  @Get('config/parameters')
  @RequirePermissions('coffee:config:read')
  listParameters(@CurrentUser() user: { organizationId: string }, @Query('parameterKey') parameterKey?: string) {
    return this.parameters.list(user.organizationId, parameterKey);
  }

  @Post('config/parameters')
  @RequirePermissions('coffee:config:manage')
  upsertParameter(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: ParameterDto) {
    return this.parameters.upsert(user.organizationId, user.id, dto as CpepParameterDefinition, dto.reason);
  }

  @Post('config/parameters/:id/deactivate')
  @RequirePermissions('coffee:config:manage')
  deactivateParameter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: ConfigReasonDto,
  ) {
    return this.parameters.deactivate(user.organizationId, id, user.id, dto.reason);
  }

  @Get('config/reception-rules')
  @RequirePermissions('coffee:config:read')
  listReceptionRules(@CurrentUser() user: { organizationId: string }) {
    return this.receptionRules.list(user.organizationId);
  }

  @Post('config/reception-rules')
  @RequirePermissions('coffee:config:manage')
  upsertReceptionRule(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: ReceptionRuleDto) {
    return this.receptionRules.upsert(user.organizationId, user.id, dto as CpepReceptionRuleDefinition, dto.reason);
  }

  @Post('config/reception-rules/validate')
  @RequirePermissions('coffee:receive')
  validateReception(@CurrentUser() user: { organizationId: string }, @Body() dto: ValidateReceptionDto) {
    return this.receptionRules.validate(user.organizationId, dto);
  }

  @Post('config/reception-rules/:ruleKey/deactivate')
  @RequirePermissions('coffee:config:manage')
  deactivateReceptionRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ruleKey') ruleKey: string,
    @Body() dto: ConfigReasonDto,
  ) {
    return this.receptionRules.deactivate(user.organizationId, ruleKey, user.id, dto.reason);
  }

  @Get('config/purchase-centers')
  @RequirePermissions('coffee:config:read')
  listPurchaseCenters(@CurrentUser() user: { organizationId: string }, @Query('all') all?: string) {
    return this.purchaseCenters.list(user.organizationId, all !== 'true');
  }

  @Post('config/purchase-centers')
  @RequirePermissions('coffee:config:manage')
  upsertPurchaseCenter(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: PurchaseCenterDto) {
    return this.purchaseCenters.upsert(user.organizationId, user.id, dto, dto.reason);
  }

  @Get('config/changes')
  @RequirePermissions('coffee:audit:read')
  configChanges(
    @CurrentUser() user: { organizationId: string },
    @Query('entityType') entityType?: string,
    @Query('entityKey') entityKey?: string,
  ) {
    return this.configChangelog.findAll(user.organizationId, entityType, entityKey);
  }

  @Get('mobile/config')
  @ApiOperation({ summary: 'Parametrización offline para Android' })
  @RequirePermissions('coffee:config:read')
  mobileConfig(@CurrentUser() user: { organizationId: string }) {
    return this.configCenter.mobileBundle(user.organizationId);
  }

  @Get('wizard/search')
  @RequirePermissions('coffee:receive')
  wizardSearch(
    @CurrentUser() user: { organizationId: string },
    @Query('q') q = '',
    @Query('method') method?: string,
  ) {
    return this.wizard.searchProducers(user.organizationId, q, method);
  }

  @Post('wizard/arrival')
  @RequirePermissions('coffee:receive')
  wizardArrival(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: WizardArrivalDto) {
    return this.wizard.startArrival(user.organizationId, user.id, dto);
  }

  @Get('wizard/:ticketKey')
  @RequirePermissions('coffee:receive')
  wizardState(@CurrentUser() user: { organizationId: string }, @Param('ticketKey') ticketKey: string) {
    return this.wizard.getWizardState(user.organizationId, ticketKey);
  }

  @Post('wizard/:ticketKey/producer')
  @RequirePermissions('coffee:receive')
  wizardProducer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WizardProducerDto,
  ) {
    return this.wizard.applyProducer(user.organizationId, user.id, ticketKey, dto.producerId);
  }

  @Post('wizard/:ticketKey/origin')
  @RequirePermissions('coffee:receive')
  wizardOrigin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WizardOriginDto,
  ) {
    return this.wizard.selectOrigin(user.organizationId, user.id, ticketKey, dto);
  }

  @Post('wizard/:ticketKey/vehicle')
  @RequirePermissions('coffee:receive')
  wizardVehicle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WizardVehicleDto,
  ) {
    return this.wizard.registerVehicle(user.organizationId, user.id, ticketKey, dto);
  }

  @Post('wizard/:ticketKey/photos')
  @RequirePermissions('coffee:receive')
  wizardPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: PhotoDto,
  ) {
    return this.wizard.addOptionalPhoto(user.organizationId, user.id, ticketKey, dto);
  }

  @Post('wizard/:ticketKey/turn')
  @RequirePermissions('coffee:receive')
  wizardTurn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WizardTurnDto,
  ) {
    return this.wizard.assignTurnStep(user.organizationId, user.id, ticketKey, dto);
  }

  @Post('wizard/:ticketKey/confirm')
  @RequirePermissions('coffee:receive')
  wizardConfirm(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WizardConfirmDto,
  ) {
    return this.wizard.confirmEntry(user.organizationId, user.id, ticketKey, dto.signerName, dto.signatureData);
  }

  @Post('wizard/:ticketKey/to-weighing')
  @RequirePermissions('coffee:receive')
  wizardToWeighing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.wizard.sendToWeighing(user.organizationId, user.id, ticketKey);
  }

  @Post('gate/validate')
  @RequirePermissions('coffee:receive')
  gateValidate(@CurrentUser() user: { organizationId: string }, @Body() dto: GateValidateDto) {
    return this.gate.validateProducerIntake(user.organizationId, dto);
  }

  @Get('turns/queue')
  @RequirePermissions('coffee:read')
  turnsQueue(
    @CurrentUser() user: { organizationId: string },
    @Query('purchaseCenterId') purchaseCenterId?: string,
  ) {
    return this.turnService.listQueue(user.organizationId, purchaseCenterId);
  }

  @Get('turns/history')
  @RequirePermissions('coffee:read')
  turnHistory(@CurrentUser() user: { organizationId: string }) {
    return this.turnService.history(user.organizationId);
  }

  @Get('turns/metrics')
  @RequirePermissions('coffee:read')
  turnMetrics(@CurrentUser() user: { organizationId: string }) {
    return this.turnService.metrics(user.organizationId);
  }

  @Public()
  @Get('turns/public/:organizationId')
  @ApiOperation({ summary: 'Pantalla pública de turnos' })
  publicTurns(@Param('organizationId') organizationId: string) {
    return this.turnService.publicBoard(organizationId);
  }

  @Post('turns/reorder')
  @RequirePermissions('coffee:receive')
  reorderTurns(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: ReorderTurnsDto) {
    return this.turnService.reorder(user.organizationId, user.id, dto.orderedTicketKeys);
  }

  @Post('turns/call-next')
  @RequirePermissions('coffee:receive')
  callNext(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('purchaseCenterId') purchaseCenterId?: string,
  ) {
    return this.turnService.callNext(user.organizationId, user.id, purchaseCenterId);
  }

  @Post('turns/:ticketKey/priority')
  @RequirePermissions('coffee:receive')
  setTurnPriority(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: PriorityTurnDto,
  ) {
    return this.turnService.setPriority(user.organizationId, user.id, ticketKey, dto.priority, dto.preferential);
  }

  @Post('turns/:ticketKey/call')
  @RequirePermissions('coffee:receive')
  callTurn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.turnService.callTurn(user.organizationId, user.id, ticketKey);
  }

  @Post('turns/:ticketKey/start')
  @RequirePermissions('coffee:receive')
  startAttention(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.turnService.startAttention(user.organizationId, user.id, ticketKey);
  }

  @Post('turns/:ticketKey/complete')
  @RequirePermissions('coffee:receive')
  completeAttention(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
  ) {
    return this.turnService.completeAttention(user.organizationId, user.id, ticketKey);
  }

  @Get('ai/analysis')
  @RequirePermissions('coffee:read')
  aiAnalysis(@CurrentUser() user: { organizationId: string }) {
    return this.ai.analyze(user.organizationId);
  }

  @Get('lookups/producers')
  @RequirePermissions('coffee:read')
  searchProducers(@CurrentUser() user: { organizationId: string }, @Query('q') q = '') {
    return this.lookup.findProducer(user.organizationId, q);
  }

  @Get('lookups/producers/:producerId')
  @RequirePermissions('coffee:read')
  getProducer(@CurrentUser() user: { organizationId: string }, @Param('producerId') producerId: string) {
    return this.lookup.getProducer(user.organizationId, producerId);
  }

  @Get('lookups/farms')
  @RequirePermissions('coffee:read')
  listFarms(@CurrentUser() user: { organizationId: string }, @Query('producerId') producerId?: string) {
    return this.lookup.listFarms(user.organizationId, producerId);
  }

  @Get('lookups/farms/:farmId')
  @RequirePermissions('coffee:read')
  getFarm(@CurrentUser() user: { organizationId: string }, @Param('farmId') farmId: string) {
    return this.lookup.getFarm(user.organizationId, farmId);
  }

  @Get('lookups/lots')
  @RequirePermissions('coffee:read')
  listLots(@CurrentUser() user: { organizationId: string }, @Query('farmId') farmId?: string) {
    return this.lookup.listLots(user.organizationId, farmId);
  }

  @Get('iot/scales')
  @RequirePermissions('coffee:weigh')
  listScales(@CurrentUser() user: { organizationId: string }) {
    return this.iot.listScales(user.organizationId);
  }

  @Post('tickets/:ticketKey/weigh/iot')
  @RequirePermissions('coffee:weigh')
  weighIot(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: IotWeighDto,
  ) {
    return this.iot.captureFromScale(
      user.organizationId,
      user.id,
      ticketKey,
      dto.deviceKey,
      (dto.weighingType as 'gross' | 'tare') ?? 'gross',
    );
  }

  @Get('weighing/pending')
  @RequirePermissions('coffee:weigh')
  weighingPending(
    @CurrentUser() user: { organizationId: string },
    @Query('purchaseCenterId') purchaseCenterId?: string,
  ) {
    return this.weighing.listPending(user.organizationId, purchaseCenterId);
  }

  @Get('weighing/sessions')
  @RequirePermissions('coffee:weigh')
  weighingSessions(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.weighing.listSessions(user.organizationId, status);
  }

  @Get('weighing/sessions/:sessionKey')
  @RequirePermissions('coffee:weigh')
  weighingSession(
    @CurrentUser() user: { organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.getSession(user.organizationId, sessionKey);
  }

  @Get('weighing/history')
  @RequirePermissions('coffee:weigh')
  weighingHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('ticketKey') ticketKey?: string,
  ) {
    return this.weighing.history(user.organizationId, ticketKey);
  }

  @Get('weighing/alerts')
  @RequirePermissions('coffee:weigh')
  weighingAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.weighing.listAlerts(user.organizationId, all !== 'true');
  }

  @Get('weighing/monitor')
  @RequirePermissions('coffee:weigh')
  weighingMonitor(@CurrentUser() user: { organizationId: string }) {
    return this.weighing.monitor(user.organizationId);
  }

  @Post('weighing/tickets/:ticketKey/start')
  @RequirePermissions('coffee:weigh')
  startWeighing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: StartWeighingDto,
  ) {
    return this.weighing.startSession(user.organizationId, user.id, ticketKey, dto);
  }

  @Post('weighing/sessions/:sessionKey/scale')
  @RequirePermissions('coffee:weigh')
  selectWeighingScale(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: { scaleKey: string },
  ) {
    return this.weighing.selectScale(user.organizationId, user.id, sessionKey, dto.scaleKey);
  }

  @Post('weighing/sessions/:sessionKey/verify')
  @RequirePermissions('coffee:weigh')
  verifyWeighingScale(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.verifyScale(user.organizationId, user.id, sessionKey);
  }

  @Post('weighing/sessions/:sessionKey/capture')
  @RequirePermissions('coffee:weigh')
  captureWeighingReading(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: CaptureReadingDto,
  ) {
    return this.weighing.captureReading(user.organizationId, user.id, sessionKey, {
      ...dto,
      weighingType: (dto.weighingType as 'gross' | 'tare') ?? 'gross',
    });
  }

  @Post('weighing/sessions/:sessionKey/confirm-gross')
  @RequirePermissions('coffee:weigh')
  confirmGross(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.confirmGross(user.organizationId, user.id, sessionKey);
  }

  @Post('weighing/sessions/:sessionKey/confirm-tare')
  @RequirePermissions('coffee:weigh')
  confirmTare(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Query('skip') skip?: string,
  ) {
    return this.weighing.confirmTare(user.organizationId, user.id, sessionKey, skip === 'true');
  }

  @Post('weighing/sessions/:sessionKey/validate')
  @RequirePermissions('coffee:weigh')
  validateWeighing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.validateSession(user.organizationId, user.id, sessionKey);
  }

  @Post('weighing/sessions/:sessionKey/confirm')
  @RequirePermissions('coffee:weigh')
  confirmWeighing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.confirmFinal(user.organizationId, user.id, sessionKey);
  }

  @Post('weighing/sessions/:sessionKey/to-quality')
  @RequirePermissions('coffee:weigh')
  sendWeighingToQuality(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.weighing.sendToQuality(user.organizationId, user.id, sessionKey);
  }

  @Post('weighing/sessions/:sessionKey/contingency')
  @RequirePermissions('coffee:weigh:manual')
  enableContingency(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: ContingencyDto,
  ) {
    return this.weighing.enableContingency(
      user.organizationId,
      user.id,
      sessionKey,
      dto.reason,
      dto.authorizedBy,
    );
  }

  @Post('weighing/sessions/:sessionKey/manual')
  @RequirePermissions('coffee:weigh:manual')
  manualWeighing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('sessionKey') sessionKey: string,
    @Body() dto: ManualWeighDto,
  ) {
    return this.weighing.manualCapture(user.organizationId, user.id, sessionKey, {
      weighingType: (dto.weighingType as 'gross' | 'tare') ?? 'gross',
      weightKg: dto.weightKg,
      reason: dto.reason,
      photoUrl: dto.photoUrl,
    });
  }

  @Post('weighing/sync-contingency')
  @RequirePermissions('coffee:weigh')
  syncContingency(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.weighing.syncPendingContingency(user.organizationId, user.id);
  }

  @Get('scales')
  @RequirePermissions('coffee:weigh')
  listRegisteredScales(
    @CurrentUser() user: { organizationId: string },
    @Query('purchaseCenterId') purchaseCenterId?: string,
  ) {
    return this.scales.list(user.organizationId, purchaseCenterId);
  }

  @Post('scales')
  @RequirePermissions('coffee:weigh:configure')
  upsertScale(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: ScaleDto) {
    return this.scales.upsert(user.organizationId, user.id, dto as never);
  }

  @Get('scales/:scaleKey/diagnose')
  @RequirePermissions('coffee:weigh')
  diagnoseScale(
    @CurrentUser() user: { organizationId: string },
    @Param('scaleKey') scaleKey: string,
  ) {
    return this.scales.diagnose(user.organizationId, scaleKey);
  }

  @Post('scales/:scaleKey/heartbeat')
  @RequirePermissions('coffee:weigh')
  scaleHeartbeat(
    @CurrentUser() user: { organizationId: string },
    @Param('scaleKey') scaleKey: string,
    @Body() dto: ScaleHeartbeatDto,
  ) {
    return this.scales.heartbeat(user.organizationId, scaleKey, dto);
  }

  @Post('scales/sync-iot')
  @RequirePermissions('coffee:weigh:configure')
  syncScalesFromIot(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.scales.syncFromIot(user.organizationId, user.id);
  }

  @Get('mobile/weighing/pending')
  @RequirePermissions('coffee:weigh')
  mobileWeighingPending(@CurrentUser() user: { organizationId: string }) {
    return this.weighing.listPending(user.organizationId);
  }

  @Post('mobile/weighing/:ticketKey')
  @RequirePermissions('coffee:weigh')
  mobileWeigh(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('ticketKey') ticketKey: string,
    @Body() dto: WeighDto,
  ) {
    return this.weighing.quickWeigh(user.organizationId, user.id, ticketKey, {
      ...dto,
      contingency: dto.contingency ?? dto.source === 'manual_contingency',
    });
  }

  @Get('purchases/today')
  @RequirePermissions('coffee:read')
  purchasesToday(@CurrentUser() user: { organizationId: string }) {
    return this.stats.purchasesToday(user.organizationId);
  }

  @Get('kpis')
  @RequirePermissions('coffee:read')
  kpis(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('days') days?: string,
  ) {
    return this.stats.kpis(user.organizationId, days ? Number(days) : 30, user.id);
  }

  @Get('statistics')
  @RequirePermissions('coffee:read')
  statistics(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.stats.statistics(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('coffee:audit:read')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }

  @Get('mobile/queue')
  @ApiOperation({ summary: 'Cola móvil offline-ready' })
  @RequirePermissions('coffee:read')
  mobileQueue(@CurrentUser() user: { organizationId: string }) {
    return this.reception.listQueue(user.organizationId);
  }

  @Post('mobile/tickets')
  @ApiOperation({ summary: 'Recepción móvil' })
  @RequirePermissions('coffee:receive')
  mobileCreate(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateTicketDto) {
    return this.reception.create(user.organizationId, user.id, dto as CpepTicketDefinition);
  }
}
