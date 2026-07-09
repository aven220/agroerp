import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { MobileProvider } from './context/MobileContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { GuidedWorkspaceProvider } from './context/GuidedWorkspaceContext';
import { UxProviders } from './components/ux/UxProviders';
import { ModuleLoadingFallback } from './components/ux/LoadingState';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProducersPage } from './pages/ProducersPage';
import { ProducerDetailPage } from './pages/ProducerDetailPage';
import { ProducerFormPage } from './pages/ProducerFormPage';
import { ProducerDashboardPage } from './pages/ProducerDashboardPage';
import { FarmsPage } from './pages/FarmsPage';
import { FarmDetailPage } from './pages/FarmDetailPage';
import { FarmFormPage } from './pages/FarmFormPage';
import { FarmDashboardPage } from './pages/FarmDashboardPage';
import { LotsPage } from './pages/LotsPage';
import { LotDetailPage } from './pages/LotDetailPage';
import { LotFormPage } from './pages/LotFormPage';
import { LotDashboardPage } from './pages/LotDashboardPage';
import { LotImportPage } from './pages/LotImportPage';
import { RecordExplorerPage } from './pages/RecordExplorerPage';
import { FormsPage } from './pages/FormsPage';
import { FormDetailPage } from './pages/FormDetailPage';
import { FormTemplatesPage } from './pages/FormTemplatesPage';
import { FormCampaignsPage } from './pages/FormCampaignsPage';
import { FormCollectionPage } from './pages/FormCollectionPage';
import { FormDataCenterPage } from './pages/FormDataCenterPage';
import { FormExportPage } from './pages/FormExportPage';
import { FormDesignerPage } from './pages/FormDesignerPage';
import { FormFillPage } from './pages/FormFillPage';
import { FormSubmissionsPage } from './pages/FormSubmissionsPage';
import { FormsDashboardPage } from './pages/FormsDashboardPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CoffeeCenterPage } from './pages/CoffeeCenterPage';
import { CoffeeReceptionPage } from './pages/CoffeeReceptionPage';
import { CoffeeQueuePage } from './pages/CoffeeQueuePage';
import { CoffeeQualityPage } from './pages/CoffeeQualityPage';
import { CoffeeQualityHistoryPage } from './pages/CoffeeQualityHistoryPage';
import { CoffeeQualityPhotosPage } from './pages/CoffeeQualityPhotosPage';
import { CoffeeQualitySamplesPage } from './pages/CoffeeQualitySamplesPage';
import { CoffeeQualityIndicatorsPage } from './pages/CoffeeQualityIndicatorsPage';
import { CoffeeSettlementsPage } from './pages/CoffeeSettlementsPage';
import { CoffeeSettlementReportsPage } from './pages/CoffeeSettlementReportsPage';
import { CoffeeTraceabilityPage } from './pages/CoffeeTraceabilityPage';
import { CoffeeInventoryPage } from './pages/CoffeeInventoryPage';
import { CoffeeKardexPage } from './pages/CoffeeKardexPage';
import { CoffeeInventoryAuditPage } from './pages/CoffeeInventoryAuditPage';
import { CoffeeOpsCenterPage } from './pages/CoffeeOpsCenterPage';
import { CoffeeExecutiveDashboardPage } from './pages/CoffeeExecutiveDashboardPage';
import { CoffeeAnalyticsPage } from './pages/CoffeeAnalyticsPage';
import { CoffeeReportsPage } from './pages/CoffeeReportsPage';
import { CoffeeHistoryPage } from './pages/CoffeeHistoryPage';
import { CoffeeAuditPage } from './pages/CoffeeAuditPage';
import { CoffeeConfigPage } from './pages/CoffeeConfigPage';
import { CoffeeConfigCenterPage } from './pages/CoffeeConfigCenterPage';
import { CoffeeCatalogsPage } from './pages/CoffeeCatalogsPage';
import { CoffeeParametersPage } from './pages/CoffeeParametersPage';
import { CoffeeCentersPage } from './pages/CoffeeCentersPage';
import { CoffeeValidationsPage } from './pages/CoffeeValidationsPage';
import { CoffeeConfigChangesPage } from './pages/CoffeeConfigChangesPage';
import { CoffeeDayPage } from './pages/CoffeeDayPage';
import { CoffeeStatsPage } from './pages/CoffeeStatsPage';
import { CoffeeLookupsPage } from './pages/CoffeeLookupsPage';
import { CoffeeWizardPage } from './pages/CoffeeWizardPage';
import { CoffeeTurnsBoardPage } from './pages/CoffeeTurnsBoardPage';
import { CoffeeWeighingPage } from './pages/CoffeeWeighingPage';
import { CoffeeScalesPage } from './pages/CoffeeScalesPage';
import { CoffeeWeighingHistoryPage } from './pages/CoffeeWeighingHistoryPage';
import { CoffeeWeighingMonitorPage } from './pages/CoffeeWeighingMonitorPage';



