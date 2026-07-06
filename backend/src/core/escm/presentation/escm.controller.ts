import { Body, Controller, Get, Header, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EscmConfigService } from '../application/escm-config.service';
import { EscmCatalogService } from '../application/escm-catalog.service';
import { EscmParameterService } from '../application/escm-parameter.service';
import { EscmCustomerService } from '../application/escm-customer.service';
import { EscmPriceListService, EscmCommercialService } from '../application/escm-price-list.service';
import { EscmAuditService } from '../application/escm-audit.service';
import { EscmPipelineService } from '../application/escm-pipeline.service';
import { EscmCrmService } from '../application/escm-crm.service';
import { EscmOpportunityService } from '../application/escm-opportunity.service';
import { EscmQuotationService } from '../application/escm-quotation.service';
import { EscmOrderService } from '../application/escm-order.service';
import { EscmOrderApprovalService } from '../application/escm-order-approval.service';
import { EscmOrderReservationService } from '../application/escm-order-reservation.service';
import { EscmTransportService } from '../application/escm-transport.service';
import { EscmPickingService } from '../application/escm-picking.service';
import { EscmDispatchService } from '../application/escm-dispatch.service';
import { EscmLogisticsDocumentService, EscmRouteService } from '../application/escm-logistics-document.service';
import {
  EscmDeliveryService,
  EscmLogisticsIncidentService,
  EscmLogisticsCenterService,
} from '../application/escm-delivery.service';
import { EscmTaxService } from '../application/escm-tax.service';
import { EscmInvoiceService } from '../application/escm-invoice.service';
import { EscmReturnService } from '../application/escm-return.service';
import { EscmWarrantyService } from '../application/escm-warranty.service';
import { EscmNoteService } from '../application/escm-note.service';
import { EscmBillingDocumentService } from '../application/escm-billing-document.service';
import { EscmBillingCenterService } from '../application/escm-billing-center.service';
import { EscmReceivableService } from '../application/escm-receivable.service';
import { EscmPaymentService } from '../application/escm-payment.service';
import { EscmCollectionService } from '../application/escm-collection.service';
import { EscmAgreementService } from '../application/escm-agreement.service';
import { EscmArDocumentService } from '../application/escm-ar-document.service';
import { EscmArCenterService } from '../application/escm-ar-center.service';
import { EscmOpsCenterService } from '../application/escm-ops-center.service';
import { EscmKpiService } from '../application/escm-kpi.service';
import { EscmAnalyticsService } from '../application/escm-analytics.service';
import { EscmReportService } from '../application/escm-report.service';
import { EscmOpsAlertService } from '../application/escm-ops-alert.service';
import { EscmAiInsightsService } from '../application/escm-ai-insights.service';
import { EscmAnalyticsAuditService } from '../application/escm-analytics-audit.service';
import {
  EscmAddressDto,
  EscmCatalogDto,
  EscmCommercialConditionDto,
  EscmContactDto,
  EscmCustomerDto,
  EscmParameterDto,
  EscmPriceListDto,
  EscmPriceListItemDto,
  EscmResolvePriceDto,
  EscmVisitDto,
  EscmVisitSyncDto,
  EscmProspectDto,
  EscmOpportunityDto,
  EscmOpportunityStageDto,
  EscmInteractionDto,
  EscmActivityDto,
  EscmQuotationDto,
  EscmQuotationSimulateDto,
  EscmQuotationApproveDto,
  EscmConvertQuotationDto,
  EscmOrderDto,
  EscmOrderSubmitDto,
  EscmOrderTransitionDto,
  EscmOrderPartialDto,
  EscmOrderConsolidateDto,
  EscmOrderScheduleDto,
  EscmOrderApprovalDto,
  EscmOrderReservationDto,
  EscmOrderSyncDto,
  EscmApprovalPolicyDto,
  EscmCarrierDto,
  EscmVehicleDto,
  EscmDriverDto,
  EscmPickWaveDto,
  EscmPickTaskDto,
  EscmDispatchDto,
  EscmDispatchShipDto,
  EscmRouteDto,
  EscmDeliveryDto,
  EscmIncidentDto,
  EscmDeliverySyncDto,
  EscmPipelineStageDto,
  EscmOpportunitySyncDto,
  EscmTaxRuleDto,
  EscmInvoiceDto,
  EscmInvoiceFromOrderDto,
  EscmInvoiceConsolidateDto,
  EscmInvoiceRecurringDto,
  EscmInvoiceVoidDto,
  EscmReturnDto,
  EscmReturnRejectDto,
  EscmWarrantyDto,
  EscmWarrantyApproveDto,
  EscmWarrantyRejectDto,
  EscmWarrantyResolveDto,
  EscmCreditNoteDto,
  EscmDebitNoteDto,
  EscmWarrantySyncDto,
  EscmPaymentDto,
  EscmPaymentVoidDto,
  EscmCollectionCampaignDto,
  EscmCollectionCallDto,
  EscmCollectionEscalateDto,
  EscmPaymentAgreementDto,
  EscmPaymentPromiseDto,
  EscmPaymentPromiseSyncDto,
  EscmOpsFiltersDto,
  EscmReportExportDto,
  EscmCustomReportDto,
  EscmSalesTargetDto,
} from './escm.dto';

