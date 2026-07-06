import { Module, forwardRef } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EimsModule } from '@/core/eims/eims.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { EscmController } from './presentation/escm.controller';
import { EscmAuditService } from './application/escm-audit.service';
import { EscmCatalogService } from './application/escm-catalog.service';
import { EscmParameterService } from './application/escm-parameter.service';
import { EscmCustomerService } from './application/escm-customer.service';
import { EscmPriceListService, EscmCommercialService } from './application/escm-price-list.service';
import { EscmConfigService } from './application/escm-config.service';
import { EscmPipelineService } from './application/escm-pipeline.service';
import { EscmCrmService } from './application/escm-crm.service';
import { EscmOpportunityService } from './application/escm-opportunity.service';
import { EscmQuotationService } from './application/escm-quotation.service';
import { EscmOrderService } from './application/escm-order.service';
import { EscmOrderValidationService } from './application/escm-order-validation.service';
import { EscmOrderApprovalService } from './application/escm-order-approval.service';
import { EscmOrderReservationService } from './application/escm-order-reservation.service';
import { EscmTransportService } from './application/escm-transport.service';
import { EscmPickingService } from './application/escm-picking.service';
import { EscmDispatchService } from './application/escm-dispatch.service';
import { EscmLogisticsDocumentService, EscmRouteService } from './application/escm-logistics-document.service';
import {
  EscmDeliveryService,
  EscmLogisticsIncidentService,
  EscmLogisticsCenterService,
} from './application/escm-delivery.service';
import { EscmTaxService } from './application/escm-tax.service';
import { EscmInvoiceService } from './application/escm-invoice.service';
import { EscmReturnService } from './application/escm-return.service';
import { EscmWarrantyService } from './application/escm-warranty.service';
import { EscmNoteService } from './application/escm-note.service';
import { EscmBillingDocumentService } from './application/escm-billing-document.service';
import { EscmBillingCenterService } from './application/escm-billing-center.service';
import { EscmReceivableService } from './application/escm-receivable.service';
import { EscmPaymentService } from './application/escm-payment.service';
import { EscmCollectionService } from './application/escm-collection.service';
import { EscmAgreementService } from './application/escm-agreement.service';
import { EscmArDocumentService } from './application/escm-ar-document.service';
import { EscmArCenterService } from './application/escm-ar-center.service';
import { EscmOpsCenterService } from './application/escm-ops-center.service';
import { EscmKpiService } from './application/escm-kpi.service';
import { EscmAnalyticsService } from './application/escm-analytics.service';
import { EscmReportService } from './application/escm-report.service';
import { EscmOpsAlertService } from './application/escm-ops-alert.service';
import { EscmAiInsightsService } from './application/escm-ai-insights.service';
import { EscmAnalyticsAuditService } from './application/escm-analytics-audit.service';

@Module({
  imports: [EventsModule, CoreEngineModule, EimsModule, forwardRef(() => WorkflowsModule)],
  controllers: [EscmController],
  providers: [
    EscmAuditService,
    EscmCatalogService,
    EscmParameterService,
    EscmCustomerService,
    EscmPriceListService,
    EscmCommercialService,
    EscmConfigService,
    EscmPipelineService,
    EscmCrmService,
    EscmOpportunityService,
    EscmQuotationService,
    EscmOrderService,
    EscmOrderValidationService,
    EscmOrderApprovalService,
    EscmOrderReservationService,
    EscmTransportService,
    EscmPickingService,
    EscmLogisticsDocumentService,
    EscmRouteService,
    EscmDispatchService,
    EscmDeliveryService,
    EscmLogisticsIncidentService,
    EscmLogisticsCenterService,
    EscmTaxService,
    EscmInvoiceService,
    EscmReturnService,
    EscmWarrantyService,
    EscmNoteService,
    EscmBillingDocumentService,
    EscmBillingCenterService,
    EscmReceivableService,
    EscmPaymentService,
    EscmCollectionService,
    EscmAgreementService,
    EscmArDocumentService,
    EscmArCenterService,
    EscmOpsCenterService,
    EscmKpiService,
    EscmAnalyticsService,
    EscmReportService,
    EscmOpsAlertService,
    EscmAiInsightsService,
    EscmAnalyticsAuditService,
  ],
  exports: [
    EscmCatalogService,
    EscmParameterService,
    EscmCustomerService,
    EscmPriceListService,
    EscmCommercialService,
    EscmConfigService,
    EscmPipelineService,
    EscmCrmService,
    EscmOpportunityService,
    EscmQuotationService,
    EscmOrderService,
    EscmOrderValidationService,
    EscmOrderApprovalService,
    EscmOrderReservationService,
    EscmTransportService,
    EscmPickingService,
    EscmDispatchService,
    EscmDeliveryService,
    EscmLogisticsCenterService,
    EscmInvoiceService,
    EscmBillingCenterService,
    EscmReceivableService,
    EscmPaymentService,
    EscmArCenterService,
    EscmOpsCenterService,
    EscmKpiService,
    EscmAnalyticsService,
    EscmReportService,
  ],
})
export class EscmModule {}