import { InventoryPage } from './pages/InventoryPage';
import { EimsCenterPage } from './pages/EimsCenterPage';
import { EimsItemsPage } from './pages/EimsItemsPage';
import { EimsWarehousesPage } from './pages/EimsWarehousesPage';
import { EimsLocationsPage } from './pages/EimsLocationsPage';
import { EimsCatalogsPage } from './pages/EimsCatalogsPage';
import { EimsParametersPage } from './pages/EimsParametersPage';
import { EimsAuditPage } from './pages/EimsAuditPage';
import { EimsMovementsPage } from './pages/EimsMovementsPage';
import { EimsKardexPage } from './pages/EimsKardexPage';
import { EimsPeriodsPage } from './pages/EimsPeriodsPage';
import { EimsLotsPage } from './pages/EimsLotsPage';
import { EimsLot360Page } from './pages/EimsLot360Page';
import { EimsExpiryPage } from './pages/EimsExpiryPage';
import { EimsAlertsPage } from './pages/EimsAlertsPage';
import { EimsTransformsPage } from './pages/EimsTransformsPage';
import { EimsCountsPage } from './pages/EimsCountsPage';
import { EimsCountDetailPage } from './pages/EimsCountDetailPage';
import { EimsCountHistoryPage } from './pages/EimsCountHistoryPage';
import { EimsCountActsPage } from './pages/EimsCountActsPage';
import { EimsSupplyCenterPage } from './pages/EimsSupplyCenterPage';
import { EimsReservationsPage } from './pages/EimsReservationsPage';
import { EimsPlannerPage } from './pages/EimsPlannerPage';
import { EimsSuggestionsPage } from './pages/EimsSuggestionsPage';
import { EimsProjectionPage } from './pages/EimsProjectionPage';
import { EimsSupplyCalendarPage } from './pages/EimsSupplyCalendarPage';
import { EimsPlanningAlertsPage } from './pages/EimsPlanningAlertsPage';
import { EimsScenarioSimulatorPage } from './pages/EimsScenarioSimulatorPage';
import { EimsOpsCenterPage } from './pages/EimsOpsCenterPage';
import { EimsAnalyticsPage } from './pages/EimsAnalyticsPage';
import { EimsReportsPage } from './pages/EimsReportsPage';
import { EimsWarehouseMapPage } from './pages/EimsWarehouseMapPage';
import { EscmCenterPage } from './pages/EscmCenterPage';
import { EscmCustomersPage } from './pages/EscmCustomersPage';
import { EscmPriceListsPage } from './pages/EscmPriceListsPage';
import { EscmConditionsPage } from './pages/EscmConditionsPage';
import { EscmCrmPage } from './pages/EscmCrmPage';
import { EscmCommercialHistoryPage } from './pages/EscmCommercialHistoryPage';
import { EscmConfigPage } from './pages/EscmConfigPage';
import { EscmCatalogsPage } from './pages/EscmCatalogsPage';
import { EscmParametersPage } from './pages/EscmParametersPage';
import { EscmAuditPage } from './pages/EscmAuditPage';
import { EscmCrmDashboardPage } from './pages/EscmCrmDashboardPage';
import { EscmPipelinePage } from './pages/EscmPipelinePage';
import { EscmOpportunitiesPage } from './pages/EscmOpportunitiesPage';
import { EscmQuotationsPage } from './pages/EscmQuotationsPage';
import { EscmOrdersPage } from './pages/EscmOrdersPage';
import { EscmOrderDetailPage } from './pages/EscmOrderDetailPage';
import { EscmApprovalsPage } from './pages/EscmApprovalsPage';
import { EscmReservationsPage } from './pages/EscmReservationsPage';
import { EscmLogisticsCenterPage } from './pages/EscmLogisticsCenterPage';
import { EscmDispatchesPage } from './pages/EscmDispatchesPage';
import { EscmDispatchDetailPage } from './pages/EscmDispatchDetailPage';
import { EscmRoutesPage } from './pages/EscmRoutesPage';
import { EscmDeliveriesPage } from './pages/EscmDeliveriesPage';
import { EscmIncidentsPage } from './pages/EscmIncidentsPage';
import { EscmBillingCenterPage } from './pages/EscmBillingCenterPage';
import { EscmInvoicesPage, EscmInvoiceDetailPage } from './pages/EscmInvoicesPage';
import { EscmReturnsPage } from './pages/EscmReturnsPage';
import { EscmWarrantiesPage } from './pages/EscmWarrantiesPage';
import { EscmNotesPage, EscmBillingDocumentsPage } from './pages/EscmNotesPage';
import { EscmArCenterPage } from './pages/EscmArCenterPage';
import {
  EscmOpsCenterPage,
  EscmOpsExecutivePage,
  EscmOpsCommercialPage,
  EscmOpsAnalyticsPage,
  EscmOpsReportsPage,
} from './pages/EscmOpsPages';
import {
  EfmCenterPage,
  EfmCoaPage,
  EfmConfigPage,
  EfmRulesPage,
  EfmPeriodsPage,
  EfmCostCentersPage,
  EfmValidationPage,
  EfmJournalsPage,
  EfmAuditPage,
  EfmVouchersPage,
  EfmJournalBookPage,
  EfmLedgerPage,
  EfmVoucherTypesPage,
} from './pages/EfmPages';
import {
  EfmApCenterPage,
  EfmApInvoicesPage,
  EfmApPaymentsPage,
  EfmApSchedulePage,
  EfmApApprovalsPage,
  EfmApSuppliersPage,
} from './pages/EfmApPages';
import {
  EfmTrCenterPage,
  EfmTrBanksPage,
  EfmTrCashBoxesPage,
  EfmTrMovementsPage,
  EfmTrReconciliationPage,
  EfmTrCashflowPage,
  EfmTrProjectionPage,
} from './pages/EfmTrPages';
import {
  EfmFaCenterPage,
  EfmFaAssetsPage,
  EfmFaDepreciationPage,
  EfmFaAmortizationPage,
  EfmFaInventoryPage,
  EfmFaHistoryPage,
  EfmFaDashboardPage,
} from './pages/EfmFaPages';
import {
  EfmBgCenterPage,
  EfmBgCostCentersPage,
  EfmBgExecutionPage,
  EfmBgComparativesPage,
  EfmBgDashboardPage,
  EfmBgAlertsPage,
} from './pages/EfmBgPages';
import {
  EfmFoCenterPage,
  EfmFoStatementsPage,
  EfmFoClosingPage,
  EfmFoKpiPage,
  EfmFoAnalyticsPage,
  EfmFoReportsPage,
  EfmFoDashboardPage,
  EfmFoAlertsPage,
  EfmFoAiPage,
} from './pages/EfmFoPages';
import {
  HcmCenterPage,
  HcmOrgPage,
  HcmEmployeesPage,
  HcmEmployeeFileRoutePage,
  HcmOrgChartPage,
  HcmSearchPage,
  HcmContractsPage,
  HcmAuditPage,
} from './pages/HcmPages';
import {
  HcmRcCenterPage,
  HcmRcVacanciesPage,
  HcmRcVacancyDetailPage,
  HcmRcCandidatesPage,
  HcmRcPortalPage,
  HcmRcPipelinePage,
  HcmRcInterviewsPage,
  HcmRcOffersPage,
  HcmRcOnboardingPage,
  HcmRcTalentPoolPage,
  HcmRcAuditPage,
} from './pages/HcmRcPages';
import {
  HcmTaCenterPage,
  HcmTaPunchesPage,
  HcmTaShiftsPage,
  HcmTaCalendarPage,
  HcmTaNoveltiesPage,
  HcmTaCorrectionsPage,
  HcmTaDashboardPage,
} from './pages/HcmTaPages';
import {
  HcmPyCenterPage,
  HcmPyConceptsPage,
  HcmPySettlementsPage,
  HcmPyBenefitsPage,
  HcmPyHistoryPage,
  HcmPyDashboardPage,
} from './pages/HcmPyPages';
import {
  HcmTdCenterPage,
  HcmTdCoursesPage,
  HcmTdEvaluationsPage,
  HcmTdCompetenciesPage,
  HcmTdObjectivesPage,
  HcmTdDashboardPage,
} from './pages/HcmTdPages';
import {
  HcmSsCenterPage,
  HcmSsHealthPage,
  HcmSsRisksPage,
  HcmSsPpePage,
  HcmSsIncidentsPage,
  HcmSsInspectionsPage,
  HcmSsDashboardPage,
} from './pages/HcmSsPages';
import { PortalDashboardPage, PortalProfilePage } from './pages/PortalPages';
import {
  PortalRequestsCenterPage,
  PortalRequestFormPage,
  PortalRequestHistoryPage,
} from './pages/PortalRequestPages';
import {
  PortalDocumentsCenterPage,
  PortalPayslipsPage,
  PortalSalaryHistoryPage,
  PortalContributionsPage,
  PortalPersonalDocsPage,
} from './pages/PortalPayrollDocsPages';
import { HedDashboardPage } from './pages/HedDashboardPage';
import {
  HpaPersonalDashboardPage,
  HpaKpisPage,
  HpaAnalyticsPage,
  HpaAiPanelPage,
} from './pages/HpaPages';
import {
  EmfgCenterPage,
  EmfgMasterPlanPage,
  EmfgBomPage,
  EmfgRoutingPage,
  EmfgOrdersPage,
  EmfgSchedulerPage,
} from './pages/EmfgPages';
import {
  EmfgMesCenterPage,
  EmfgMesPanelPage,
  EmfgMesTrackingPage,
  EmfgMesMonitorPage,
  EmfgMesConsumptionPage,
  EmfgMesTraceabilityPage,
} from './pages/EmfgMesPages';
import {
  EmfgQmsCenterPage,
  EmfgQmsInspectionsPage,
  EmfgQmsNcPage,
  EmfgQmsCapaPage,
  EmfgQmsReleasePage,
  EmfgQmsDashboardPage,
} from './pages/EmfgQmsPages';
import {
  EmfgResourcesCenterPage,
  EmfgResourcesWorkcentersPage,
  EmfgResourcesEquipmentPage,
  EmfgResourcesCapacityPage,
  EmfgResourcesDashboardPage,
} from './pages/EmfgResourcesPages';
import {
  EmfgCostCenterPage,
  EmfgCostWipPage,
  EmfgCostDashboardPage,
  EmfgCostVariancesPage,
  EmfgCostHistoryPage,
} from './pages/EmfgCostPages';
import {
  EmfgIntelligenceCenterPage,
  EmfgIntelligenceExecutivePage,
  EmfgIntelligenceOeePage,
  EmfgIntelligenceAnalyticsPage,
  EmfgIntelligenceSimulationPage,
  EmfgIntelligenceKpiPage,
} from './pages/EmfgIntelligencePages';
import {
  EpscmCenterPage,
  EpscmDemandPage,
  EpscmReplenishmentPage,
  EpscmInventoryPage,
  EpscmPlanningPage,
} from './pages/EpscmPages';
import {
  EpscmWmsCenterPage,
  EpscmWmsWarehousePage,
  EpscmWmsMapPage,
  EpscmWmsPickingPage,
  EpscmWmsPackingPage,
  EpscmWmsTransferPage,
  EpscmWmsLogisticsPage,
} from './pages/EpscmWmsPages';
import {
  EpscmTmsCenterPage,
  EpscmTmsFleetPage,
  EpscmTmsDriverPage,
  EpscmTmsRoutePage,
  EpscmTmsTripPage,
  EpscmTmsPodPage,
  EpscmTmsLogisticsPage,
  EpscmTmsCostPage,
} from './pages/EpscmTmsPages';
import {
  EpscmCollabCenterPage,
  EpscmCollabSupplierPage,
  EpscmCollabOperatorPage,
  EpscmCollabSlaPage,
  EpscmCollabCollaborationPage,
  EpscmCollabExecutivePage,
  EpscmCollabCompliancePage,
  EpscmCollabSimulationPage,
} from './pages/EpscmCollabPages';
import {
  EamCenterPage,
  EamAdminPage,
  EamLifecyclePage,
  EamLocationsPage,
  EamDashboardPage,
} from './pages/EamPages';
import {
  EamCmmsCenterPage,
  EamCmmsPage,
  EamCmmsWorkOrdersPage,
  EamCmmsPlannerPage,
  EamCmmsCalendarPage,
  EamCmmsIncidentsPage,
  EamCmmsTechniciansPage,
  EamCmmsCostDashboardPage,
  EamCmmsComplianceDashboardPage,
} from './pages/EamCmmsPages';
import {
  EamReliabilityCenterPage,
  EamExecutiveDashboardPage,
  EamEnergyDashboardPage,
  EamIndicatorsPanelPage,
  EamAnalyticsCenterPage,
  EamSimulationCenterPage,
  EamIotPanelPage,
} from './pages/EamReliabilityPages';
import {
  BpmsCenterPage,
  BpmsDesignerPage,
  BpmsAutomationCenterPage,
  BpmsProcessCenterPage,
  BpmsMonitoringPage,
  BpmsExecutiveDashboardPage,
  BpmsTemplateRepositoryPage,
  BpmsInboxPage,
} from './pages/BpmsPages';
import {
  EipCenterPage,
  EipApisPage,
  EipConnectorsPage,
  EipWebhooksPage,
  EipEventsPage,
  EipEsbPage,
  EipMessagingPage,
  EipPerformancePage,
  EipErrorsPage,
  EipRulesPage,
} from './pages/EipPages';
import {
  EintCenterPage,
  EintBiPage,
  EintDashboardsPage,
  EintReportsPage,
  EintAiPage,
  EintModelsPage,
  EintEtlPage,
  EintConsumptionPage,
  EintAssistantsPage,
  EintNotificationsPage,
} from './pages/EintPages';
import {
  EopsCenterPage,
  EopsDevopsPage,
  EopsObservabilityPage,
  EopsConfigPage,
  EopsLicensesPage,
  EopsBackupsPage,
  EopsHealthPage,
  EopsPerformancePage,
  EopsSecurityPage,
} from './pages/EopsPages';
import {
  EatpCenterPage,
  EatpFarmsPage,
  EatpLotsPage,
  EatpCropsPage,
  EatpCampaignsPage,
  EatpCalendarPage,
  EatpDashboardPage,
} from './pages/EatpPages';
import {
  EappCenterPage,
  EappMapPage,
  EappLayersPage,
  EappDronesPage,
  EappTelemetryPage,
  EappDashboardPage,
} from './pages/EappPages';
import {
  EiwpCenterPage,
  EiwpIrrigationPage,
  EiwpWeatherPage,
  EiwpClimateDashboardPage,
  EiwpAlertsPage,
  EiwpConsumptionPage,
} from './pages/EiwpPages';
import {
  EphpCenterPage,
  EphpPestsPage,
  EphpDiseasesPage,
  EphpIpmPage,
  EphpTreatmentsPage,
  EphpDashboardPage,
  EphpCompliancePage,
} from './pages/EphpPages';
import {
  EatrCenterPage,
  EatrHarvestPage,
  EatrPostharvestPage,
  EatrQualityPage,
  EatrCommercialLotsPage,
  EatrProductionDashboardPage,
  EatrQualityDashboardPage,
} from './pages/EatrPages';
import {
  EaccCenterPage,
  EaccCertificationsPage,
  EaccAuditsPage,
  EaccCompliancePage,
  EaccEsgPage,
  EaccSustainabilityDashboardPage,
  EaccEvidencesPage,
  EaccFindingsPage,
} from './pages/EaccPages';
import {
  EffmCenterPage,
  EffmImplementsPage,
  EffmOperationsPage,
  EffmFleetDashboardPage,
  EffmPerformanceDashboardPage,
  EffmTelemetryPage,
} from './pages/EffmPages';
import {
  EaipCenterPage,
  EaipSimulationPage,
  EaipModelsPage,
  EaipRecommendationsPage,
  EaipPredictiveDashboardPage,
  EaipAssistantPage,
} from './pages/EaipPages';
import {
  EaceCenterPage,
  EaceProducersPage,
  EaceCooperativesPage,
  EaceContractorsPage,
  EaceAdvisorsPage,
  EaceKnowledgePage,
  EaceMarketplacePage,
  EaceExecutivePage,
} from './pages/EacePages';
import { EscmReceivablesPage } from './pages/EscmReceivablesPage';
import { EscmPaymentsPage } from './pages/EscmPaymentsPage';
import { EscmCollectionPage, EscmAgreementsPage, EscmStatementsPage } from './pages/EscmCollectionPage';
import { EscmQuotationDetailPage } from './pages/EscmQuotationDetailPage';
import { EscmAgendaPage } from './pages/EscmAgendaPage';
import { EscmCustomerTimelinePage } from './pages/EscmCustomerTimelinePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AdminPage } from './pages/AdminPage';
import { GisMapPage } from './pages/GisMapPage';
import { GisDashboardPage } from './pages/GisDashboardPage';
import { GisLayersPage } from './pages/GisLayersPage';
import { GisImportPage } from './pages/GisImportPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { WorkflowDesignerPage } from './pages/WorkflowDesignerPage';
import { WorkflowInstancesPage } from './pages/WorkflowInstancesPage';
import { WorkflowInboxPage } from './pages/WorkflowInboxPage';
import { WorkflowDashboardPage } from './pages/WorkflowDashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationsDashboardPage } from './pages/NotificationsDashboardPage';
import { EventsTimelinePage } from './pages/EventsTimelinePage';
import { NotificationRulesPage } from './pages/NotificationRulesPage';
import { BiCenterPage } from './pages/BiCenterPage';
import { BiDashboardsPage } from './pages/BiDashboardsPage';
import { BiDashboardViewPage } from './pages/BiDashboardViewPage';
import { BiDashboardDesignerPage } from './pages/BiDashboardDesignerPage';
import { BiReportsPage } from './pages/BiReportsPage';
import { BiKpisPage } from './pages/BiKpisPage';
import { BiQueryBuilderPage } from './pages/BiQueryBuilderPage';
import { AiCenterPage } from './pages/AiCenterPage';
import { AiChatPage } from './pages/AiChatPage';
import { AiModelsPage } from './pages/AiModelsPage';
import { AiPromptsPage } from './pages/AiPromptsPage';
import { AiCopilotsPage } from './pages/AiCopilotsPage';
import { AiMetricsPage } from './pages/AiMetricsPage';
import { AiConversationsPage } from './pages/AiConversationsPage';
import { AiAutomationsPage } from './pages/AiAutomationsPage';
import { ApiCenterPage } from './pages/ApiCenterPage';
import { ApiCatalogPage } from './pages/ApiCatalogPage';
import { ApiClientsPage } from './pages/ApiClientsPage';
import { ApiMetricsPage } from './pages/ApiMetricsPage';
import { ApiDeveloperPortalPage } from './pages/ApiDeveloperPortalPage';
import { ApiVersionsPage } from './pages/ApiVersionsPage';
import { IamCenterPage } from './pages/IamCenterPage';
import { IamUsersPage } from './pages/IamUsersPage';
import { IamRolesPage } from './pages/IamRolesPage';
import { IamPermissionsPage } from './pages/IamPermissionsPage';
import { IamPoliciesPage } from './pages/IamPoliciesPage';
import { IamAuditPage } from './pages/IamAuditPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { MfaChallengePage } from './pages/MfaChallengePage';
import { RulesCenterPage } from './pages/RulesCenterPage';
import { RulesListPage } from './pages/RulesListPage';
import { RulesDesignerPage } from './pages/RulesDesignerPage';
import { RulesSimulatorPage } from './pages/RulesSimulatorPage';
import { RulesAuditPage, RulesVersionsPage } from './pages/RulesAuditPage';
import { TasksCenterPage } from './pages/TasksCenterPage';
import { TasksListPage } from './pages/TasksListPage';
import { TasksQueuesPage } from './pages/TasksQueuesPage';
import { TasksCalendarPage } from './pages/TasksCalendarPage';
import { TasksWorkersPage } from './pages/TasksWorkersPage';
import { TasksHistoryPage } from './pages/TasksHistoryPage';
import { PluginsCenterPage } from './pages/PluginsCenterPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { PluginsAdminPage } from './pages/PluginsAdminPage';
import { PluginsUpdatesPage } from './pages/PluginsUpdatesPage';
import { PluginsDeveloperPage } from './pages/PluginsDeveloperPage';
import { IoTCenterPage } from './pages/IoTCenterPage';
import { IoTDevicesPage } from './pages/IoTDevicesPage';
import { IoTMapPage } from './pages/IoTMapPage';
import { IoTTelemetryPage } from './pages/IoTTelemetryPage';
import { IoTAlertsPage } from './pages/IoTAlertsPage';
import { IoTFirmwarePage } from './pages/IoTFirmwarePage';
import { IntegrationCenterPage } from './pages/IntegrationCenterPage';
import { IntegrationConnectorsPage } from './pages/IntegrationConnectorsPage';
import { IntegrationFlowsPage } from './pages/IntegrationFlowsPage';
import { IntegrationHistoryPage } from './pages/IntegrationHistoryPage';
import { IntegrationErrorsPage } from './pages/IntegrationErrorsPage';
import { IntegrationDashboardPage } from './pages/IntegrationDashboardPage';
import { OpsCenterPage } from './pages/OpsCenterPage';
import { OpsInfraPage } from './pages/OpsInfraPage';
import { OpsServicesPage } from './pages/OpsServicesPage';
import { OpsDependenciesPage } from './pages/OpsDependenciesPage';
import { OpsIncidentsPage } from './pages/OpsIncidentsPage';
import { OpsTimelinePage } from './pages/OpsTimelinePage';

