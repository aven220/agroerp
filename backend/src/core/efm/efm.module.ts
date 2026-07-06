import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EfmController } from './presentation/efm.controller';
import { EfmAuditService } from './application/efm-audit.service';
import { EfmCoaService } from './application/efm-coa.service';
import { EfmParameterService } from './application/efm-parameter.service';
import { EfmDimensionService } from './application/efm-dimension.service';
import { EfmPeriodService } from './application/efm-period.service';
import { EfmRuleService } from './application/efm-rule.service';
import { EfmAccountingEngineService } from './application/efm-accounting-engine.service';
import { EfmConfigService } from './application/efm-config.service';
import { EfmValidationService } from './application/efm-validation.service';
import { EfmEventBridgeService } from './application/efm-event-bridge.service';
import { EfmVoucherTypeService } from './application/efm-voucher-type.service';
import { EfmVoucherService } from './application/efm-voucher.service';
import { EfmJournalBookService } from './application/efm-journal-book.service';
import { EfmLedgerService } from './application/efm-ledger.service';
import { EfmApController } from './presentation/efm-ap.controller';
import { EfmApCenterService } from './application/efm-ap-center.service';
import { EfmApSupplierService } from './application/efm-ap-supplier.service';
import { EfmApInvoiceService } from './application/efm-ap-invoice.service';
import { EfmApPaymentService } from './application/efm-ap-payment.service';
import { EfmApScheduleService } from './application/efm-ap-schedule.service';
import { EfmApApprovalService } from './application/efm-ap-approval.service';
import { EfmApIncidentService } from './application/efm-ap-incident.service';
import { EfmApEventBridgeService } from './application/efm-ap-event-bridge.service';
import { EfmTrController } from './presentation/efm-tr.controller';
import { EfmTrCenterService } from './application/efm-tr-center.service';
import { EfmTrBankService } from './application/efm-tr-bank.service';
import { EfmTrCashboxService } from './application/efm-tr-cashbox.service';
import { EfmTrMovementService } from './application/efm-tr-movement.service';
import { EfmTrReconciliationService } from './application/efm-tr-reconciliation.service';
import { EfmTrCashflowService } from './application/efm-tr-cashflow.service';
import { EfmTrEventBridgeService } from './application/efm-tr-event-bridge.service';
import { EfmFaController } from './presentation/efm-fa.controller';
import { EfmFaCenterService } from './application/efm-fa-center.service';
import { EfmFaCategoryService } from './application/efm-fa-category.service';
import { EfmFaAssetService } from './application/efm-fa-asset.service';
import { EfmFaDepreciationService } from './application/efm-fa-depreciation.service';
import { EfmFaLifecycleService } from './application/efm-fa-lifecycle.service';
import { EfmFaInventoryService } from './application/efm-fa-inventory.service';
import { EfmFaEventBridgeService } from './application/efm-fa-event-bridge.service';
import { EfmBgController } from './presentation/efm-bg.controller';
import { EfmBgCenterService } from './application/efm-bg-center.service';
import { EfmBgDimensionService } from './application/efm-bg-dimension.service';
import { EfmBgBudgetService } from './application/efm-bg-budget.service';
import { EfmBgControlService } from './application/efm-bg-control.service';
import { EfmBgValidationService } from './application/efm-bg-validation.service';
import { EfmBgAnalysisService } from './application/efm-bg-analysis.service';
import { EfmBgTransferService } from './application/efm-bg-transfer.service';
import { EfmBgEventBridgeService } from './application/efm-bg-event-bridge.service';
import { EfmFoController } from './presentation/efm-fo.controller';
import { EfmFoCenterService } from './application/efm-fo-center.service';
import { EfmFoStatementService } from './application/efm-fo-statement.service';
import { EfmFoClosingService } from './application/efm-fo-closing.service';
import { EfmFoKpiService } from './application/efm-fo-kpi.service';
import { EfmFoAnalyticsService } from './application/efm-fo-analytics.service';
import { EfmFoReportService } from './application/efm-fo-report.service';
import { EfmFoAiService } from './application/efm-fo-ai.service';
import { EfmFoEventBridgeService } from './application/efm-fo-event-bridge.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EfmController, EfmApController, EfmTrController, EfmFaController, EfmBgController, EfmFoController],
  providers: [
    EfmAuditService,
    EfmCoaService,
    EfmParameterService,
    EfmDimensionService,
    EfmPeriodService,
    EfmRuleService,
    EfmAccountingEngineService,
    EfmConfigService,
    EfmValidationService,
    EfmEventBridgeService,
    EfmVoucherTypeService,
    EfmVoucherService,
    EfmJournalBookService,
    EfmLedgerService,
    EfmApCenterService,
    EfmApSupplierService,
    EfmApInvoiceService,
    EfmApPaymentService,
    EfmApScheduleService,
    EfmApApprovalService,
    EfmApIncidentService,
    EfmApEventBridgeService,
    EfmTrCenterService,
    EfmTrBankService,
    EfmTrCashboxService,
    EfmTrMovementService,
    EfmTrReconciliationService,
    EfmTrCashflowService,
    EfmTrEventBridgeService,
    EfmFaCenterService,
    EfmFaCategoryService,
    EfmFaAssetService,
    EfmFaDepreciationService,
    EfmFaLifecycleService,
    EfmFaInventoryService,
    EfmFaEventBridgeService,
    EfmBgCenterService,
    EfmBgDimensionService,
    EfmBgBudgetService,
    EfmBgControlService,
    EfmBgValidationService,
    EfmBgAnalysisService,
    EfmBgTransferService,
    EfmBgEventBridgeService,
    EfmFoCenterService,
    EfmFoStatementService,
    EfmFoClosingService,
    EfmFoKpiService,
    EfmFoAnalyticsService,
    EfmFoReportService,
    EfmFoAiService,
    EfmFoEventBridgeService,
  ],
  exports: [
    EfmCoaService,
    EfmParameterService,
    EfmRuleService,
    EfmAccountingEngineService,
    EfmConfigService,
    EfmVoucherService,
    EfmJournalBookService,
    EfmLedgerService,
    EfmApInvoiceService,
    EfmApPaymentService,
    EfmApSupplierService,
    EfmTrMovementService,
    EfmTrBankService,
    EfmFaAssetService,
    EfmFaDepreciationService,
    EfmBgValidationService,
    EfmBgControlService,
  ],
})
export class EfmModule {}