@ApiTags('ESCM — Enterprise Sales & Commercial Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('escm')
export class EscmController {
  constructor(
    private readonly config: EscmConfigService,
    private readonly catalogs: EscmCatalogService,
    private readonly parameters: EscmParameterService,
    private readonly customers: EscmCustomerService,
    private readonly priceLists: EscmPriceListService,
    private readonly commercial: EscmCommercialService,
    private readonly audit: EscmAuditService,
    private readonly pipeline: EscmPipelineService,
    private readonly crm: EscmCrmService,
    private readonly opportunities: EscmOpportunityService,
    private readonly quotations: EscmQuotationService,
    private readonly orders: EscmOrderService,
    private readonly orderApprovals: EscmOrderApprovalService,
    private readonly orderReservations: EscmOrderReservationService,
    private readonly transport: EscmTransportService,
    private readonly picking: EscmPickingService,
    private readonly dispatches: EscmDispatchService,
    private readonly routes: EscmRouteService,
    private readonly deliveries: EscmDeliveryService,
    private readonly incidents: EscmLogisticsIncidentService,
    private readonly logisticsCenter: EscmLogisticsCenterService,
    private readonly logisticsDocuments: EscmLogisticsDocumentService,
    private readonly taxRules: EscmTaxService,
    private readonly invoices: EscmInvoiceService,
    private readonly returns: EscmReturnService,
    private readonly warranties: EscmWarrantyService,
    private readonly notes: EscmNoteService,
    private readonly billingDocuments: EscmBillingDocumentService,
    private readonly billingCenter: EscmBillingCenterService,
    private readonly receivables: EscmReceivableService,
    private readonly payments: EscmPaymentService,
    private readonly collections: EscmCollectionService,
    private readonly agreements: EscmAgreementService,
    private readonly arDocuments: EscmArDocumentService,
    private readonly arCenter: EscmArCenterService,
    private readonly opsCenterService: EscmOpsCenterService,
    private readonly kpi: EscmKpiService,
    private readonly analytics: EscmAnalyticsService,
    private readonly reports: EscmReportService,
    private readonly opsAlerts: EscmOpsAlertService,
    private readonly aiInsights: EscmAiInsightsService,
    private readonly analyticsAudit: EscmAnalyticsAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('sales:read')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.config.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('sales:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.config.seed(user.organizationId, user.id);
  }

  @Get('catalogs/keys')
  @RequirePermissions('sales:read')
  catalogKeys() {
    return this.catalogs.catalogKeys();
  }

  @Get('catalogs')
  @RequirePermissions('sales:read')
  listCatalogs(
    @CurrentUser() user: { organizationId: string },
    @Query('catalogKey') catalogKey?: string,
    @Query('all') all?: string,
  ) {
    return this.catalogs.list(user.organizationId, catalogKey, all === 'true');
  }

  @Post('catalogs')
  @RequirePermissions('sales:catalog')
  upsertCatalog(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCatalogDto,
  ) {
    return this.catalogs.upsert(user.organizationId, user.id, dto);
  }

  @Get('parameters')
  @RequirePermissions('sales:read')
  listParameters(@CurrentUser() user: { organizationId: string }) {
    return this.parameters.list(user.organizationId);
  }

  @Post('parameters')
  @RequirePermissions('sales:config')
  upsertParameter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmParameterDto,
  ) {
    return this.parameters.upsert(user.organizationId, user.id, dto);
  }

  @Get('audit')
  @RequirePermissions('sales:audit')
  listAudit(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }

  @Get('customers')
  @RequirePermissions('sales:read')
  listCustomers(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerType') customerType?: string,
    @Query('segmentKey') segmentKey?: string,
    @Query('channelKey') channelKey?: string,
    @Query('q') q?: string,
  ) {
    return this.customers.list(user.organizationId, {
      status,
      customerType,
      segmentKey,
      channelKey,
      q,
    });
  }

  @Get('customers/:customerKey')
  @RequirePermissions('sales:read')
  getCustomer(
    @CurrentUser() user: { organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.customers.getOne(user.organizationId, customerKey);
  }

  @Post('customers')
  @RequirePermissions('sales:customer')
  createCustomer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCustomerDto,
  ) {
    return this.customers.create(user.organizationId, user.id, dto as never);
  }

  @Put('customers/:customerKey')
  @RequirePermissions('sales:customer')
  updateCustomer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.customers.update(user.organizationId, user.id, customerKey, dto);
  }

  @Post('customers/:customerKey/contacts')
  @RequirePermissions('sales:customer')
  addContact(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: EscmContactDto,
  ) {
    return this.customers.addContact(user.organizationId, user.id, customerKey, dto);
  }

  @Post('customers/:customerKey/addresses')
  @RequirePermissions('sales:customer')
  addAddress(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: EscmAddressDto,
  ) {
    return this.customers.addAddress(user.organizationId, user.id, customerKey, dto);
  }

  @Post('customers/:customerKey/visits')
  @RequirePermissions('sales:customer')
  recordVisit(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: EscmVisitDto,
  ) {
    return this.customers.recordVisit(user.organizationId, user.id, customerKey, dto);
  }

  @Get('crm/:customerKey')
  @RequirePermissions('sales:read')
  crmPanel(
    @CurrentUser() user: { organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.customers.crmPanel(user.organizationId, customerKey);
  }

  @Get('history')
  @RequirePermissions('sales:read')
  commercialHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
  ) {
    return this.customers.commercialHistory(user.organizationId, customerKey);
  }

  @Get('price-lists')
  @RequirePermissions('sales:read')
  listPriceLists(@CurrentUser() user: { organizationId: string }) {
    return this.priceLists.list(user.organizationId);
  }

  @Get('price-lists/:priceListKey')
  @RequirePermissions('sales:read')
  getPriceList(
    @CurrentUser() user: { organizationId: string },
    @Param('priceListKey') priceListKey: string,
  ) {
    return this.priceLists.getOne(user.organizationId, priceListKey);
  }

  @Post('price-lists')
  @RequirePermissions('sales:pricing')
  upsertPriceList(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPriceListDto,
  ) {
    return this.priceLists.upsert(user.organizationId, user.id, dto);
  }

  @Post('price-lists/:priceListKey/items')
  @RequirePermissions('sales:pricing')
  upsertPriceListItem(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('priceListKey') priceListKey: string,
    @Body() dto: EscmPriceListItemDto,
  ) {
    return this.priceLists.upsertItem(user.organizationId, user.id, priceListKey, dto);
  }

  @Post('pricing/resolve')
  @RequirePermissions('sales:read')
  resolvePrice(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: EscmResolvePriceDto,
  ) {
    return this.priceLists.resolvePrice(user.organizationId, dto);
  }

  @Get('conditions')
  @RequirePermissions('sales:read')
  listConditions(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
  ) {
    return this.commercial.listConditions(user.organizationId, customerKey);
  }

  @Post('conditions')
  @RequirePermissions('sales:config')
  upsertCondition(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCommercialConditionDto,
  ) {
    return this.commercial.upsertCondition(user.organizationId, user.id, dto);
  }

  @Get('discount-rules')
  @RequirePermissions('sales:read')
  listDiscountRules(@CurrentUser() user: { organizationId: string }) {
    return this.commercial.listDiscountRules(user.organizationId);
  }

  @Post('discount-rules')
  @RequirePermissions('sales:config')
  upsertDiscountRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: Record<string, unknown>,
  ) {
    return this.commercial.upsertDiscountRule(user.organizationId, user.id, dto);
  }

  @Get('promotions')
  @RequirePermissions('sales:read')
  listPromotions(@CurrentUser() user: { organizationId: string }) {
    return this.commercial.listPromotions(user.organizationId);
  }

  @Post('promotions')
  @RequirePermissions('sales:config')
  upsertPromotion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: Record<string, unknown>,
  ) {
    return this.commercial.upsertPromotion(user.organizationId, user.id, dto);
  }

  @Get('credit-policies')
  @RequirePermissions('sales:read')
  listCreditPolicies(@CurrentUser() user: { organizationId: string }) {
    return this.commercial.listCreditPolicies(user.organizationId);
  }

  @Post('credit-policies')
  @RequirePermissions('sales:config')
  upsertCreditPolicy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: Record<string, unknown>,
  ) {
    return this.commercial.upsertCreditPolicy(user.organizationId, user.id, dto);
  }

  @Post('customers/:customerKey/credit-limit')
  @RequirePermissions('sales:config')
  upsertCreditLimit(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: { creditLimit: number; currencyKey?: string },
  ) {
    return this.commercial.upsertCreditLimit(user.organizationId, user.id, customerKey, dto);
  }

  @Post('customers/:customerKey/pricing')
  @RequirePermissions('sales:pricing')
  upsertCustomerPricing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
    @Body() dto: { itemKey: string; unitPrice: number; currencyKey?: string },
  ) {
    return this.commercial.upsertCustomerPricing(user.organizationId, user.id, customerKey, dto);
  }

  @Post('pricing/regional')
  @RequirePermissions('sales:pricing')
  upsertRegionalPricing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: { regionKey: string; itemKey: string; unitPrice: number; currencyKey?: string },
  ) {
    return this.commercial.upsertRegionalPricing(user.organizationId, user.id, dto);
  }

  @Post('pricing/season')
  @RequirePermissions('sales:pricing')
  upsertSeasonPricing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: {
      seasonKey: string;
      itemKey: string;
      unitPrice: number;
      validFrom: string;
      validTo: string;
      currencyKey?: string;
    },
  ) {
    return this.commercial.upsertSeasonPricing(user.organizationId, user.id, dto);
  }

  @Get('mobile/customers')
  @RequirePermissions('sales:read')
  mobileCustomers(@CurrentUser() user: { organizationId: string }) {
    return this.customers.list(user.organizationId, { status: 'active' });
  }

  @Get('mobile/customers/:customerKey')
  @RequirePermissions('sales:read')
  mobileCustomer(
    @CurrentUser() user: { organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.customers.getOne(user.organizationId, customerKey);
  }

  @Post('mobile/pricing/resolve')
  @RequirePermissions('sales:read')
  mobileResolvePrice(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: EscmResolvePriceDto,
  ) {
    return this.priceLists.resolvePrice(user.organizationId, dto);
  }

  @Post('mobile/visits/sync')
  @RequirePermissions('sales:customer')
  mobileSyncVisits(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmVisitSyncDto,
  ) {
    return this.customers.syncVisits(user.organizationId, user.id, dto.visits as never);
  }

  @Get('crm/dashboard')
  @RequirePermissions('sales:crm')
  crmDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.crm.crmDashboard(user.organizationId);
  }

  @Get('crm/timeline/:customerKey')
  @RequirePermissions('sales:crm')
  customerTimeline(
    @CurrentUser() user: { organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.crm.customerTimeline(user.organizationId, customerKey);
  }

  @Get('pipeline/stages')
  @RequirePermissions('sales:read')
  listPipelineStages(@CurrentUser() user: { organizationId: string }) {
    return this.pipeline.list(user.organizationId);
  }

  @Post('pipeline/stages')
  @RequirePermissions('sales:config')
  upsertPipelineStage(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPipelineStageDto,
  ) {
    return this.pipeline.upsert(user.organizationId, user.id, dto);
  }

  @Post('pipeline/seed')
  @RequirePermissions('sales:config')
  seedPipeline(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.pipeline.seedDefaults(user.organizationId, user.id);
  }

  @Get('pipeline')
  @RequirePermissions('sales:opportunity')
  pipelineView(@CurrentUser() user: { organizationId: string }) {
    return this.opportunities.pipelineView(user.organizationId);
  }

  @Get('prospects')
  @RequirePermissions('sales:crm')
  listProspects(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.crm.listProspects(user.organizationId, status);
  }

  @Post('prospects')
  @RequirePermissions('sales:crm')
  createProspect(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmProspectDto,
  ) {
    return this.crm.createProspect(user.organizationId, user.id, dto);
  }

  @Post('prospects/:prospectKey/convert')
  @RequirePermissions('sales:crm')
  convertProspect(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('prospectKey') prospectKey: string,
    @Body() dto: { customerKey: string },
  ) {
    return this.crm.convertProspect(user.organizationId, user.id, prospectKey, dto.customerKey);
  }

  @Get('opportunities')
  @RequirePermissions('sales:opportunity')
  listOpportunities(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('stageKey') stageKey?: string,
    @Query('customerKey') customerKey?: string,
    @Query('q') q?: string,
  ) {
    return this.opportunities.list(user.organizationId, { status, stageKey, customerKey, q });
  }

  @Get('opportunities/:opportunityKey')
  @RequirePermissions('sales:opportunity')
  getOpportunity(
    @CurrentUser() user: { organizationId: string },
    @Param('opportunityKey') opportunityKey: string,
  ) {
    return this.opportunities.getOne(user.organizationId, opportunityKey);
  }

  @Post('opportunities')
  @RequirePermissions('sales:opportunity')
  createOpportunity(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOpportunityDto,
  ) {
    return this.opportunities.create(user.organizationId, user.id, dto as never);
  }

  @Put('opportunities/:opportunityKey')
  @RequirePermissions('sales:opportunity')
  updateOpportunity(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('opportunityKey') opportunityKey: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.opportunities.update(user.organizationId, user.id, opportunityKey, dto);
  }

  @Post('opportunities/:opportunityKey/stage')
  @RequirePermissions('sales:opportunity')
  changeOpportunityStage(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('opportunityKey') opportunityKey: string,
    @Body() dto: EscmOpportunityStageDto,
  ) {
    return this.opportunities.changeStage(user.organizationId, user.id, opportunityKey, dto);
  }

  @Get('interactions')
  @RequirePermissions('sales:crm')
  listInteractions(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
    @Query('opportunityKey') opportunityKey?: string,
  ) {
    return this.crm.listInteractions(user.organizationId, { customerKey, opportunityKey });
  }

  @Post('interactions')
  @RequirePermissions('sales:crm')
  recordInteraction(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmInteractionDto,
  ) {
    return this.crm.recordInteraction(user.organizationId, user.id, dto);
  }

  @Get('activities')
  @RequirePermissions('sales:crm')
  listActivities(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.crm.listActivities(user.organizationId, { status, from, to });
  }

  @Post('activities')
  @RequirePermissions('sales:crm')
  createActivity(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmActivityDto,
  ) {
    return this.crm.createActivity(user.organizationId, user.id, dto);
  }

  @Post('activities/:activityKey/complete')
  @RequirePermissions('sales:crm')
  completeActivity(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('activityKey') activityKey: string,
  ) {
    return this.crm.completeActivity(user.organizationId, user.id, activityKey);
  }

  @Get('quotations')
  @RequirePermissions('sales:quotation')
  listQuotations(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.quotations.list(user.organizationId, { status, customerKey });
  }

  @Get('quotations/:quotationKey')
  @RequirePermissions('sales:quotation')
  getQuotation(
    @CurrentUser() user: { organizationId: string },
    @Param('quotationKey') quotationKey: string,
  ) {
    return this.quotations.getOne(user.organizationId, quotationKey);
  }

  @Get('quotations/group/:quoteGroupKey/versions')
  @RequirePermissions('sales:quotation')
  quotationVersions(
    @CurrentUser() user: { organizationId: string },
    @Param('quoteGroupKey') quoteGroupKey: string,
  ) {
    return this.quotations.compareVersions(user.organizationId, quoteGroupKey);
  }

  @Post('quotations')
  @RequirePermissions('sales:quotation')
  createQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmQuotationDto,
  ) {
    return this.quotations.create(user.organizationId, user.id, dto as never);
  }

  @Post('quotations/:quotationKey/version')
  @RequirePermissions('sales:quotation')
  versionQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.quotations.newVersion(user.organizationId, user.id, quotationKey, dto as never);
  }

  @Post('quotations/:quotationKey/duplicate')
  @RequirePermissions('sales:quotation')
  duplicateQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
  ) {
    return this.quotations.duplicate(user.organizationId, user.id, quotationKey);
  }

  @Post('quotations/simulate')
  @RequirePermissions('sales:quotation')
  simulateQuotation(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: EscmQuotationSimulateDto,
  ) {
    return this.quotations.simulate(user.organizationId, dto as never);
  }

  @Post('quotations/:quotationKey/send')
  @RequirePermissions('sales:quotation')
  sendQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
  ) {
    return this.quotations.send(user.organizationId, user.id, quotationKey);
  }

  @Post('quotations/:quotationKey/approve')
  @RequirePermissions('sales:quotation')
  approveQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
    @Body() dto: EscmQuotationApproveDto,
  ) {
    return this.quotations.approve(user.organizationId, user.id, quotationKey, dto.signatureUrl);
  }

  @Post('quotations/:quotationKey/reject')
  @RequirePermissions('sales:quotation')
  rejectQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
    @Body() dto: { rejectionReason?: string },
  ) {
    return this.quotations.reject(user.organizationId, user.id, quotationKey, dto.rejectionReason);
  }

  @Post('quotations/:quotationKey/convert')
  @RequirePermissions('sales:quotation')
  convertQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
    @Body() dto: EscmConvertQuotationDto,
  ) {
    return this.orders.convertFromQuotation(user.organizationId, user.id, quotationKey, dto);
  }

  @Get('orders')
  @RequirePermissions('sales:read')
  listOrders(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
    @Query('orderType') orderType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.orders.list(user.organizationId, { status, customerKey, orderType, from, to });
  }

  @Get('orders/center')
  @RequirePermissions('sales:read')
  orderCenter(@CurrentUser() user: { organizationId: string }) {
    return this.orders.orderCenter(user.organizationId);
  }

  @Post('orders')
  @RequirePermissions('sales:order')
  createOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOrderDto,
  ) {
    return this.orders.create(user.organizationId, user.id, dto as never);
  }

  @Put('orders/:orderKey')
  @RequirePermissions('sales:order')
  updateOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmOrderDto,
  ) {
    return this.orders.update(user.organizationId, user.id, orderKey, dto as never);
  }

  @Get('orders/:orderKey')
  @RequirePermissions('sales:read')
  getOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.orders.getOne(user.organizationId, orderKey);
  }

  @Get('orders/:orderKey/tracking')
  @RequirePermissions('sales:read')
  trackOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.orders.tracking(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/validate')
  @RequirePermissions('sales:order')
  validateOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.orders.validateOrder(user.organizationId, orderKey, user.id);
  }

  @Post('orders/:orderKey/submit')
  @RequirePermissions('sales:order')
  submitOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() _dto: EscmOrderSubmitDto,
  ) {
    return this.orders.submit(user.organizationId, user.id, orderKey);
  }

  @Post('orders/:orderKey/transition')
  @RequirePermissions('sales:order')
  transitionOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmOrderTransitionDto,
  ) {
    return this.orders.transitionStatus(user.organizationId, user.id, orderKey, dto.toStatus as never, dto.reason);
  }

  @Post('orders/:orderKey/cancel')
  @RequirePermissions('sales:order')
  cancelOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: { reason?: string },
  ) {
    return this.orders.cancel(user.organizationId, user.id, orderKey, dto.reason);
  }

  @Post('orders/:orderKey/partial')
  @RequirePermissions('sales:order')
  partialOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmOrderPartialDto,
  ) {
    return this.orders.createPartial(user.organizationId, user.id, orderKey, dto);
  }

  @Post('orders/consolidate')
  @RequirePermissions('sales:order')
  consolidateOrders(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOrderConsolidateDto,
  ) {
    return this.orders.consolidate(user.organizationId, user.id, dto.orderKeys);
  }

  @Post('orders/schedule')
  @RequirePermissions('sales:order')
  scheduleOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOrderScheduleDto,
  ) {
    return this.orders.scheduleRecurring(user.organizationId, user.id, dto as never);
  }

  @Get('approvals/pending')
  @RequirePermissions('sales:approve')
  pendingApprovals(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.orderApprovals.listPending(user.organizationId);
  }

  @Get('approvals/policies')
  @RequirePermissions('sales:config')
  listApprovalPolicies(@CurrentUser() user: { organizationId: string }) {
    return this.orderApprovals.listPolicies(user.organizationId);
  }

  @Post('approvals/policies')
  @RequirePermissions('sales:config')
  upsertApprovalPolicy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmApprovalPolicyDto,
  ) {
    return this.orderApprovals.upsertPolicy(user.organizationId, user.id, dto);
  }

  @Post('approvals/:approvalKey/approve')
  @RequirePermissions('sales:approve')
  approveOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('approvalKey') approvalKey: string,
    @Body() dto: EscmOrderApprovalDto,
  ) {
    return this.orderApprovals.approve(user.organizationId, user.id, approvalKey, dto.comments);
  }

  @Post('approvals/:approvalKey/reject')
  @RequirePermissions('sales:approve')
  rejectOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('approvalKey') approvalKey: string,
    @Body() dto: EscmOrderApprovalDto,
  ) {
    return this.orderApprovals.reject(user.organizationId, user.id, approvalKey, dto.comments);
  }

  @Get('reservations')
  @RequirePermissions('sales:reservation')
  listReservations(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
    @Query('documentKey') documentKey?: string,
  ) {
    if (documentKey) return this.orderReservations.listByOrder(user.organizationId, documentKey);
    if (customerKey) return this.orderReservations.listByCustomer(user.organizationId, customerKey);
    return this.orderReservations.listAll(user.organizationId);
  }

  @Post('orders/:orderKey/reserve')
  @RequirePermissions('sales:reservation')
  reserveOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmOrderReservationDto,
  ) {
    return this.orderReservations.reserveOrder(user.organizationId, user.id, orderKey, dto);
  }

  @Post('orders/:orderKey/reservations/:lineKey/release')
  @RequirePermissions('sales:reservation')
  releaseReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Param('lineKey') lineKey: string,
    @Body() dto: { quantity?: number; reason?: string },
  ) {
    return this.orderReservations.releaseLine(user.organizationId, user.id, orderKey, lineKey, dto);
  }

  @Post('orders/:fromOrderKey/transfer-reservation/:toOrderKey')
  @RequirePermissions('sales:reservation')
  transferReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('fromOrderKey') fromOrderKey: string,
    @Param('toOrderKey') toOrderKey: string,
    @Body() dto: { lineKey: string; quantity?: number; reason?: string },
  ) {
    return this.orderReservations.transferReservation(
      user.organizationId,
      user.id,
      fromOrderKey,
      toOrderKey,
      dto.lineKey,
      dto,
    );
  }

  @Post('orders/prioritize')
  @RequirePermissions('sales:reservation')
  prioritizeOrders(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: { orderKeys: string[] },
  ) {
    return this.orderReservations.prioritize(user.organizationId, user.id, dto.orderKeys);
  }

  @Post('reservations/resolve-conflict')
  @RequirePermissions('sales:reservation')
  resolveReservationConflict(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: { itemKey: string; warehouseKey: string },
  ) {
    return this.orderReservations.resolveConflicts(user.organizationId, user.id, dto.itemKey, dto.warehouseKey);
  }

  @Get('logistics/center')
  @RequirePermissions('sales:logistics')
  logisticsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.logisticsCenter.dashboard(user.organizationId);
  }

  @Get('carriers')
  @RequirePermissions('sales:logistics')
  listCarriers(@CurrentUser() user: { organizationId: string }) {
    return this.transport.listCarriers(user.organizationId);
  }

  @Post('carriers')
  @RequirePermissions('sales:logistics')
  upsertCarrier(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCarrierDto,
  ) {
    return this.transport.upsertCarrier(user.organizationId, user.id, dto);
  }

  @Get('vehicles')
  @RequirePermissions('sales:logistics')
  listVehicles(
    @CurrentUser() user: { organizationId: string },
    @Query('carrierKey') carrierKey?: string,
  ) {
    return this.transport.listVehicles(user.organizationId, carrierKey);
  }

  @Post('vehicles')
  @RequirePermissions('sales:logistics')
  upsertVehicle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmVehicleDto,
  ) {
    return this.transport.upsertVehicle(user.organizationId, user.id, dto);
  }

  @Get('drivers')
  @RequirePermissions('sales:logistics')
  listDrivers(@CurrentUser() user: { organizationId: string }) {
    return this.transport.listDrivers(user.organizationId);
  }

  @Post('drivers')
  @RequirePermissions('sales:logistics')
  upsertDriver(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmDriverDto,
  ) {
    return this.transport.upsertDriver(user.organizationId, user.id, dto);
  }

  @Get('pick-waves')
  @RequirePermissions('sales:dispatch')
  listPickWaves(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.picking.listWaves(user.organizationId, status);
  }

  @Post('pick-waves')
  @RequirePermissions('sales:dispatch')
  createPickWave(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPickWaveDto,
  ) {
    return this.picking.createWave(user.organizationId, user.id, dto as never);
  }

  @Get('pick-waves/:waveKey')
  @RequirePermissions('sales:dispatch')
  getPickWave(
    @CurrentUser() user: { organizationId: string },
    @Param('waveKey') waveKey: string,
  ) {
    return this.picking.getWave(user.organizationId, waveKey);
  }

  @Post('pick-waves/:waveKey/release')
  @RequirePermissions('sales:dispatch')
  releasePickWave(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('waveKey') waveKey: string,
  ) {
    return this.picking.releaseWave(user.organizationId, user.id, waveKey);
  }

  @Post('pick-tasks/:taskKey/pick')
  @RequirePermissions('sales:dispatch')
  pickTask(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('taskKey') taskKey: string,
    @Body() dto: EscmPickTaskDto,
  ) {
    return this.picking.pickTask(user.organizationId, user.id, taskKey, dto);
  }

  @Post('pick-tasks/:taskKey/verify')
  @RequirePermissions('sales:dispatch')
  verifyPickTask(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('taskKey') taskKey: string,
  ) {
    return this.picking.verifyTask(user.organizationId, user.id, taskKey);
  }

  @Post('pick-waves/:waveKey/complete')
  @RequirePermissions('sales:dispatch')
  completePickWave(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('waveKey') waveKey: string,
  ) {
    return this.picking.completeWave(user.organizationId, user.id, waveKey);
  }

  @Get('dispatches')
  @RequirePermissions('sales:dispatch')
  listDispatches(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('orderKey') orderKey?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.dispatches.list(user.organizationId, { status, orderKey, customerKey });
  }

  @Post('orders/:orderKey/dispatch')
  @RequirePermissions('sales:dispatch')
  createDispatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmDispatchDto,
  ) {
    return this.dispatches.createFromOrder(user.organizationId, user.id, orderKey, dto);
  }

  @Post('dispatches/consolidate')
  @RequirePermissions('sales:dispatch')
  consolidateDispatches(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: { orderKeys: string[]; scheduledAt?: string; notes?: string },
  ) {
    return this.dispatches.consolidate(user.organizationId, user.id, dto.orderKeys, dto);
  }

  @Get('dispatches/:dispatchKey')
  @RequirePermissions('sales:dispatch')
  getDispatch(
    @CurrentUser() user: { organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.dispatches.getOne(user.organizationId, dispatchKey);
  }

  @Get('dispatches/:dispatchKey/tracking')
  @RequirePermissions('sales:logistics')
  trackDispatch(
    @CurrentUser() user: { organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.dispatches.tracking(user.organizationId, dispatchKey);
  }

  @Post('dispatches/:dispatchKey/picking')
  @RequirePermissions('sales:dispatch')
  startDispatchPicking(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.dispatches.startPicking(user.organizationId, user.id, dispatchKey);
  }

  @Post('dispatches/:dispatchKey/packing')
  @RequirePermissions('sales:dispatch')
  createPacking(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.picking.createPacking(user.organizationId, user.id, dispatchKey);
  }

  @Post('packings/:packingKey/verify')
  @RequirePermissions('sales:dispatch')
  verifyPacking(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('packingKey') packingKey: string,
  ) {
    return this.picking.verifyPacking(user.organizationId, user.id, packingKey);
  }

  @Post('dispatches/:dispatchKey/ship')
  @RequirePermissions('sales:dispatch')
  shipDispatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: EscmDispatchShipDto,
  ) {
    return this.dispatches.ship(user.organizationId, user.id, dispatchKey, dto);
  }

  @Post('dispatches/:dispatchKey/cancel')
  @RequirePermissions('sales:dispatch')
  cancelDispatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: { reason?: string },
  ) {
    return this.dispatches.cancel(user.organizationId, user.id, dispatchKey, dto.reason);
  }

  @Post('dispatches/:dispatchKey/reschedule')
  @RequirePermissions('sales:dispatch')
  rescheduleDispatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: { scheduledAt: string; reason?: string },
  ) {
    return this.dispatches.reschedule(user.organizationId, user.id, dispatchKey, dto);
  }

  @Get('routes')
  @RequirePermissions('sales:logistics')
  listRoutes(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.routes.list(user.organizationId, status);
  }

  @Post('routes')
  @RequirePermissions('sales:logistics')
  createRoute(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmRouteDto,
  ) {
    return this.routes.create(user.organizationId, user.id, dto as never);
  }

  @Get('routes/:routeKey')
  @RequirePermissions('sales:logistics')
  getRoute(
    @CurrentUser() user: { organizationId: string },
    @Param('routeKey') routeKey: string,
  ) {
    return this.routes.getOne(user.organizationId, routeKey);
  }

  @Post('routes/:routeKey/start')
  @RequirePermissions('sales:logistics')
  startRoute(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('routeKey') routeKey: string,
  ) {
    return this.routes.startRoute(user.organizationId, user.id, routeKey);
  }

  @Post('routes/:routeKey/location')
  @RequirePermissions('sales:logistics')
  updateRouteLocation(
    @CurrentUser() user: { organizationId: string },
    @Param('routeKey') routeKey: string,
    @Body() dto: { lat: number; lng: number },
  ) {
    return this.routes.updateVehicleLocation(user.organizationId, routeKey, dto.lat, dto.lng);
  }

  @Get('deliveries')
  @RequirePermissions('sales:delivery')
  listDeliveries(
    @CurrentUser() user: { organizationId: string },
    @Query('orderKey') orderKey?: string,
    @Query('outcome') outcome?: string,
  ) {
    return this.deliveries.list(user.organizationId, { orderKey, outcome });
  }

  @Post('dispatches/:dispatchKey/deliver')
  @RequirePermissions('sales:delivery')
  registerDelivery(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: EscmDeliveryDto,
  ) {
    return this.deliveries.register(user.organizationId, user.id, dispatchKey, dto as never);
  }

  @Get('deliveries/:deliveryKey')
  @RequirePermissions('sales:delivery')
  getDelivery(
    @CurrentUser() user: { organizationId: string },
    @Param('deliveryKey') deliveryKey: string,
  ) {
    return this.deliveries.getOne(user.organizationId, deliveryKey);
  }

  @Get('logistics/documents')
  @RequirePermissions('sales:logistics')
  listLogisticsDocuments(
    @CurrentUser() user: { organizationId: string },
    @Query('dispatchKey') dispatchKey?: string,
  ) {
    return this.logisticsDocuments.list(user.organizationId, dispatchKey);
  }

  @Get('incidents')
  @RequirePermissions('sales:logistics')
  listIncidents(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.incidents.list(user.organizationId, status);
  }

  @Post('incidents')
  @RequirePermissions('sales:logistics')
  reportIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmIncidentDto,
  ) {
    return this.incidents.report(user.organizationId, user.id, dto as never);
  }

  @Post('incidents/:incidentKey/resolve')
  @RequirePermissions('sales:logistics')
  resolveIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('incidentKey') incidentKey: string,
    @Body() dto: { resolution: string },
  ) {
    return this.incidents.resolve(user.organizationId, user.id, incidentKey, dto.resolution);
  }

  @Get('mobile/opportunities')
  @RequirePermissions('sales:read')
  mobileOpportunities(@CurrentUser() user: { organizationId: string }) {
    return this.opportunities.list(user.organizationId, { status: 'open' });
  }

  @Get('mobile/quotations')
  @RequirePermissions('sales:read')
  mobileQuotations(@CurrentUser() user: { organizationId: string }) {
    return this.quotations.list(user.organizationId, { currentOnly: true });
  }

  @Get('mobile/quotations/:quotationKey')
  @RequirePermissions('sales:read')
  mobileQuotation(
    @CurrentUser() user: { organizationId: string },
    @Param('quotationKey') quotationKey: string,
  ) {
    return this.quotations.getOne(user.organizationId, quotationKey);
  }

  @Post('mobile/opportunities/sync')
  @RequirePermissions('sales:opportunity')
  mobileSyncOpportunities(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOpportunitySyncDto,
  ) {
    return this.opportunities.syncOfflineOpportunities(user.organizationId, user.id, dto.updates as never);
  }

  @Post('mobile/quotations/:quotationKey/approve')
  @RequirePermissions('sales:quotation')
  mobileApproveQuotation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('quotationKey') quotationKey: string,
    @Body() dto: EscmQuotationApproveDto,
  ) {
    return this.quotations.approve(user.organizationId, user.id, quotationKey, dto.signatureUrl);
  }

  @Get('mobile/orders')
  @RequirePermissions('sales:read')
  mobileOrders(@CurrentUser() user: { organizationId: string }) {
    return this.orders.list(user.organizationId);
  }

  @Get('mobile/orders/:orderKey')
  @RequirePermissions('sales:read')
  mobileOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.orders.tracking(user.organizationId, orderKey);
  }

  @Post('mobile/orders')
  @RequirePermissions('sales:order')
  mobileCreateOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOrderDto,
  ) {
    return this.orders.create(user.organizationId, user.id, { ...dto, submit: true } as never);
  }

  @Post('mobile/orders/sync')
  @RequirePermissions('sales:order')
  mobileSyncOrders(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmOrderSyncDto,
  ) {
    return this.orders.syncOfflineOrders(user.organizationId, user.id, dto.orders as never);
  }

  @Post('mobile/approvals/:approvalKey/approve')
  @RequirePermissions('sales:approve')
  mobileApproveOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('approvalKey') approvalKey: string,
    @Body() dto: EscmOrderApprovalDto,
  ) {
    return this.orderApprovals.approve(user.organizationId, user.id, approvalKey, dto.comments);
  }

  @Get('mobile/reservations')
  @RequirePermissions('sales:reservation')
  mobileReservations(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
  ) {
    if (customerKey) return this.orderReservations.listByCustomer(user.organizationId, customerKey);
    return this.orderReservations.listAll(user.organizationId);
  }

  @Get('mobile/routes')
  @RequirePermissions('sales:logistics')
  mobileRoutes(@CurrentUser() user: { organizationId: string }) {
    return this.routes.list(user.organizationId, 'assigned');
  }

  @Get('mobile/routes/:routeKey')
  @RequirePermissions('sales:logistics')
  mobileRoute(
    @CurrentUser() user: { organizationId: string },
    @Param('routeKey') routeKey: string,
  ) {
    return this.routes.getOne(user.organizationId, routeKey);
  }

  @Post('mobile/routes/:routeKey/depart')
  @RequirePermissions('sales:logistics')
  mobileDepartRoute(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('routeKey') routeKey: string,
  ) {
    return this.routes.startRoute(user.organizationId, user.id, routeKey);
  }

  @Get('mobile/dispatches')
  @RequirePermissions('sales:dispatch')
  mobileDispatches(@CurrentUser() user: { organizationId: string }) {
    return this.dispatches.list(user.organizationId, { status: 'in_transit' });
  }

  @Post('mobile/dispatches/:dispatchKey/deliver')
  @RequirePermissions('sales:delivery')
  mobileDeliver(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: EscmDeliveryDto,
  ) {
    return this.deliveries.register(user.organizationId, user.id, dispatchKey, dto as never);
  }

  @Post('mobile/deliveries/sync')
  @RequirePermissions('sales:delivery')
  mobileSyncDeliveries(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmDeliverySyncDto,
  ) {
    return this.deliveries.syncOfflineDeliveries(user.organizationId, user.id, dto.deliveries as never);
  }

  @Post('mobile/routes/:routeKey/scan')
  @RequirePermissions('sales:logistics')
  mobileScan(
    @CurrentUser() user: { organizationId: string },
    @Param('routeKey') routeKey: string,
    @Body() dto: { barcode: string },
  ) {
    return { routeKey, barcode: dto.barcode, matched: true };
  }

  @Get('billing/center')
  @RequirePermissions('sales:read')
  billingCenterDash(@CurrentUser() user: { organizationId: string }) {
    return this.billingCenter.dashboard(user.organizationId);
  }

  @Get('billing/history')
  @RequirePermissions('sales:read')
  billingHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
    @Query('documentKey') documentKey?: string,
  ) {
    return this.invoices.history(user.organizationId, { customerKey, documentKey });
  }

  @Get('tax-rules')
  @RequirePermissions('sales:read')
  listTaxRules(
    @CurrentUser() user: { organizationId: string },
    @Query('ruleType') ruleType?: string,
  ) {
    return this.taxRules.list(user.organizationId, { ruleType });
  }

  @Post('tax-rules')
  @RequirePermissions('sales:billing')
  upsertTaxRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmTaxRuleDto,
  ) {
    return this.taxRules.upsert(user.organizationId, user.id, dto);
  }

  @Post('tax-rules/seed')
  @RequirePermissions('sales:config')
  seedTaxRules(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.taxRules.seedDefaults(user.organizationId, user.id);
  }

  @Get('invoices')
  @RequirePermissions('sales:read')
  listInvoices(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
    @Query('orderKey') orderKey?: string,
    @Query('invoiceType') invoiceType?: string,
  ) {
    return this.invoices.list(user.organizationId, { status, customerKey, orderKey, invoiceType });
  }

  @Get('invoices/:invoiceKey')
  @RequirePermissions('sales:read')
  getInvoice(
    @CurrentUser() user: { organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.getOne(user.organizationId, invoiceKey);
  }

  @Post('invoices')
  @RequirePermissions('sales:invoice')
  createInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmInvoiceDto,
  ) {
    return this.invoices.createDraft(user.organizationId, user.id, dto as never);
  }

  @Post('invoices/proforma')
  @RequirePermissions('sales:invoice')
  createProforma(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmInvoiceDto,
  ) {
    return this.invoices.createProforma(user.organizationId, user.id, dto as never);
  }

  @Post('orders/:orderKey/invoice')
  @RequirePermissions('sales:invoice')
  invoiceFromOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EscmInvoiceFromOrderDto,
  ) {
    return this.invoices.createFromOrder(user.organizationId, user.id, orderKey, dto);
  }

  @Post('dispatches/:dispatchKey/invoice')
  @RequirePermissions('sales:invoice')
  invoiceFromDispatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: { asProforma?: boolean },
  ) {
    return this.invoices.createFromDispatch(user.organizationId, user.id, dispatchKey, dto);
  }

  @Post('invoices/consolidate')
  @RequirePermissions('sales:invoice')
  consolidateInvoices(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmInvoiceConsolidateDto,
  ) {
    return this.invoices.createConsolidated(user.organizationId, user.id, dto.orderKeys, dto);
  }

  @Post('invoices/recurring')
  @RequirePermissions('sales:invoice')
  recurringInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmInvoiceRecurringDto,
  ) {
    return this.invoices.createRecurring(user.organizationId, user.id, dto as never);
  }

  @Post('invoices/:invoiceKey/issue')
  @RequirePermissions('sales:invoice')
  issueInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.issue(user.organizationId, user.id, invoiceKey);
  }

  @Post('invoices/:invoiceKey/void')
  @RequirePermissions('sales:billing')
  voidInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
    @Body() dto: EscmInvoiceVoidDto,
  ) {
    return this.invoices.void(user.organizationId, user.id, invoiceKey, dto.reason);
  }

  @Post('invoices/:invoiceKey/document')
  @RequirePermissions('sales:billing')
  generateInvoiceDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.billingDocuments.generateForInvoice(user.organizationId, user.id, invoiceKey);
  }

  @Get('returns')
  @RequirePermissions('sales:read')
  listReturns(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
    @Query('returnType') returnType?: string,
  ) {
    return this.returns.list(user.organizationId, { status, customerKey, returnType });
  }

  @Get('returns/:returnKey')
  @RequirePermissions('sales:read')
  getReturn(
    @CurrentUser() user: { organizationId: string },
    @Param('returnKey') returnKey: string,
  ) {
    return this.returns.getOne(user.organizationId, returnKey);
  }

  @Post('returns')
  @RequirePermissions('sales:return')
  createReturn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmReturnDto,
  ) {
    return this.returns.create(user.organizationId, user.id, dto as never);
  }

  @Post('returns/:returnKey/submit')
  @RequirePermissions('sales:return')
  submitReturn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('returnKey') returnKey: string,
  ) {
    return this.returns.submit(user.organizationId, user.id, returnKey);
  }

  @Post('returns/:returnKey/approve')
  @RequirePermissions('sales:return')
  approveReturn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('returnKey') returnKey: string,
  ) {
    return this.returns.approve(user.organizationId, user.id, returnKey);
  }

  @Post('returns/:returnKey/reject')
  @RequirePermissions('sales:return')
  rejectReturn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('returnKey') returnKey: string,
    @Body() dto: EscmReturnRejectDto,
  ) {
    return this.returns.reject(user.organizationId, user.id, returnKey, dto.reason);
  }

  @Post('returns/:returnKey/process')
  @RequirePermissions('sales:return')
  processReturn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('returnKey') returnKey: string,
  ) {
    return this.returns.process(user.organizationId, user.id, returnKey);
  }

  @Get('warranties')
  @RequirePermissions('sales:read')
  listWarranties(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.warranties.list(user.organizationId, { status, customerKey });
  }

  @Get('warranties/:claimKey')
  @RequirePermissions('sales:read')
  getWarranty(
    @CurrentUser() user: { organizationId: string },
    @Param('claimKey') claimKey: string,
  ) {
    return this.warranties.getOne(user.organizationId, claimKey);
  }

  @Get('warranties/:claimKey/history')
  @RequirePermissions('sales:read')
  warrantyHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('claimKey') claimKey: string,
  ) {
    return this.warranties.history(user.organizationId, claimKey);
  }

  @Post('warranties')
  @RequirePermissions('sales:warranty')
  createWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmWarrantyDto,
  ) {
    return this.warranties.create(user.organizationId, user.id, dto as never);
  }

  @Post('warranties/:claimKey/submit')
  @RequirePermissions('sales:warranty')
  submitWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('claimKey') claimKey: string,
  ) {
    return this.warranties.submit(user.organizationId, user.id, claimKey);
  }

  @Post('warranties/:claimKey/approve')
  @RequirePermissions('sales:warranty')
  approveWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('claimKey') claimKey: string,
    @Body() dto: EscmWarrantyApproveDto,
  ) {
    return this.warranties.approve(user.organizationId, user.id, claimKey, dto.resolutionType);
  }

  @Post('warranties/:claimKey/reject')
  @RequirePermissions('sales:warranty')
  rejectWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('claimKey') claimKey: string,
    @Body() dto: EscmWarrantyRejectDto,
  ) {
    return this.warranties.reject(user.organizationId, user.id, claimKey, dto.reason);
  }

  @Post('warranties/:claimKey/resolve')
  @RequirePermissions('sales:warranty')
  resolveWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('claimKey') claimKey: string,
    @Body() dto: EscmWarrantyResolveDto,
  ) {
    return this.warranties.resolve(user.organizationId, user.id, claimKey, dto.notes);
  }

  @Get('credit-notes')
  @RequirePermissions('sales:read')
  listCreditNotes(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.notes.listCreditNotes(user.organizationId, { status, customerKey });
  }

  @Get('credit-notes/:creditNoteKey')
  @RequirePermissions('sales:read')
  getCreditNote(
    @CurrentUser() user: { organizationId: string },
    @Param('creditNoteKey') creditNoteKey: string,
  ) {
    return this.notes.getCreditNote(user.organizationId, creditNoteKey);
  }

  @Post('credit-notes')
  @RequirePermissions('sales:billing')
  createCreditNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCreditNoteDto,
  ) {
    return this.notes.createCreditNote(user.organizationId, user.id, dto as never);
  }

  @Post('credit-notes/:creditNoteKey/issue')
  @RequirePermissions('sales:billing')
  issueCreditNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('creditNoteKey') creditNoteKey: string,
  ) {
    return this.notes.issueCreditNote(user.organizationId, user.id, creditNoteKey);
  }

  @Get('debit-notes')
  @RequirePermissions('sales:read')
  listDebitNotes(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.notes.listDebitNotes(user.organizationId, { status, customerKey });
  }

  @Get('debit-notes/:debitNoteKey')
  @RequirePermissions('sales:read')
  getDebitNote(
    @CurrentUser() user: { organizationId: string },
    @Param('debitNoteKey') debitNoteKey: string,
  ) {
    return this.notes.getDebitNote(user.organizationId, debitNoteKey);
  }

  @Post('debit-notes')
  @RequirePermissions('sales:billing')
  createDebitNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmDebitNoteDto,
  ) {
    return this.notes.createDebitNote(user.organizationId, user.id, dto as never);
  }

  @Post('debit-notes/:debitNoteKey/issue')
  @RequirePermissions('sales:billing')
  issueDebitNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('debitNoteKey') debitNoteKey: string,
  ) {
    return this.notes.issueDebitNote(user.organizationId, user.id, debitNoteKey);
  }

  @Get('billing-documents')
  @RequirePermissions('sales:read')
  listBillingDocuments(
    @CurrentUser() user: { organizationId: string },
    @Query('documentType') documentType?: string,
    @Query('referenceKey') referenceKey?: string,
  ) {
    return this.billingDocuments.list(user.organizationId, { documentType, referenceKey });
  }

  @Get('mobile/invoices')
  @RequirePermissions('sales:read')
  mobileInvoices(@CurrentUser() user: { organizationId: string }) {
    return this.invoices.list(user.organizationId, { status: 'issued' });
  }

  @Get('mobile/invoices/:invoiceKey')
  @RequirePermissions('sales:read')
  mobileInvoice(
    @CurrentUser() user: { organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.getOne(user.organizationId, invoiceKey);
  }

  @Get('mobile/returns')
  @RequirePermissions('sales:read')
  mobileReturns(@CurrentUser() user: { organizationId: string }) {
    return this.returns.list(user.organizationId);
  }

  @Get('mobile/warranties')
  @RequirePermissions('sales:read')
  mobileWarranties(@CurrentUser() user: { organizationId: string }) {
    return this.warranties.list(user.organizationId);
  }

  @Post('mobile/warranties')
  @RequirePermissions('sales:warranty')
  mobileCreateWarranty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmWarrantyDto,
  ) {
    return this.warranties.create(user.organizationId, user.id, dto as never);
  }

  @Post('mobile/warranties/sync')
  @RequirePermissions('sales:warranty')
  mobileSyncWarranties(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmWarrantySyncDto,
  ) {
    return Promise.all(
      dto.claims.map((c) =>
        this.warranties.create(user.organizationId, user.id, {
          claimType: c.claimType,
          customerKey: c.customerKey,
          description: c.description,
          invoiceKey: c.invoiceKey,
          orderKey: c.orderKey,
          itemKey: c.itemKey,
          evidenceUrls: c.evidenceUrls,
        }),
      ),
    );
  }

  @Get('ar/center')
  @RequirePermissions('sales:read')
  arCenterDash(@CurrentUser() user: { organizationId: string }) {
    return this.arCenter.dashboard(user.organizationId);
  }

  @Post('ar/aging/refresh')
  @RequirePermissions('sales:receivable')
  refreshAging(@CurrentUser() user: { organizationId: string }) {
    return this.receivables.refreshAging(user.organizationId);
  }

  @Get('receivables')
  @RequirePermissions('sales:read')
  listReceivables(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.receivables.list(user.organizationId, {
      status,
      customerKey,
      overdue: overdue === 'true',
    });
  }

  @Get('receivables/:receivableKey')
  @RequirePermissions('sales:read')
  getReceivable(
    @CurrentUser() user: { organizationId: string },
    @Param('receivableKey') receivableKey: string,
  ) {
    return this.receivables.getOne(user.organizationId, receivableKey);
  }

  @Get('customers/:customerKey/balance')
  @RequirePermissions('sales:read')
  customerBalance(
    @CurrentUser() user: { organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.receivables.customerBalance(user.organizationId, customerKey);
  }

  @Get('payments')
  @RequirePermissions('sales:read')
  listPayments(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.payments.list(user.organizationId, { status, customerKey, paymentMethod });
  }

  @Get('payments/:paymentKey')
  @RequirePermissions('sales:read')
  getPayment(
    @CurrentUser() user: { organizationId: string },
    @Param('paymentKey') paymentKey: string,
  ) {
    return this.payments.getOne(user.organizationId, paymentKey);
  }

  @Post('payments')
  @RequirePermissions('sales:payment')
  registerPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentDto,
  ) {
    return this.payments.register(user.organizationId, user.id, dto as never);
  }

  @Post('payments/:paymentKey/confirm')
  @RequirePermissions('sales:payment')
  confirmPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: { autoApply?: boolean; allocations?: Array<{ receivableKey?: string; invoiceKey?: string; amount: number }> },
  ) {
    return this.payments.confirm(user.organizationId, user.id, paymentKey, dto);
  }

  @Post('payments/:paymentKey/void')
  @RequirePermissions('sales:payment')
  voidPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: EscmPaymentVoidDto,
  ) {
    return this.payments.void(user.organizationId, user.id, paymentKey, dto.reason);
  }

  @Post('payments/:paymentKey/reconcile')
  @RequirePermissions('sales:payment')
  reconcilePayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: { bankRef?: string },
  ) {
    return this.payments.reconcile(user.organizationId, user.id, paymentKey, dto.bankRef);
  }

  @Post('advances/:advanceKey/apply')
  @RequirePermissions('sales:payment')
  applyAdvance(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('advanceKey') advanceKey: string,
    @Body() dto: { receivableKey: string; amount?: number },
  ) {
    return this.payments.applyAdvanceToReceivable(
      user.organizationId,
      user.id,
      advanceKey,
      dto.receivableKey,
      dto.amount,
    );
  }

  @Get('collection/campaigns')
  @RequirePermissions('sales:read')
  listCampaigns(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.collections.listCampaigns(user.organizationId, status);
  }

  @Post('collection/campaigns')
  @RequirePermissions('sales:collection')
  createCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCollectionCampaignDto,
  ) {
    return this.collections.createCampaign(user.organizationId, user.id, dto as never);
  }

  @Post('collection/campaigns/:campaignKey/activate')
  @RequirePermissions('sales:collection')
  activateCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('campaignKey') campaignKey: string,
  ) {
    return this.collections.activateCampaign(user.organizationId, user.id, campaignKey);
  }

  @Get('collection/activities')
  @RequirePermissions('sales:read')
  listCollectionActivities(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.collections.listActivities(user.organizationId, { status, customerKey });
  }

  @Post('collection/calls')
  @RequirePermissions('sales:collection')
  logCollectionCall(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCollectionCallDto,
  ) {
    return this.collections.logCall(user.organizationId, user.id, dto as never);
  }

  @Post('receivables/:receivableKey/remind')
  @RequirePermissions('sales:collection')
  sendReminder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('receivableKey') receivableKey: string,
    @Body() dto: { channel?: 'email' | 'reminder' },
  ) {
    return this.collections.sendReminder(user.organizationId, user.id, receivableKey, dto.channel);
  }

  @Post('collection/escalate')
  @RequirePermissions('sales:collection')
  escalateCollection(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCollectionEscalateDto,
  ) {
    return this.collections.escalate(user.organizationId, user.id, dto as never);
  }

  @Post('collection/auto-reminders')
  @RequirePermissions('sales:collection')
  runAutoReminders(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.collections.runAutoReminders(user.organizationId, user.id);
  }

  @Get('agreements')
  @RequirePermissions('sales:read')
  listAgreements(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.agreements.listAgreements(user.organizationId, { status, customerKey });
  }

  @Get('agreements/:agreementKey')
  @RequirePermissions('sales:read')
  getAgreement(
    @CurrentUser() user: { organizationId: string },
    @Param('agreementKey') agreementKey: string,
  ) {
    return this.agreements.getAgreement(user.organizationId, agreementKey);
  }

  @Post('agreements')
  @RequirePermissions('sales:collection')
  createAgreement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentAgreementDto,
  ) {
    return this.agreements.createAgreement(user.organizationId, user.id, dto as never);
  }

  @Post('agreements/:agreementKey/activate')
  @RequirePermissions('sales:collection')
  activateAgreement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('agreementKey') agreementKey: string,
  ) {
    return this.agreements.activateAgreement(user.organizationId, user.id, agreementKey);
  }

  @Get('promises')
  @RequirePermissions('sales:read')
  listPromises(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.agreements.listPromises(user.organizationId, { status, customerKey });
  }

  @Post('promises')
  @RequirePermissions('sales:collection')
  createPromise(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentPromiseDto,
  ) {
    return this.agreements.createPromise(user.organizationId, user.id, dto as never);
  }

  @Post('promises/:promiseKey/kept')
  @RequirePermissions('sales:collection')
  markPromiseKept(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('promiseKey') promiseKey: string,
  ) {
    return this.agreements.markPromiseKept(user.organizationId, user.id, promiseKey);
  }

  @Post('promises/:promiseKey/broken')
  @RequirePermissions('sales:collection')
  markPromiseBroken(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('promiseKey') promiseKey: string,
    @Body() dto: { reason?: string },
  ) {
    return this.agreements.markPromiseBroken(user.organizationId, user.id, promiseKey, dto.reason);
  }

  @Get('ar/documents')
  @RequirePermissions('sales:read')
  listArDocuments(
    @CurrentUser() user: { organizationId: string },
    @Query('documentType') documentType?: string,
    @Query('customerKey') customerKey?: string,
  ) {
    return this.arDocuments.list(user.organizationId, { documentType, customerKey });
  }

  @Post('customers/:customerKey/statement')
  @RequirePermissions('sales:receivable')
  generateStatement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customerKey') customerKey: string,
  ) {
    return this.arDocuments.generateStatement(user.organizationId, user.id, customerKey);
  }

  @Get('mobile/receivables')
  @RequirePermissions('sales:read')
  mobileReceivables(
    @CurrentUser() user: { organizationId: string },
    @Query('customerKey') customerKey?: string,
  ) {
    return this.receivables.list(user.organizationId, { customerKey });
  }

  @Get('mobile/payments')
  @RequirePermissions('sales:read')
  mobilePayments(@CurrentUser() user: { organizationId: string }) {
    return this.payments.list(user.organizationId, { status: 'confirmed' });
  }

  @Post('mobile/payments')
  @RequirePermissions('sales:payment')
  mobileRegisterPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentDto,
  ) {
    return this.payments.register(user.organizationId, user.id, { ...dto, autoApply: true } as never);
  }

  @Get('mobile/promises')
  @RequirePermissions('sales:read')
  mobilePromises(@CurrentUser() user: { organizationId: string }) {
    return this.agreements.listPromises(user.organizationId, { status: 'pending' });
  }

  @Post('mobile/promises')
  @RequirePermissions('sales:collection')
  mobileCreatePromise(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentPromiseDto,
  ) {
    return this.agreements.createPromise(user.organizationId, user.id, dto as never);
  }

  @Post('mobile/promises/sync')
  @RequirePermissions('sales:collection')
  mobileSyncPromises(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmPaymentPromiseSyncDto,
  ) {
    return Promise.all(
      dto.promises.map((p) =>
        this.agreements.createPromise(user.organizationId, user.id, p as never),
      ),
    );
  }

  @Post('mobile/payments/sync')
  @RequirePermissions('sales:payment')
  mobileSyncPayments(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: { payments: EscmPaymentDto[] },
  ) {
    return Promise.all(
      dto.payments.map((p) =>
        this.payments.register(user.organizationId, user.id, { ...p, autoApply: true } as never),
      ),
    );
  }

  private opsFiltersFromQuery(query: EscmOpsFiltersDto) {
    return {
      regionKey: query.regionKey,
      sellerId: query.sellerId,
      customerKey: query.customerKey,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };
  }

  @Get('ops/center')
  @RequirePermissions('sales:read')
  opsCenter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.opsCenterService.dashboard(user.organizationId, this.opsFiltersFromQuery(filters)).then((r) => {
      void this.analyticsAudit.logAccess(user.organizationId, 'access', 'ops/center', user.id, filters as Record<string, unknown>);
      return r;
    });
  }

  @Get('ops/executive')
  @RequirePermissions('sales:analytics')
  opsExecutive(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.opsCenterService.executiveDashboard(user.organizationId, this.opsFiltersFromQuery(filters));
  }

  @Get('ops/commercial')
  @RequirePermissions('sales:analytics')
  opsCommercial(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.opsCenterService.commercialDashboard(user.organizationId, this.opsFiltersFromQuery(filters));
  }

  @Get('ops/region-map')
  @RequirePermissions('sales:read')
  opsRegionMap(@CurrentUser() user: { organizationId: string }) {
    return this.opsCenterService.regionMap(user.organizationId);
  }

  @Get('ops/kpis')
  @RequirePermissions('sales:analytics')
  opsKpis(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.kpi.computeAll(user.organizationId, this.opsFiltersFromQuery(filters)).then((r) => {
      void this.analyticsAudit.logAccess(user.organizationId, 'query', 'kpis', user.id, filters as Record<string, unknown>);
      return r;
    });
  }

  @Get('ops/analytics')
  @RequirePermissions('sales:analytics')
  opsAnalytics(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.analytics.fullAnalysis(user.organizationId, this.opsFiltersFromQuery(filters));
  }

  @Get('ops/analytics/trends')
  @RequirePermissions('sales:analytics')
  opsTrends(
    @CurrentUser() user: { organizationId: string },
    @Query('granularity') granularity?: 'day' | 'week' | 'month',
  ) {
    return this.analytics.trends(user.organizationId, granularity ?? 'day');
  }

  @Get('ops/analytics/compare')
  @RequirePermissions('sales:analytics')
  opsCompare(
    @CurrentUser() user: { organizationId: string },
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ) {
    return this.analytics.compare(user.organizationId, period ?? 'month');
  }

  @Get('ops/analytics/products')
  @RequirePermissions('sales:analytics')
  opsProducts(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.topProducts(user.organizationId);
  }

  @Get('ops/analytics/customers')
  @RequirePermissions('sales:analytics')
  opsCustomers(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.customerInsights(user.organizationId);
  }

  @Get('ops/analytics/sellers')
  @RequirePermissions('sales:analytics')
  opsSellers(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.sellerEffectiveness(user.organizationId);
  }

  @Get('ops/reports/:reportType')
  @RequirePermissions('sales:report')
  opsReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reportType') reportType: string,
    @Query() filters: EscmOpsFiltersDto,
  ) {
    return this.reports.generate(user.organizationId, reportType, user.id, this.opsFiltersFromQuery(filters));
  }

  @Post('ops/reports/export')
  @RequirePermissions('sales:report')
  @Header('Content-Disposition', 'attachment')
  async opsReportExport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmReportExportDto,
  ) {
    const result = await this.reports.export(
      user.organizationId,
      dto.reportType,
      dto.format,
      user.id,
      dto.filters as never,
    );
    return result;
  }

  @Get('ops/reports/runs')
  @RequirePermissions('sales:report')
  listReportRuns(
    @CurrentUser() user: { organizationId: string },
    @Query('reportType') reportType?: string,
  ) {
    return this.reports.listRuns(user.organizationId, reportType);
  }

  @Get('ops/custom-reports')
  @RequirePermissions('sales:report')
  listCustomReports(@CurrentUser() user: { organizationId: string }) {
    return this.reports.listCustomReports(user.organizationId);
  }

  @Post('ops/custom-reports')
  @RequirePermissions('sales:report')
  createCustomReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EscmCustomReportDto,
  ) {
    return this.reports.createCustomReport(user.organizationId, user.id, dto);
  }

  @Post('ops/custom-reports/:reportKey/run')
  @RequirePermissions('sales:report')
  runCustomReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reportKey') reportKey: string,
  ) {
    return this.reports.runCustomReport(user.organizationId, reportKey, user.id);
  }

  @Get('ops/alerts')
  @RequirePermissions('sales:read')
  listOpsAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.opsAlerts.list(user.organizationId, status);
  }

  @Post('ops/alerts/evaluate')
  @RequirePermissions('sales:ops')
  evaluateOpsAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.opsAlerts.evaluate(user.organizationId);
  }

  @Post('ops/alerts/:alertKey/acknowledge')
  @RequirePermissions('sales:ops')
  acknowledgeOpsAlert(
    @CurrentUser() user: { organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.opsAlerts.acknowledge(user.organizationId, alertKey);
  }

  @Post('ops/alerts/:alertKey/resolve')
  @RequirePermissions('sales:ops')
  resolveOpsAlert(
    @CurrentUser() user: { organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.opsAlerts.resolve(user.organizationId, alertKey);
  }

  @Get('ops/ai/insights')
  @RequirePermissions('sales:analytics')
  opsAiInsights(@CurrentUser() user: { organizationId: string }) {
    return this.aiInsights.insights(user.organizationId);
  }

  @Get('ops/targets')
  @RequirePermissions('sales:ops')
  listTargets(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
  ) {
    return this.opsCenterService.listTargets(user.organizationId, periodKey);
  }

  @Post('ops/targets')
  @RequirePermissions('sales:ops')
  upsertTarget(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: EscmSalesTargetDto,
  ) {
    return this.opsCenterService.upsertTarget(user.organizationId, dto);
  }

  @Post('ops/targets/sync')
  @RequirePermissions('sales:ops')
  syncTargets(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
  ) {
    return this.opsCenterService.syncTargetActuals(user.organizationId, periodKey);
  }

  @Get('ops/analytics/audit')
  @RequirePermissions('sales:audit')
  analyticsAuditLog(@CurrentUser() user: { organizationId: string }) {
    return this.analyticsAudit.list(user.organizationId);
  }

  @Get('mobile/ops/kpis')
  @RequirePermissions('sales:read')
  mobileOpsKpis(@CurrentUser() user: { organizationId: string }) {
    return this.kpi.computeAll(user.organizationId);
  }

  @Get('mobile/ops/center')
  @RequirePermissions('sales:read')
  mobileOpsCenter(@CurrentUser() user: { organizationId: string }) {
    return this.opsCenterService.dashboard(user.organizationId);
  }

  @Get('mobile/ops/alerts')
  @RequirePermissions('sales:read')
  mobileOpsAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.opsAlerts.list(user.organizationId, 'open');
  }

  @Get('mobile/ops/reports/:reportType')
  @RequirePermissions('sales:read')
  mobileOpsReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reportType') reportType: string,
  ) {
    return this.reports.generate(user.organizationId, reportType, user.id);
  }

  @Get('mobile/ops/sync')
  @RequirePermissions('sales:read')
  mobileOpsSync(@CurrentUser() user: { organizationId: string }) {
    return Promise.all([
      this.opsCenterService.dashboard(user.organizationId),
      this.kpi.computeAll(user.organizationId),
      this.opsAlerts.list(user.organizationId, 'open'),
    ]).then(([center, kpis, alerts]) => ({ center, kpis, alerts, syncedAt: new Date().toISOString() }));
  }
}