const PerfCenterPage = lazy(() => import('./pages/PerfCenterPage').then((m) => ({ default: m.PerfCenterPage })));
const PerfQueriesPage = lazy(() => import('./pages/PerfQueriesPage').then((m) => ({ default: m.PerfQueriesPage })));
const PerfCachePage = lazy(() => import('./pages/PerfCachePage').then((m) => ({ default: m.PerfCachePage })));
const PerfBenchmarksPage = lazy(() => import('./pages/PerfBenchmarksPage').then((m) => ({ default: m.PerfBenchmarksPage })));
const PerfFrontendPage = lazy(() => import('./pages/PerfFrontendPage').then((m) => ({ default: m.PerfFrontendPage })));
const PerfMobilePage = lazy(() => import('./pages/PerfMobilePage').then((m) => ({ default: m.PerfMobilePage })));

export function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <NavigationProvider>
        <MobileProvider>
        <WorkspaceProvider>
        <GuidedWorkspaceProvider>
        <UxProviders>
        <Suspense fallback={<ModuleLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/mfa" element={<MfaChallengePage />} />
          <Route path="/turnos/:organizationId" element={<CoffeeTurnsBoardPage />} />
          <Route element={<ProtectedRoute />}>

            <Route path="/" element={<DashboardPage />} />
            <Route path="/productores" element={<ProducersPage />} />
            <Route path="/productores/dashboard" element={<ProducerDashboardPage />} />
            <Route path="/productores/mapa" element={<ProducerDashboardPage />} />
            <Route path="/productores/nuevo" element={<ProducerFormPage />} />
            <Route path="/productores/:id" element={<ProducerDetailPage />} />
            <Route path="/productores/:id/editar" element={<ProducerFormPage />} />
            <Route path="/fincas" element={<FarmsPage />} />
            <Route path="/fincas/dashboard" element={<FarmDashboardPage />} />
            <Route path="/fincas/mapa" element={<FarmDashboardPage />} />
            <Route path="/fincas/nueva" element={<FarmFormPage />} />
            <Route path="/fincas/:id" element={<FarmDetailPage />} />
            <Route path="/fincas/:id/editar" element={<FarmFormPage />} />
            <Route path="/lotes" element={<LotsPage />} />
            <Route path="/lotes/dashboard" element={<LotDashboardPage />} />
            <Route path="/lotes/mapa" element={<LotDashboardPage />} />
            <Route path="/lotes/importar" element={<LotImportPage />} />
            <Route path="/lotes/nuevo" element={<LotFormPage />} />
            <Route path="/lotes/:id" element={<LotDetailPage />} />
            <Route path="/lotes/:id/editar" element={<LotFormPage />} />
            <Route path="/record-explorer/:entityType/:recordId" element={<RecordExplorerPage />} />
            <Route path="/formularios" element={<FormsPage />} />
            <Route path="/formularios/plantillas" element={<FormTemplatesPage />} />
            <Route path="/formularios/campanas" element={<FormCampaignsPage />} />
            <Route path="/formularios/recoleccion" element={<FormCollectionPage />} />
            <Route path="/formularios/centro-datos" element={<FormDataCenterPage />} />
            <Route path="/formularios/exportar" element={<FormExportPage />} />
            <Route path="/formularios/dashboard" element={<FormsDashboardPage />} />
            <Route path="/formularios/envios" element={<FormCollectionPage />} />
            <Route path="/formularios/nuevo" element={<FormDesignerPage />} />
            <Route path="/formularios/:id/disenar" element={<FormDesignerPage />} />
            <Route path="/formularios/:id/ejecutar" element={<FormFillPage />} />
            <Route path="/formularios/:id" element={<FormDetailPage />} />
            <Route path="/compras" element={<CoffeeCenterPage />} />
            <Route path="/compras/recepcion" element={<CoffeeReceptionPage />} />
            <Route path="/compras/wizard" element={<CoffeeWizardPage />} />
            <Route path="/compras/dia" element={<CoffeeDayPage />} />
            <Route path="/compras/cola" element={<CoffeeQueuePage />} />
            <Route path="/compras/pesaje" element={<CoffeeWeighingPage />} />
            <Route path="/compras/pesaje/monitor" element={<CoffeeWeighingMonitorPage />} />
            <Route path="/compras/pesaje/historial" element={<CoffeeWeighingHistoryPage />} />
            <Route path="/compras/balanzas" element={<CoffeeScalesPage />} />

            <Route path="/compras/calidad" element={<CoffeeQualityPage />} />
            <Route path="/compras/calidad/historial" element={<CoffeeQualityHistoryPage />} />
            <Route path="/compras/calidad/fotos" element={<CoffeeQualityPhotosPage />} />
            <Route path="/compras/calidad/muestras" element={<CoffeeQualitySamplesPage />} />
            <Route path="/compras/calidad/indicadores" element={<CoffeeQualityIndicatorsPage />} />
            <Route path="/compras/liquidaciones" element={<CoffeeSettlementsPage />} />
            <Route path="/compras/liquidaciones/reportes" element={<CoffeeSettlementReportsPage />} />
            <Route path="/compras/trazabilidad" element={<CoffeeTraceabilityPage />} />
            <Route path="/compras/inventario" element={<CoffeeInventoryPage />} />
            <Route path="/compras/inventario/kardex" element={<CoffeeKardexPage />} />
            <Route path="/compras/inventario/auditoria" element={<CoffeeInventoryAuditPage />} />
            <Route path="/compras/ops" element={<CoffeeOpsCenterPage />} />
            <Route path="/compras/ops/ejecutivo" element={<CoffeeExecutiveDashboardPage />} />
            <Route path="/compras/ops/analitica" element={<CoffeeAnalyticsPage />} />
            <Route path="/compras/ops/reportes" element={<CoffeeReportsPage />} />
            <Route path="/compras/historial" element={<CoffeeHistoryPage />} />
            <Route path="/compras/consultas" element={<CoffeeLookupsPage />} />
            <Route path="/compras/kpis" element={<CoffeeStatsPage />} />
            <Route path="/compras/auditoria" element={<CoffeeAuditPage />} />
            <Route path="/compras/config" element={<CoffeeConfigCenterPage />} />
            <Route path="/compras/config/catalogos" element={<CoffeeCatalogsPage />} />
            <Route path="/compras/config/parametros" element={<CoffeeParametersPage />} />
            <Route path="/compras/config/precios" element={<CoffeeConfigPage />} />
            <Route path="/compras/config/centros" element={<CoffeeCentersPage />} />
            <Route path="/compras/config/validaciones" element={<CoffeeValidationsPage />} />
            <Route path="/compras/config/cambios" element={<CoffeeConfigChangesPage />} />
            <Route path="/compras/simple" element={<PurchasesPage />} />

            <Route path="/inventario" element={<EimsCenterPage />} />
            <Route path="/inventario/movimientos" element={<EimsMovementsPage />} />
            <Route path="/inventario/kardex" element={<EimsKardexPage />} />
            <Route path="/inventario/cierres" element={<EimsPeriodsPage />} />
            <Route path="/inventario/lotes" element={<EimsLotsPage />} />
            <Route path="/inventario/lotes/vencimientos" element={<EimsExpiryPage />} />
            <Route path="/inventario/lotes/alertas" element={<EimsAlertsPage />} />
            <Route path="/inventario/lotes/transformaciones" element={<EimsTransformsPage />} />
            <Route path="/inventario/lotes/:lotKey" element={<EimsLot360Page />} />
            <Route path="/inventario/conteos" element={<EimsCountsPage />} />
            <Route path="/inventario/conteos/historial" element={<EimsCountHistoryPage />} />
            <Route path="/inventario/conteos/actas" element={<EimsCountActsPage />} />
            <Route path="/inventario/conteos/:countKey" element={<EimsCountDetailPage />} />
            <Route path="/inventario/abastecimiento" element={<EimsSupplyCenterPage />} />
            <Route path="/inventario/reservas" element={<EimsReservationsPage />} />
            <Route path="/inventario/planificador" element={<EimsPlannerPage />} />
            <Route path="/inventario/sugerencias" element={<EimsSuggestionsPage />} />
            <Route path="/inventario/proyeccion" element={<EimsProjectionPage />} />
            <Route path="/inventario/calendario-abastecimiento" element={<EimsSupplyCalendarPage />} />
            <Route path="/inventario/alertas-planificacion" element={<EimsPlanningAlertsPage />} />
            <Route path="/inventario/simulador" element={<EimsScenarioSimulatorPage />} />
            <Route path="/inventario/ops" element={<EimsOpsCenterPage />} />
            <Route path="/inventario/ops/analitica" element={<EimsAnalyticsPage />} />
            <Route path="/inventario/ops/reportes" element={<EimsReportsPage />} />
            <Route path="/inventario/ops/mapa" element={<EimsWarehouseMapPage />} />
            <Route path="/inventario/articulos" element={<EimsItemsPage />} />
            <Route path="/inventario/bodegas" element={<EimsWarehousesPage />} />
            <Route path="/inventario/ubicaciones" element={<EimsLocationsPage />} />
            <Route path="/inventario/catalogos" element={<EimsCatalogsPage />} />
            <Route path="/inventario/parametros" element={<EimsParametersPage />} />
            <Route path="/inventario/auditoria" element={<EimsAuditPage />} />
            <Route path="/inventario/recursos" element={<InventoryPage />} />
            <Route path="/comercial" element={<EscmCenterPage />} />
            <Route path="/comercial/clientes" element={<EscmCustomersPage />} />
            <Route path="/comercial/listas-precios" element={<EscmPriceListsPage />} />
            <Route path="/comercial/condiciones" element={<EscmConditionsPage />} />
            <Route path="/comercial/crm" element={<EscmCrmPage />} />
            <Route path="/comercial/crm/dashboard" element={<EscmCrmDashboardPage />} />
            <Route path="/comercial/historial" element={<EscmCommercialHistoryPage />} />
            <Route path="/comercial/configuracion" element={<EscmConfigPage />} />
            <Route path="/comercial/catalogos" element={<EscmCatalogsPage />} />
            <Route path="/comercial/parametros" element={<EscmParametersPage />} />
            <Route path="/comercial/auditoria" element={<EscmAuditPage />} />
            <Route path="/comercial/pipeline" element={<EscmPipelinePage />} />
            <Route path="/comercial/oportunidades" element={<EscmOpportunitiesPage />} />
            <Route path="/comercial/cotizaciones" element={<EscmQuotationsPage />} />
            <Route path="/comercial/cotizaciones/:quotationKey" element={<EscmQuotationDetailPage />} />
            <Route path="/comercial/pedidos" element={<EscmOrdersPage />} />
            <Route path="/comercial/pedidos/:orderKey" element={<EscmOrderDetailPage />} />
            <Route path="/comercial/aprobaciones" element={<EscmApprovalsPage />} />
            <Route path="/comercial/reservas" element={<EscmReservationsPage />} />
            <Route path="/comercial/logistica" element={<EscmLogisticsCenterPage />} />
            <Route path="/comercial/despachos" element={<EscmDispatchesPage />} />
            <Route path="/comercial/despachos/:dispatchKey" element={<EscmDispatchDetailPage />} />
            <Route path="/comercial/rutas" element={<EscmRoutesPage />} />
            <Route path="/comercial/entregas" element={<EscmDeliveriesPage />} />
            <Route path="/comercial/incidencias" element={<EscmIncidentsPage />} />
            <Route path="/comercial/facturacion" element={<EscmBillingCenterPage />} />
            <Route path="/comercial/facturas" element={<EscmInvoicesPage />} />
            <Route path="/comercial/facturas/:invoiceKey" element={<EscmInvoiceDetailPage />} />
            <Route path="/comercial/devoluciones" element={<EscmReturnsPage />} />
            <Route path="/comercial/garantias" element={<EscmWarrantiesPage />} />
            <Route path="/comercial/notas" element={<EscmNotesPage />} />
            <Route path="/comercial/documentos-facturacion" element={<EscmBillingDocumentsPage />} />
            <Route path="/comercial/cartera-centro" element={<EscmArCenterPage />} />
            <Route path="/comercial/cartera" element={<EscmReceivablesPage />} />
            <Route path="/comercial/recaudos" element={<EscmPaymentsPage />} />
            <Route path="/comercial/cobranza" element={<EscmCollectionPage />} />
            <Route path="/comercial/acuerdos" element={<EscmAgreementsPage />} />
            <Route path="/comercial/estados-cuenta" element={<EscmStatementsPage />} />
            <Route path="/comercial/ops" element={<EscmOpsCenterPage />} />
            <Route path="/comercial/ops/ejecutivo" element={<EscmOpsExecutivePage />} />
            <Route path="/comercial/ops/comercial" element={<EscmOpsCommercialPage />} />
            <Route path="/comercial/ops/analitica" element={<EscmOpsAnalyticsPage />} />
            <Route path="/comercial/ops/reportes" element={<EscmOpsReportsPage />} />
            <Route path="/finanzas" element={<EfmCenterPage />} />
            <Route path="/finanzas/plan-cuentas" element={<EfmCoaPage />} />
            <Route path="/finanzas/configuracion" element={<EfmConfigPage />} />
            <Route path="/finanzas/reglas" element={<EfmRulesPage />} />
            <Route path="/finanzas/periodos" element={<EfmPeriodsPage />} />
            <Route path="/finanzas/centros-costo" element={<EfmCostCentersPage />} />
            <Route path="/finanzas/validaciones" element={<EfmValidationPage />} />
            <Route path="/finanzas/asientos" element={<EfmJournalsPage />} />
            <Route path="/finanzas/comprobantes" element={<EfmVouchersPage />} />
            <Route path="/finanzas/libro-diario" element={<EfmJournalBookPage />} />
            <Route path="/finanzas/libro-mayor" element={<EfmLedgerPage />} />
            <Route path="/finanzas/tipos-comprobante" element={<EfmVoucherTypesPage />} />
            <Route path="/finanzas/cxp" element={<EfmApCenterPage />} />
            <Route path="/finanzas/cxp/facturas" element={<EfmApInvoicesPage />} />
            <Route path="/finanzas/cxp/pagos" element={<EfmApPaymentsPage />} />
            <Route path="/finanzas/cxp/programacion" element={<EfmApSchedulePage />} />
            <Route path="/finanzas/cxp/aprobaciones" element={<EfmApApprovalsPage />} />
            <Route path="/finanzas/cxp/proveedores" element={<EfmApSuppliersPage />} />
            <Route path="/finanzas/tesoreria" element={<EfmTrCenterPage />} />
            <Route path="/finanzas/tesoreria/bancos" element={<EfmTrBanksPage />} />
            <Route path="/finanzas/tesoreria/cajas" element={<EfmTrCashBoxesPage />} />
            <Route path="/finanzas/tesoreria/movimientos" element={<EfmTrMovementsPage />} />
            <Route path="/finanzas/tesoreria/conciliacion" element={<EfmTrReconciliationPage />} />
            <Route path="/finanzas/tesoreria/flujo-caja" element={<EfmTrCashflowPage />} />
            <Route path="/finanzas/tesoreria/proyeccion" element={<EfmTrProjectionPage />} />
            <Route path="/finanzas/activos-fijos" element={<EfmFaCenterPage />} />
            <Route path="/finanzas/activos-fijos/registro" element={<EfmFaAssetsPage />} />
            <Route path="/finanzas/activos-fijos/depreciaciones" element={<EfmFaDepreciationPage />} />
            <Route path="/finanzas/activos-fijos/amortizaciones" element={<EfmFaAmortizationPage />} />
            <Route path="/finanzas/activos-fijos/inventario" element={<EfmFaInventoryPage />} />
            <Route path="/finanzas/activos-fijos/historial" element={<EfmFaHistoryPage />} />
            <Route path="/finanzas/activos-fijos/dashboard" element={<EfmFaDashboardPage />} />
            <Route path="/finanzas/presupuestos" element={<EfmBgCenterPage />} />
            <Route path="/finanzas/presupuestos/centros-costo" element={<EfmBgCostCentersPage />} />
            <Route path="/finanzas/presupuestos/ejecucion" element={<EfmBgExecutionPage />} />
            <Route path="/finanzas/presupuestos/comparativos" element={<EfmBgComparativesPage />} />
            <Route path="/finanzas/presupuestos/dashboard" element={<EfmBgDashboardPage />} />
            <Route path="/finanzas/presupuestos/alertas" element={<EfmBgAlertsPage />} />
            <Route path="/finanzas/foc" element={<EfmFoCenterPage />} />
            <Route path="/finanzas/foc/estados" element={<EfmFoStatementsPage />} />
            <Route path="/finanzas/foc/cierres" element={<EfmFoClosingPage />} />
            <Route path="/finanzas/foc/kpis" element={<EfmFoKpiPage />} />
            <Route path="/finanzas/foc/analitica" element={<EfmFoAnalyticsPage />} />
            <Route path="/finanzas/foc/reportes" element={<EfmFoReportsPage />} />
            <Route path="/finanzas/foc/dashboard" element={<EfmFoDashboardPage />} />
            <Route path="/finanzas/foc/alertas" element={<EfmFoAlertsPage />} />
            <Route path="/finanzas/foc/ia" element={<EfmFoAiPage />} />
            <Route path="/finanzas/auditoria" element={<EfmAuditPage />} />
            <Route path="/manufactura" element={<EmfgCenterPage />} />
            <Route path="/manufactura/plan-maestro" element={<EmfgMasterPlanPage />} />
            <Route path="/manufactura/bom" element={<EmfgBomPage />} />
            <Route path="/manufactura/rutas" element={<EmfgRoutingPage />} />
            <Route path="/manufactura/ordenes" element={<EmfgOrdersPage />} />
            <Route path="/manufactura/programador" element={<EmfgSchedulerPage />} />
            <Route path="/manufactura/mes" element={<EmfgMesCenterPage />} />
            <Route path="/manufactura/mes/panel" element={<EmfgMesPanelPage />} />
            <Route path="/manufactura/mes/seguimiento" element={<EmfgMesTrackingPage />} />
            <Route path="/manufactura/mes/monitor" element={<EmfgMesMonitorPage />} />
            <Route path="/manufactura/mes/consumo" element={<EmfgMesConsumptionPage />} />
            <Route path="/manufactura/mes/trazabilidad" element={<EmfgMesTraceabilityPage />} />
            <Route path="/manufactura/mes/trazabilidad/:orderKey" element={<EmfgMesTraceabilityPage />} />
            <Route path="/manufactura/calidad" element={<EmfgQmsCenterPage />} />
            <Route path="/manufactura/calidad/inspecciones" element={<EmfgQmsInspectionsPage />} />
            <Route path="/manufactura/calidad/nc" element={<EmfgQmsNcPage />} />
            <Route path="/manufactura/calidad/capa" element={<EmfgQmsCapaPage />} />
            <Route path="/manufactura/calidad/liberacion" element={<EmfgQmsReleasePage />} />
            <Route path="/manufactura/calidad/dashboard" element={<EmfgQmsDashboardPage />} />
            <Route path="/manufactura/recursos" element={<EmfgResourcesCenterPage />} />
            <Route path="/manufactura/recursos/centros" element={<EmfgResourcesWorkcentersPage />} />
            <Route path="/manufactura/recursos/maquinaria" element={<EmfgResourcesEquipmentPage />} />
            <Route path="/manufactura/recursos/capacidad" element={<EmfgResourcesCapacityPage />} />
            <Route path="/manufactura/recursos/dashboard" element={<EmfgResourcesDashboardPage />} />
            <Route path="/manufactura/costos" element={<EmfgCostCenterPage />} />
            <Route path="/manufactura/costos/wip" element={<EmfgCostWipPage />} />
            <Route path="/manufactura/costos/dashboard" element={<EmfgCostDashboardPage />} />
            <Route path="/manufactura/costos/variaciones" element={<EmfgCostVariancesPage />} />
            <Route path="/manufactura/costos/historial" element={<EmfgCostHistoryPage />} />
            <Route path="/manufactura/inteligencia" element={<EmfgIntelligenceCenterPage />} />
            <Route path="/manufactura/inteligencia/ejecutivo" element={<EmfgIntelligenceExecutivePage />} />
            <Route path="/manufactura/inteligencia/oee" element={<EmfgIntelligenceOeePage />} />
            <Route path="/manufactura/inteligencia/kpis" element={<EmfgIntelligenceKpiPage />} />
            <Route path="/manufactura/inteligencia/analitica" element={<EmfgIntelligenceAnalyticsPage />} />
            <Route path="/manufactura/inteligencia/simulacion" element={<EmfgIntelligenceSimulationPage />} />
            <Route path="/cadena-suministro" element={<EpscmCenterPage />} />
            <Route path="/cadena-suministro/demanda" element={<EpscmDemandPage />} />
            <Route path="/cadena-suministro/reabastecimiento" element={<EpscmReplenishmentPage />} />
            <Route path="/cadena-suministro/inventarios" element={<EpscmInventoryPage />} />
            <Route path="/cadena-suministro/planificacion" element={<EpscmPlanningPage />} />
            <Route path="/cadena-suministro/wms" element={<EpscmWmsCenterPage />} />
            <Route path="/cadena-suministro/wms/bodegas" element={<EpscmWmsWarehousePage />} />
            <Route path="/cadena-suministro/wms/mapa" element={<EpscmWmsMapPage />} />
            <Route path="/cadena-suministro/wms/picking" element={<EpscmWmsPickingPage />} />
            <Route path="/cadena-suministro/wms/packing" element={<EpscmWmsPackingPage />} />
            <Route path="/cadena-suministro/wms/transferencias" element={<EpscmWmsTransferPage />} />
            <Route path="/cadena-suministro/wms/logistica" element={<EpscmWmsLogisticsPage />} />
            <Route path="/cadena-suministro/tms" element={<EpscmTmsCenterPage />} />
            <Route path="/cadena-suministro/tms/flotas" element={<EpscmTmsFleetPage />} />
            <Route path="/cadena-suministro/tms/conductores" element={<EpscmTmsDriverPage />} />
            <Route path="/cadena-suministro/tms/rutas" element={<EpscmTmsRoutePage />} />
            <Route path="/cadena-suministro/tms/viajes" element={<EpscmTmsTripPage />} />
            <Route path="/cadena-suministro/tms/pod" element={<EpscmTmsPodPage />} />
            <Route path="/cadena-suministro/tms/logistica" element={<EpscmTmsLogisticsPage />} />
            <Route path="/cadena-suministro/tms/costos" element={<EpscmTmsCostPage />} />
            <Route path="/cadena-suministro/colaboracion" element={<EpscmCollabCenterPage />} />
            <Route path="/cadena-suministro/colaboracion/proveedores" element={<EpscmCollabSupplierPage />} />
            <Route path="/cadena-suministro/colaboracion/operadores" element={<EpscmCollabOperatorPage />} />
            <Route path="/cadena-suministro/colaboracion/sla" element={<EpscmCollabSlaPage />} />
            <Route path="/cadena-suministro/colaboracion/colaboracion" element={<EpscmCollabCollaborationPage />} />
            <Route path="/cadena-suministro/colaboracion/ejecutivo" element={<EpscmCollabExecutivePage />} />
            <Route path="/cadena-suministro/colaboracion/cumplimiento" element={<EpscmCollabCompliancePage />} />
            <Route path="/cadena-suministro/colaboracion/simulacion" element={<EpscmCollabSimulationPage />} />
            <Route path="/gestion-activos" element={<EamCenterPage />} />
            <Route path="/gestion-activos/administrador" element={<EamAdminPage />} />
            <Route path="/gestion-activos/hoja-vida" element={<EamLifecyclePage />} />
            <Route path="/gestion-activos/ubicaciones" element={<EamLocationsPage />} />
            <Route path="/gestion-activos/dashboard" element={<EamDashboardPage />} />
            <Route path="/gestion-activos/mantenimiento" element={<EamCmmsCenterPage />} />
            <Route path="/gestion-activos/mantenimiento/cmms" element={<EamCmmsPage />} />
            <Route path="/gestion-activos/mantenimiento/ordenes" element={<EamCmmsWorkOrdersPage />} />
            <Route path="/gestion-activos/mantenimiento/planificador" element={<EamCmmsPlannerPage />} />
            <Route path="/gestion-activos/mantenimiento/calendario" element={<EamCmmsCalendarPage />} />
            <Route path="/gestion-activos/mantenimiento/incidentes" element={<EamCmmsIncidentsPage />} />
            <Route path="/gestion-activos/mantenimiento/tecnicos" element={<EamCmmsTechniciansPage />} />
            <Route path="/gestion-activos/mantenimiento/costos" element={<EamCmmsCostDashboardPage />} />
            <Route path="/gestion-activos/mantenimiento/cumplimiento" element={<EamCmmsComplianceDashboardPage />} />
            <Route path="/gestion-activos/confiabilidad" element={<EamReliabilityCenterPage />} />
            <Route path="/gestion-activos/confiabilidad/ejecutivo" element={<EamExecutiveDashboardPage />} />
            <Route path="/gestion-activos/confiabilidad/energia" element={<EamEnergyDashboardPage />} />
            <Route path="/gestion-activos/confiabilidad/indicadores" element={<EamIndicatorsPanelPage />} />
            <Route path="/gestion-activos/confiabilidad/analitica" element={<EamAnalyticsCenterPage />} />
            <Route path="/gestion-activos/confiabilidad/simulacion" element={<EamSimulationCenterPage />} />
            <Route path="/gestion-activos/confiabilidad/iot" element={<EamIotPanelPage />} />
            <Route path="/bpms" element={<BpmsCenterPage />} />
            <Route path="/bpms/disenador" element={<BpmsDesignerPage />} />
            <Route path="/bpms/automatizaciones" element={<BpmsAutomationCenterPage />} />
            <Route path="/bpms/procesos" element={<BpmsProcessCenterPage />} />
            <Route path="/bpms/monitoreo" element={<BpmsMonitoringPage />} />
            <Route path="/bpms/ejecutivo" element={<BpmsExecutiveDashboardPage />} />
            <Route path="/bpms/plantillas" element={<BpmsTemplateRepositoryPage />} />
            <Route path="/bpms/bandeja" element={<BpmsInboxPage />} />
            <Route path="/rrhh" element={<HcmCenterPage />} />
            <Route path="/rrhh/organizacion" element={<HcmOrgPage />} />
            <Route path="/rrhh/empleados" element={<HcmEmployeesPage />} />
            <Route path="/rrhh/empleados/:employeeKey" element={<HcmEmployeeFileRoutePage />} />
            <Route path="/rrhh/organigrama" element={<HcmOrgChartPage />} />
            <Route path="/rrhh/buscar" element={<HcmSearchPage />} />
            <Route path="/rrhh/contratos" element={<HcmContractsPage />} />
            <Route path="/rrhh/auditoria" element={<HcmAuditPage />} />
            <Route path="/rrhh/reclutamiento" element={<HcmRcCenterPage />} />
            <Route path="/rrhh/reclutamiento/vacantes" element={<HcmRcVacanciesPage />} />
            <Route path="/rrhh/reclutamiento/vacantes/:vacancyKey" element={<HcmRcVacancyDetailPage />} />
            <Route path="/rrhh/reclutamiento/candidatos" element={<HcmRcCandidatesPage />} />
            <Route path="/rrhh/reclutamiento/portal" element={<HcmRcPortalPage />} />
            <Route path="/rrhh/reclutamiento/pipeline" element={<HcmRcPipelinePage />} />
            <Route path="/rrhh/reclutamiento/entrevistas" element={<HcmRcInterviewsPage />} />
            <Route path="/rrhh/reclutamiento/ofertas" element={<HcmRcOffersPage />} />
            <Route path="/rrhh/reclutamiento/onboarding" element={<HcmRcOnboardingPage />} />
            <Route path="/rrhh/reclutamiento/talento" element={<HcmRcTalentPoolPage />} />
            <Route path="/rrhh/reclutamiento/auditoria" element={<HcmRcAuditPage />} />
            <Route path="/rrhh/asistencia" element={<HcmTaCenterPage />} />
            <Route path="/rrhh/asistencia/marcaciones" element={<HcmTaPunchesPage />} />
            <Route path="/rrhh/asistencia/turnos" element={<HcmTaShiftsPage />} />
            <Route path="/rrhh/asistencia/calendario" element={<HcmTaCalendarPage />} />
            <Route path="/rrhh/asistencia/novedades" element={<HcmTaNoveltiesPage />} />
            <Route path="/rrhh/asistencia/correcciones" element={<HcmTaCorrectionsPage />} />
            <Route path="/rrhh/asistencia/dashboard" element={<HcmTaDashboardPage />} />
            <Route path="/rrhh/nomina" element={<HcmPyCenterPage />} />
            <Route path="/rrhh/nomina/conceptos" element={<HcmPyConceptsPage />} />
            <Route path="/rrhh/nomina/liquidaciones" element={<HcmPySettlementsPage />} />
            <Route path="/rrhh/nomina/beneficios" element={<HcmPyBenefitsPage />} />
            <Route path="/rrhh/nomina/historial" element={<HcmPyHistoryPage />} />
            <Route path="/rrhh/nomina/dashboard" element={<HcmPyDashboardPage />} />
            <Route path="/rrhh/talento" element={<HcmTdCenterPage />} />
            <Route path="/rrhh/talento/cursos" element={<HcmTdCoursesPage />} />
            <Route path="/rrhh/talento/evaluaciones" element={<HcmTdEvaluationsPage />} />
            <Route path="/rrhh/talento/competencias" element={<HcmTdCompetenciesPage />} />
            <Route path="/rrhh/talento/objetivos" element={<HcmTdObjectivesPage />} />
            <Route path="/rrhh/talento/dashboard" element={<HcmTdDashboardPage />} />
            <Route path="/rrhh/sst" element={<HcmSsCenterPage />} />
            <Route path="/rrhh/sst/salud" element={<HcmSsHealthPage />} />
            <Route path="/rrhh/sst/riesgos" element={<HcmSsRisksPage />} />
            <Route path="/rrhh/sst/epp" element={<HcmSsPpePage />} />
            <Route path="/rrhh/sst/incidentes" element={<HcmSsIncidentsPage />} />
            <Route path="/rrhh/sst/inspecciones" element={<HcmSsInspectionsPage />} />
            <Route path="/rrhh/sst/dashboard" element={<HcmSsDashboardPage />} />
            <Route path="/portal" element={<PortalDashboardPage />} />
            <Route path="/portal/perfil" element={<PortalProfilePage />} />
            <Route path="/portal/solicitudes" element={<PortalRequestsCenterPage />} />
            <Route path="/portal/solicitudes/nueva" element={<PortalRequestFormPage />} />
            <Route path="/portal/solicitudes/historial" element={<PortalRequestHistoryPage />} />
            <Route path="/portal/documentos" element={<PortalDocumentsCenterPage />} />
            <Route path="/portal/documentos/certificados" element={<PortalPersonalDocsPage />} />
            <Route path="/portal/nomina/desprendibles" element={<PortalPayslipsPage />} />
            <Route path="/portal/nomina/historial" element={<PortalSalaryHistoryPage />} />
            <Route path="/portal/nomina/aportes" element={<PortalContributionsPage />} />
            <Route path="/rrhh/dashboard-ejecutivo" element={<HedDashboardPage />} />
            <Route path="/portal/mi-dashboard" element={<HpaPersonalDashboardPage />} />
            <Route path="/portal/analytics/indicadores" element={<HpaKpisPage />} />
            <Route path="/portal/analytics" element={<HpaAnalyticsPage />} />
            <Route path="/portal/analytics/ia" element={<HpaAiPanelPage />} />
            <Route path="/comercial/agenda" element={<EscmAgendaPage />} />
            <Route path="/comercial/historial-cliente" element={<EscmCustomerTimelinePage />} />
            <Route path="/documentos" element={<DocumentsPage />} />
            <Route path="/gis" element={<GisMapPage />} />
            <Route path="/gis/dashboard" element={<GisDashboardPage />} />
            <Route path="/gis/capas" element={<GisLayersPage />} />
            <Route path="/gis/importar" element={<GisImportPage />} />
            <Route path="/procesos" element={<WorkflowsPage />} />
            <Route path="/procesos/dashboard" element={<WorkflowDashboardPage />} />
            <Route path="/procesos/bandeja" element={<WorkflowInboxPage />} />
            <Route path="/procesos/instancias" element={<WorkflowInstancesPage />} />
            <Route path="/procesos/nuevo" element={<WorkflowDesignerPage />} />
            <Route path="/procesos/:id/disenar" element={<WorkflowDesignerPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
            <Route path="/notificaciones/dashboard" element={<NotificationsDashboardPage />} />
            <Route path="/notificaciones/eventos" element={<EventsTimelinePage />} />
            <Route path="/notificaciones/reglas" element={<NotificationRulesPage />} />
            <Route path="/bi" element={<BiCenterPage />} />
            <Route path="/bi/dashboards" element={<BiDashboardsPage />} />
            <Route path="/bi/dashboards/:id" element={<BiDashboardViewPage />} />
            <Route path="/bi/disenar" element={<BiDashboardDesignerPage />} />
            <Route path="/bi/disenar/:id" element={<BiDashboardDesignerPage />} />
            <Route path="/bi/reportes" element={<BiReportsPage />} />
            <Route path="/bi/kpis" element={<BiKpisPage />} />
            <Route path="/bi/consultas" element={<BiQueryBuilderPage />} />
            <Route path="/ia" element={<AiCenterPage />} />
            <Route path="/ia/chat" element={<AiChatPage />} />
            <Route path="/ia/modelos" element={<AiModelsPage />} />
            <Route path="/ia/prompts" element={<AiPromptsPage />} />
            <Route path="/ia/copilotos" element={<AiCopilotsPage />} />
            <Route path="/ia/metricas" element={<AiMetricsPage />} />
            <Route path="/ia/conversaciones" element={<AiConversationsPage />} />
            <Route path="/ia/automatizaciones" element={<AiAutomationsPage />} />
            <Route path="/apis" element={<ApiCenterPage />} />
            <Route path="/apis/catalogo" element={<ApiCatalogPage />} />
            <Route path="/apis/clientes" element={<ApiClientsPage />} />
            <Route path="/apis/metricas" element={<ApiMetricsPage />} />
            <Route path="/apis/desarrolladores" element={<ApiDeveloperPortalPage />} />
            <Route path="/apis/versiones" element={<ApiVersionsPage />} />
            <Route path="/iam" element={<IamCenterPage />} />
            <Route path="/iam/usuarios" element={<IamUsersPage />} />
            <Route path="/iam/roles" element={<IamRolesPage />} />
            <Route path="/iam/permisos" element={<IamPermissionsPage />} />
            <Route path="/iam/politicas" element={<IamPoliciesPage />} />
            <Route path="/iam/auditoria" element={<IamAuditPage />} />
            <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
            <Route path="/reglas" element={<RulesCenterPage />} />
            <Route path="/reglas/catalogo" element={<RulesListPage />} />
            <Route path="/reglas/disenar" element={<RulesDesignerPage />} />
            <Route path="/reglas/simulador" element={<RulesSimulatorPage />} />
            <Route path="/reglas/auditoria" element={<RulesAuditPage />} />
            <Route path="/reglas/versiones" element={<RulesVersionsPage />} />
            <Route path="/tareas" element={<TasksCenterPage />} />
            <Route path="/tareas/catalogo" element={<TasksListPage />} />
            <Route path="/tareas/colas" element={<TasksQueuesPage />} />
            <Route path="/tareas/calendario" element={<TasksCalendarPage />} />
            <Route path="/tareas/workers" element={<TasksWorkersPage />} />
            <Route path="/tareas/historial" element={<TasksHistoryPage />} />
            <Route path="/plugins" element={<PluginsCenterPage />} />
            <Route path="/plugins/marketplace" element={<MarketplacePage />} />
            <Route path="/plugins/admin" element={<PluginsAdminPage />} />
            <Route path="/plugins/actualizaciones" element={<PluginsUpdatesPage />} />
            <Route path="/plugins/desarrolladores" element={<PluginsDeveloperPage />} />
            <Route path="/iot" element={<IoTCenterPage />} />
            <Route path="/iot/dispositivos" element={<IoTDevicesPage />} />
            <Route path="/iot/mapa" element={<IoTMapPage />} />
            <Route path="/iot/telemetria" element={<IoTTelemetryPage />} />
            <Route path="/iot/alertas" element={<IoTAlertsPage />} />
            <Route path="/iot/firmware" element={<IoTFirmwarePage />} />
            <Route path="/integraciones" element={<IntegrationCenterPage />} />
            <Route path="/integraciones/conectores" element={<IntegrationConnectorsPage />} />
            <Route path="/integraciones/flujos" element={<IntegrationFlowsPage />} />
            <Route path="/integraciones/historial" element={<IntegrationHistoryPage />} />
            <Route path="/integraciones/errores" element={<IntegrationErrorsPage />} />
            <Route path="/integraciones/dashboard" element={<IntegrationDashboardPage />} />
            <Route path="/plataforma-empresarial/eip" element={<EipCenterPage />} />
            <Route path="/plataforma-empresarial/eip/apis" element={<EipApisPage />} />
            <Route path="/plataforma-empresarial/eip/conectores" element={<EipConnectorsPage />} />
            <Route path="/plataforma-empresarial/eip/webhooks" element={<EipWebhooksPage />} />
            <Route path="/plataforma-empresarial/eip/eventos" element={<EipEventsPage />} />
            <Route path="/plataforma-empresarial/eip/esb" element={<EipEsbPage />} />
            <Route path="/plataforma-empresarial/eip/mensajeria" element={<EipMessagingPage />} />
            <Route path="/plataforma-empresarial/eip/rendimiento" element={<EipPerformancePage />} />
            <Route path="/plataforma-empresarial/eip/errores" element={<EipErrorsPage />} />
            <Route path="/plataforma-empresarial/eip/reglas" element={<EipRulesPage />} />
            <Route path="/plataforma-empresarial/eint" element={<EintCenterPage />} />
            <Route path="/plataforma-empresarial/eint/bi" element={<EintBiPage />} />
            <Route path="/plataforma-empresarial/eint/dashboards" element={<EintDashboardsPage />} />
            <Route path="/plataforma-empresarial/eint/reportes" element={<EintReportsPage />} />
            <Route path="/plataforma-empresarial/eint/ia" element={<EintAiPage />} />
            <Route path="/plataforma-empresarial/eint/modelos" element={<EintModelsPage />} />
            <Route path="/plataforma-empresarial/eint/etl" element={<EintEtlPage />} />
            <Route path="/plataforma-empresarial/eint/consumo" element={<EintConsumptionPage />} />
            <Route path="/plataforma-empresarial/eint/asistentes" element={<EintAssistantsPage />} />
            <Route path="/plataforma-empresarial/eint/notificaciones" element={<EintNotificationsPage />} />
            <Route path="/plataforma-empresarial/eops" element={<EopsCenterPage />} />
            <Route path="/plataforma-empresarial/eops/devops" element={<EopsDevopsPage />} />
            <Route path="/plataforma-empresarial/eops/observabilidad" element={<EopsObservabilityPage />} />
            <Route path="/plataforma-empresarial/eops/configuracion" element={<EopsConfigPage />} />
            <Route path="/plataforma-empresarial/eops/licencias" element={<EopsLicensesPage />} />
            <Route path="/plataforma-empresarial/eops/backups" element={<EopsBackupsPage />} />
            <Route path="/plataforma-empresarial/eops/salud" element={<EopsHealthPage />} />
            <Route path="/plataforma-empresarial/eops/rendimiento" element={<EopsPerformancePage />} />
            <Route path="/plataforma-empresarial/eops/seguridad" element={<EopsSecurityPage />} />
            <Route path="/plataforma-agritech" element={<EatpCenterPage />} />
            <Route path="/plataforma-agritech/fincas" element={<EatpFarmsPage />} />
            <Route path="/plataforma-agritech/lotes" element={<EatpLotsPage />} />
            <Route path="/plataforma-agritech/cultivos" element={<EatpCropsPage />} />
            <Route path="/plataforma-agritech/campanas" element={<EatpCampaignsPage />} />
            <Route path="/plataforma-agritech/calendario" element={<EatpCalendarPage />} />
            <Route path="/plataforma-agritech/dashboard" element={<EatpDashboardPage />} />
            <Route path="/plataforma-agritech/precision" element={<EappCenterPage />} />
            <Route path="/plataforma-agritech/precision/mapa" element={<EappMapPage />} />
            <Route path="/plataforma-agritech/precision/capas" element={<EappLayersPage />} />
            <Route path="/plataforma-agritech/precision/drones" element={<EappDronesPage />} />
            <Route path="/plataforma-agritech/precision/telemetria" element={<EappTelemetryPage />} />
            <Route path="/plataforma-agritech/precision/dashboard" element={<EappDashboardPage />} />
            <Route path="/plataforma-agritech/riego" element={<EiwpCenterPage />} />
            <Route path="/plataforma-agritech/riego/programacion" element={<EiwpIrrigationPage />} />
            <Route path="/plataforma-agritech/riego/meteorologia" element={<EiwpWeatherPage />} />
            <Route path="/plataforma-agritech/riego/clima" element={<EiwpClimateDashboardPage />} />
            <Route path="/plataforma-agritech/riego/alertas" element={<EiwpAlertsPage />} />
            <Route path="/plataforma-agritech/riego/consumo" element={<EiwpConsumptionPage />} />
            <Route path="/plataforma-agritech/sanidad" element={<EphpCenterPage />} />
            <Route path="/plataforma-agritech/sanidad/plagas" element={<EphpPestsPage />} />
            <Route path="/plataforma-agritech/sanidad/enfermedades" element={<EphpDiseasesPage />} />
            <Route path="/plataforma-agritech/sanidad/mip" element={<EphpIpmPage />} />
            <Route path="/plataforma-agritech/sanidad/tratamientos" element={<EphpTreatmentsPage />} />
            <Route path="/plataforma-agritech/sanidad/dashboard" element={<EphpDashboardPage />} />
            <Route path="/plataforma-agritech/sanidad/normativo" element={<EphpCompliancePage />} />
            <Route path="/plataforma-agritech/trazabilidad" element={<EatrCenterPage />} />
            <Route path="/plataforma-agritech/trazabilidad/cosecha" element={<EatrHarvestPage />} />
            <Route path="/plataforma-agritech/trazabilidad/poscosecha" element={<EatrPostharvestPage />} />
            <Route path="/plataforma-agritech/trazabilidad/calidad" element={<EatrQualityPage />} />
            <Route path="/plataforma-agritech/trazabilidad/lotes" element={<EatrCommercialLotsPage />} />
            <Route path="/plataforma-agritech/trazabilidad/dashboard-produccion" element={<EatrProductionDashboardPage />} />
            <Route path="/plataforma-agritech/trazabilidad/dashboard-calidad" element={<EatrQualityDashboardPage />} />
            <Route path="/plataforma-agritech/cumplimiento" element={<EaccCenterPage />} />
            <Route path="/plataforma-agritech/cumplimiento/certificaciones" element={<EaccCertificationsPage />} />
            <Route path="/plataforma-agritech/cumplimiento/auditorias" element={<EaccAuditsPage />} />
            <Route path="/plataforma-agritech/cumplimiento/cumplimiento" element={<EaccCompliancePage />} />
            <Route path="/plataforma-agritech/cumplimiento/esg" element={<EaccEsgPage />} />
            <Route path="/plataforma-agritech/cumplimiento/sostenibilidad" element={<EaccSustainabilityDashboardPage />} />
            <Route path="/plataforma-agritech/cumplimiento/evidencias" element={<EaccEvidencesPage />} />
            <Route path="/plataforma-agritech/cumplimiento/hallazgos" element={<EaccFindingsPage />} />
            <Route path="/plataforma-agritech/maquinaria" element={<EffmCenterPage />} />
            <Route path="/plataforma-agritech/maquinaria/implementos" element={<EffmImplementsPage />} />
            <Route path="/plataforma-agritech/maquinaria/operaciones" element={<EffmOperationsPage />} />
            <Route path="/plataforma-agritech/maquinaria/flota" element={<EffmFleetDashboardPage />} />
            <Route path="/plataforma-agritech/maquinaria/rendimiento" element={<EffmPerformanceDashboardPage />} />
            <Route path="/plataforma-agritech/maquinaria/telemetria" element={<EffmTelemetryPage />} />
            <Route path="/plataforma-agritech/inteligencia" element={<EaipCenterPage />} />
            <Route path="/plataforma-agritech/inteligencia/simulacion" element={<EaipSimulationPage />} />
            <Route path="/plataforma-agritech/inteligencia/modelos" element={<EaipModelsPage />} />
            <Route path="/plataforma-agritech/inteligencia/recomendaciones" element={<EaipRecommendationsPage />} />
            <Route path="/plataforma-agritech/inteligencia/predictivo" element={<EaipPredictiveDashboardPage />} />
            <Route path="/plataforma-agritech/inteligencia/asistente" element={<EaipAssistantPage />} />
            <Route path="/plataforma-agritech/ecosistema" element={<EaceCenterPage />} />
            <Route path="/plataforma-agritech/ecosistema/productores" element={<EaceProducersPage />} />
            <Route path="/plataforma-agritech/ecosistema/cooperativas" element={<EaceCooperativesPage />} />
            <Route path="/plataforma-agritech/ecosistema/contratistas" element={<EaceContractorsPage />} />
            <Route path="/plataforma-agritech/ecosistema/asesores" element={<EaceAdvisorsPage />} />
            <Route path="/plataforma-agritech/ecosistema/conocimiento" element={<EaceKnowledgePage />} />
            <Route path="/plataforma-agritech/ecosistema/marketplace" element={<EaceMarketplacePage />} />
            <Route path="/plataforma-agritech/ecosistema/ejecutivo" element={<EaceExecutivePage />} />
            <Route path="/operaciones" element={<OpsCenterPage />} />
            <Route path="/operaciones/infraestructura" element={<OpsInfraPage />} />
            <Route path="/operaciones/servicios" element={<OpsServicesPage />} />
            <Route path="/operaciones/dependencias" element={<OpsDependenciesPage />} />
            <Route path="/operaciones/incidentes" element={<OpsIncidentsPage />} />
            <Route path="/operaciones/timeline" element={<OpsTimelinePage />} />
            <Route path="/rendimiento" element={<PerfCenterPage />} />
            <Route path="/rendimiento/consultas" element={<PerfQueriesPage />} />
            <Route path="/rendimiento/cache" element={<PerfCachePage />} />
            <Route path="/rendimiento/benchmarks" element={<PerfBenchmarksPage />} />
            <Route path="/rendimiento/frontend" element={<PerfFrontendPage />} />
            <Route path="/rendimiento/mobile" element={<PerfMobilePage />} />
            <Route path="/administracion/usuarios" element={<AdminPage defaultTab="users" />} />
            <Route path="/administracion" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </UxProviders>
        </GuidedWorkspaceProvider>
        </WorkspaceProvider>
        </MobileProvider>
        </NavigationProvider>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
