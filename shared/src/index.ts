export const EVENT_TYPES = {
  USER_CREATED: 'UserCreated',
  AUTH_LOGGED_IN: 'AuthLoggedIn',
  RESOURCE_CREATED: 'ResourceCreated',
  RESOURCE_UPDATED: 'ResourceUpdated',
  RESOURCE_DELETED: 'ResourceDeleted',
  FILE_UPLOADED: 'FileUploaded',
  USER_ACTION_EXECUTED: 'UserActionExecuted',
  FORM_CREATED: 'FormCreated',
  FORM_PUBLISHED: 'FormPublished',
  FORM_SUBMITTED: 'FormSubmitted',
  CAPTURE_ANALYTICS_EVENT: 'CaptureAnalyticsEvent',
  FORM_ARCHIVED: 'FormArchived',
  FORM_RESTORED: 'FormRestored',
  FORM_APPROVED: 'FormApproved',
  FORM_REJECTED: 'FormRejected',
  FORM_IMPORTED: 'FormImported',
  FORM_ASSIGNED: 'FormAssigned',
  FIELD_VALIDATED: 'FieldValidated',
  SYNC_COMPLETED: 'SyncCompleted',
  AUTH_LOGGED_OUT: 'AuthLoggedOut',
  SESSION_CREATED: 'SessionCreated',
  SESSION_REVOKED: 'SessionRevoked',
  USER_UPDATED: 'UserUpdated',
  USER_LOCKED: 'UserLocked',
  USER_UNLOCKED: 'UserUnlocked',
  ROLE_ASSIGNED: 'RoleAssigned',
  ROLE_REVOKED: 'RoleRevoked',
  PERMISSION_GRANTED: 'PermissionGranted',
  POLICY_CREATED: 'PolicyCreated',
  POLICY_UPDATED: 'PolicyUpdated',
  DELEGATION_CREATED: 'DelegationCreated',
  DELEGATION_REVOKED: 'DelegationRevoked',
  SUBSTITUTION_CREATED: 'SubstitutionCreated',
  SUBSTITUTION_REVOKED: 'SubstitutionRevoked',
  SERVICE_ACCOUNT_CREATED: 'ServiceAccountCreated',
  API_KEY_CREATED: 'ApiKeyCreated',
  ACCESS_DENIED: 'AccessDenied',
  WORKFLOW_DEFINITION_CREATED: 'WorkflowDefinitionCreated',
  WORKFLOW_VERSION_CREATED: 'WorkflowVersionCreated',
  WORKFLOW_VERSION_PUBLISHED: 'WorkflowVersionPublished',
  WORKFLOW_STARTED: 'WorkflowStarted',
  WORKFLOW_STATE_CHANGED: 'WorkflowStateChanged',
  WORKFLOW_TRANSITION_EXECUTED: 'WorkflowTransitionExecuted',
  WORKFLOW_COMPLETED: 'WorkflowCompleted',
  WORKFLOW_CANCELLED: 'WorkflowCancelled',
  WORKFLOW_SUSPENDED: 'WorkflowSuspended',
  WORKFLOW_RESUMED: 'WorkflowResumed',
  WORKFLOW_ASSIGNMENT_CREATED: 'WorkflowAssignmentCreated',
  WORKFLOW_NOTIFICATION_QUEUED: 'WorkflowNotificationQueued',
  WORKFLOW_ACTION_EXECUTED: 'WorkflowActionExecuted',
  PRODUCER_CREATED: 'ProducerCreated',
  PRODUCER_UPDATED: 'ProducerUpdated',
  PRODUCER_DELETED: 'ProducerDeleted',
  PRODUCER_LIFECYCLE_CHANGED: 'ProducerLifecycleChanged',
  PRODUCER_ASSIGNED: 'ProducerAssigned',
  PRODUCER_MERGED: 'ProducerMerged',
  PRODUCER_SYNCED: 'ProducerSynced',
  FARM_CREATED: 'FarmCreated',
  FARM_UPDATED: 'FarmUpdated',
  FARM_DELETED: 'FarmDeleted',
  FARM_LIFECYCLE_CHANGED: 'FarmLifecycleChanged',
  FARM_GEOMETRY_REVISED: 'FarmGeometryRevised',
  FARM_SYNCED: 'FarmSynced',
  FARM_TWIN_REFRESHED: 'FarmTwinRefreshed',
  FIELD_LOT_REGISTERED: 'FieldLotRegistered',
  FIELD_LOT_ACTIVATED: 'FieldLotActivated',
  FIELD_LOT_UPDATED: 'FieldLotUpdated',
  FIELD_LOT_DELETED: 'FieldLotDeleted',
  FIELD_LOT_STATUS_CHANGED: 'FieldLotStatusChanged',
  FIELD_OPERATION_RECORDED: 'FieldOperationRecorded',
  FIELD_OPERATION_VERIFIED: 'FieldOperationVerified',
  FIELD_OPERATION_VOIDED: 'FieldOperationVoided',
  LOT_COST_RECORDED: 'LotCostRecorded',
  HARVEST_RECORDED: 'HarvestRecorded',
  HARVEST_CAMPAIGN_CLOSED: 'HarvestCampaignClosed',
  LOT_DIGITAL_TWIN_REFRESHED: 'LotDigitalTwinRefreshed',
  LOT_KPI_CALCULATED: 'LotKpiCalculated',
  LOT_RECOMMENDATION_ISSUED: 'LotRecommendationIssued',
  LOT_GEOMETRY_REVISED: 'LotGeometryRevised',
  FIELD_LOT_SYNCED: 'FieldLotSynced',
  LOT_IMPORT_COMPLETED: 'LotImportCompleted',
  MAP_LAYER_PUBLISHED: 'MapLayerPublished',
  SPATIAL_ANALYSIS_COMPLETED: 'SpatialAnalysisCompleted',
  ROUTE_PLAN_CREATED: 'RoutePlanCreated',
  ROUTE_PLAN_APPROVED: 'RoutePlanApproved',
  GEOFENCE_VIOLATION: 'GeofenceViolation',
  GEOFENCE_ENTERED: 'GeofenceEntered',
  GEOFENCE_EXITED: 'GeofenceExited',
  GEOMETRY_IMPORT_COMPLETED: 'GeometryImportCompleted',
  GEOMETRY_VALIDATION_FAILED: 'GeometryValidationFailed',
  TERRITORY_HEATMAP_CALCULATED: 'TerritoryHeatmapCalculated',
  GPS_TRACK_RECORDED: 'GpsTrackRecorded',
  MAP_EXPORT_GENERATED: 'MapExportGenerated',
  LAYER_PROJECTION_REFRESHED: 'LayerProjectionRefreshed',
  GEO_EVENT_RECORDED: 'GeoEventRecorded',
  NOTIFICATION_SENT: 'NotificationSent',
  NOTIFICATION_DELIVERED: 'NotificationDelivered',
  NOTIFICATION_READ: 'NotificationRead',
  NOTIFICATION_ATTENDED: 'NotificationAttended',
  NOTIFICATION_RULE_TRIGGERED: 'NotificationRuleTriggered',
  NOTIFICATION_ESCALATED: 'NotificationEscalated',
  NOTIFICATION_SCHEDULE_FIRED: 'NotificationScheduleFired',
  EXTERNAL_EVENT_RECEIVED: 'ExternalEventReceived',
  BUSINESS_RULE_EXECUTED: 'BusinessRuleExecuted',
  BUSINESS_RULE_FAILED: 'BusinessRuleFailed',
  BUSINESS_RULE_PUBLISHED: 'BusinessRulePublished',
  BUSINESS_RULE_SIMULATED: 'BusinessRuleSimulated',
  JOB_SCHEDULED: 'JobScheduled',
  JOB_STARTED: 'JobStarted',
  JOB_COMPLETED: 'JobCompleted',
  JOB_FAILED: 'JobFailed',
  JOB_RETRY_SCHEDULED: 'JobRetryScheduled',
  JOB_DEAD_LETTERED: 'JobDeadLettered',
  WORKER_REGISTERED: 'WorkerRegistered',
  WORKER_HEARTBEAT: 'WorkerHeartbeat',
  PLUGIN_INSTALLED: 'PluginInstalled',
  PLUGIN_ENABLED: 'PluginEnabled',
  PLUGIN_DISABLED: 'PluginDisabled',
  PLUGIN_UPDATED: 'PluginUpdated',
  PLUGIN_UNINSTALLED: 'PluginUninstalled',
  PLUGIN_UPDATE_FAILED: 'PluginUpdateFailed',
  PLUGIN_ROLLBACK: 'PluginRollback',
  PLUGIN_PUBLISHED: 'PluginPublished',
  DEVICE_REGISTERED: 'DeviceRegistered',
  DEVICE_ACTIVATED: 'DeviceActivated',
  DEVICE_DEACTIVATED: 'DeviceDeactivated',
  DEVICE_REVOKED: 'DeviceRevoked',
  TELEMETRY_RECEIVED: 'TelemetryReceived',
  DEVICE_ALARM_RAISED: 'DeviceAlarmRaised',
  DEVICE_OFFLINE: 'DeviceOffline',
  FIRMWARE_DEPLOYED: 'FirmwareDeployed',
  EDGE_SYNC_COMPLETED: 'EdgeSyncCompleted',
  CONNECTOR_REGISTERED: 'ConnectorRegistered',
  CONNECTOR_ACTIVATED: 'ConnectorActivated',
  INTEGRATION_FLOW_PUBLISHED: 'IntegrationFlowPublished',
  INTEGRATION_SYNC_STARTED: 'IntegrationSyncStarted',
  INTEGRATION_SYNC_COMPLETED: 'IntegrationSyncCompleted',
  INTEGRATION_SYNC_FAILED: 'IntegrationSyncFailed',
  INTEGRATION_ERROR_RAISED: 'IntegrationErrorRaised',
  INTEGRATION_WEBHOOK_RECEIVED: 'IntegrationWebhookReceived',
  OBSERVABILITY_LOG_INGESTED: 'ObservabilityLogIngested',
  OBSERVABILITY_TRACE_RECORDED: 'ObservabilityTraceRecorded',
  OBSERVABILITY_ALERT_RAISED: 'ObservabilityAlertRaised',
  OBSERVABILITY_INCIDENT_OPENED: 'ObservabilityIncidentOpened',
  OBSERVABILITY_INCIDENT_RESOLVED: 'ObservabilityIncidentResolved',
  OBSERVABILITY_HEALTH_DEGRADED: 'ObservabilityHealthDegraded',
  OBSERVABILITY_ERROR_TRACKED: 'ObservabilityErrorTracked',
  PERF_CACHE_HIT: 'PerfCacheHit',
  PERF_CACHE_MISS: 'PerfCacheMiss',
  PERF_SLOW_QUERY_DETECTED: 'PerfSlowQueryDetected',
  PERF_INDEX_RECOMMENDED: 'PerfIndexRecommended',
  PERF_BENCHMARK_COMPLETED: 'PerfBenchmarkCompleted',
  PERF_MAINTENANCE_COMPLETED: 'PerfMaintenanceCompleted',
  PERF_ARCHIVE_COMPLETED: 'PerfArchiveCompleted',
  COFFEE_TICKET_CREATED: 'CoffeeTicketCreated',
  COFFEE_IDENTITY_VALIDATED: 'CoffeeIdentityValidated',
  COFFEE_TURN_ASSIGNED: 'CoffeeTurnAssigned',
  COFFEE_WEIGHED: 'CoffeeWeighed',
  COFFEE_WEIGHING_STARTED: 'CoffeeWeighingStarted',
  COFFEE_WEIGHING_READING: 'CoffeeWeighingReading',
  COFFEE_WEIGHING_CONFIRMED: 'CoffeeWeighingConfirmed',
  COFFEE_WEIGHING_CONTINGENCY: 'CoffeeWeighingContingency',
  COFFEE_SCALE_OFFLINE: 'CoffeeScaleOffline',
  COFFEE_SENT_TO_QUALITY: 'CoffeeSentToQuality',
  COFFEE_QUALITY_RECORDED: 'CoffeeQualityRecorded',
  COFFEE_QUALITY_STARTED: 'CoffeeQualityStarted',
  COFFEE_QUALITY_RULES_APPLIED: 'CoffeeQualityRulesApplied',
  COFFEE_QUALITY_DECIDED: 'CoffeeQualityDecided',
  COFFEE_QUALITY_REJECTED: 'CoffeeQualityRejected',
  COFFEE_QUALITY_LAB_REQUIRED: 'CoffeeQualityLabRequired',
  COFFEE_SENT_TO_SETTLEMENT: 'CoffeeSentToSettlement',
  COFFEE_SETTLED: 'CoffeeSettled',
  COFFEE_SETTLEMENT_STARTED: 'CoffeeSettlementStarted',
  COFFEE_SETTLEMENT_SIMULATED: 'CoffeeSettlementSimulated',
  COFFEE_SETTLEMENT_POSTED: 'CoffeeSettlementPosted',
  COFFEE_SETTLEMENT_VOIDED: 'CoffeeSettlementVoided',
  COFFEE_PAYMENT_REGISTERED: 'CoffeePaymentRegistered',
  COFFEE_INVENTORY_POSTED: 'CoffeeInventoryPosted',
  COFFEE_INVENTORY_LOT_CREATED: 'CoffeeInventoryLotCreated',
  COFFEE_INVENTORY_MOVEMENT: 'CoffeeInventoryMovement',
  COFFEE_OPS_ALERT_RAISED: 'CoffeeOpsAlertRaised',
  COFFEE_REPORT_GENERATED: 'CoffeeReportGenerated',
  COFFEE_DOCUMENT_GENERATED: 'CoffeeDocumentGenerated',
  COFFEE_DOCUMENT_REPRINTED: 'CoffeeDocumentReprinted',
  COFFEE_CATALOG_UPDATED: 'CoffeeCatalogUpdated',
  COFFEE_PARAMETER_UPDATED: 'CoffeeParameterUpdated',
  COFFEE_RECEPTION_RULE_UPDATED: 'CoffeeReceptionRuleUpdated',
  COFFEE_CONFIG_CHANGED: 'CoffeeConfigChanged',
  EIMS_CATALOG_UPDATED: 'EimsCatalogUpdated',
  EIMS_PARAMETER_UPDATED: 'EimsParameterUpdated',
  EIMS_WAREHOUSE_UPDATED: 'EimsWarehouseUpdated',
  EIMS_LOCATION_UPDATED: 'EimsLocationUpdated',
  EIMS_ITEM_UPDATED: 'EimsItemUpdated',
  EIMS_MOVEMENT_POSTED: 'EimsMovementPosted',
  EIMS_MOVEMENT_VOIDED: 'EimsMovementVoided',
  EIMS_PERIOD_CLOSED: 'EimsPeriodClosed',
  EIMS_PERIOD_REOPENED: 'EimsPeriodReopened',
  EIMS_PERIOD_RECALCULATED: 'EimsPeriodRecalculated',
  EIMS_LOT_CREATED: 'EimsLotCreated',
  EIMS_LOT_UPDATED: 'EimsLotUpdated',
  EIMS_LOT_RECLASSIFIED: 'EimsLotReclassified',
  EIMS_LOT_BLOCKED: 'EimsLotBlocked',
  EIMS_LOT_EXPIRED: 'EimsLotExpired',
  EIMS_TRANSFORM_POSTED: 'EimsTransformPosted',
  EIMS_SERIAL_CREATED: 'EimsSerialCreated',
  EIMS_SERIAL_MAINTENANCE: 'EimsSerialMaintenance',
  EIMS_EXPIRY_ALERT: 'EimsExpiryAlert',
  EIMS_LOT_INCIDENT: 'EimsLotIncident',
  EIMS_TRACE_RECORDED: 'EimsTraceRecorded',
  EIMS_COUNT_PLANNED: 'EimsCountPlanned',
  EIMS_COUNT_ASSIGNED: 'EimsCountAssigned',
  EIMS_COUNT_STARTED: 'EimsCountStarted',
  EIMS_COUNT_CAPTURED: 'EimsCountCaptured',
  EIMS_COUNT_RECONCILED: 'EimsCountReconciled',
  EIMS_COUNT_APPROVAL_REQUESTED: 'EimsCountApprovalRequested',
  EIMS_COUNT_APPROVED: 'EimsCountApproved',
  EIMS_COUNT_ADJUSTMENT_POSTED: 'EimsCountAdjustmentPosted',
  EIMS_COUNT_CLOSED: 'EimsCountClosed',
  EIMS_RESERVATION_CREATED: 'EimsReservationCreated',
  EIMS_RESERVATION_RELEASED: 'EimsReservationReleased',
  EIMS_RESERVATION_REASSIGNED: 'EimsReservationReassigned',
  EIMS_POLICY_UPDATED: 'EimsPolicyUpdated',
  EIMS_SUGGESTION_GENERATED: 'EimsSuggestionGenerated',
  EIMS_SUGGESTION_ACCEPTED: 'EimsSuggestionAccepted',
  EIMS_SUGGESTION_REJECTED: 'EimsSuggestionRejected',
  EIMS_PLANNING_ALERT: 'EimsPlanningAlert',
  EIMS_SCENARIO_SIMULATED: 'EimsScenarioSimulated',
  EIMS_AI_INSIGHT: 'EimsAiInsight',
  EIMS_OPS_ALERT: 'EimsOpsAlert',
  EIMS_REPORT_GENERATED: 'EimsReportGenerated',
  EIMS_OPS_SNAPSHOT: 'EimsOpsSnapshot',
  ESCM_CATALOG_UPDATED: 'EscmCatalogUpdated',
  ESCM_PARAMETER_UPDATED: 'EscmParameterUpdated',
  ESCM_CUSTOMER_CREATED: 'EscmCustomerCreated',
  ESCM_CUSTOMER_UPDATED: 'EscmCustomerUpdated',
  ESCM_PRICE_LIST_UPDATED: 'EscmPriceListUpdated',
  ESCM_PRICE_CHANGED: 'EscmPriceChanged',
  ESCM_CONDITION_UPDATED: 'EscmConditionUpdated',
  ESCM_CREDIT_POLICY_UPDATED: 'EscmCreditPolicyUpdated',
  ESCM_PROSPECT_CREATED: 'EscmProspectCreated',
  ESCM_OPPORTUNITY_CREATED: 'EscmOpportunityCreated',
  ESCM_OPPORTUNITY_STAGE_CHANGED: 'EscmOpportunityStageChanged',
  ESCM_OPPORTUNITY_WON: 'EscmOpportunityWon',
  ESCM_OPPORTUNITY_LOST: 'EscmOpportunityLost',
  ESCM_QUOTATION_CREATED: 'EscmQuotationCreated',
  ESCM_QUOTATION_VERSIONED: 'EscmQuotationVersioned',
  ESCM_QUOTATION_APPROVED: 'EscmQuotationApproved',
  ESCM_QUOTATION_REJECTED: 'EscmQuotationRejected',
  ESCM_QUOTATION_CONVERTED: 'EscmQuotationConverted',
  ESCM_ACTIVITY_CREATED: 'EscmActivityCreated',
  ESCM_ORDER_CREATED: 'EscmOrderCreated',
  ESCM_ORDER_SUBMITTED: 'EscmOrderSubmitted',
  ESCM_ORDER_APPROVED: 'EscmOrderApproved',
  ESCM_ORDER_REJECTED: 'EscmOrderRejected',
  ESCM_ORDER_RESERVED: 'EscmOrderReserved',
  ESCM_ORDER_STATUS_CHANGED: 'EscmOrderStatusChanged',
  ESCM_ORDER_DISPATCHED: 'EscmOrderDispatched',
  ESCM_ORDER_CANCELLED: 'EscmOrderCancelled',
  ESCM_DISPATCH_CREATED: 'EscmDispatchCreated',
  ESCM_DISPATCH_CANCELLED: 'EscmDispatchCancelled',
  ESCM_DISPATCH_STATUS_CHANGED: 'EscmDispatchStatusChanged',
  ESCM_ROUTE_CREATED: 'EscmRouteCreated',
  ESCM_DELIVERY_CONFIRMED: 'EscmDeliveryConfirmed',
  ESCM_LOGISTICS_INCIDENT: 'EscmLogisticsIncident',
  ESCM_INVOICE_CREATED: 'EscmInvoiceCreated',
  ESCM_INVOICE_ISSUED: 'EscmInvoiceIssued',
  ESCM_INVOICE_VOIDED: 'EscmInvoiceVoided',
  ESCM_RETURN_CREATED: 'EscmReturnCreated',
  ESCM_RETURN_APPROVED: 'EscmReturnApproved',
  ESCM_RETURN_PROCESSED: 'EscmReturnProcessed',
  ESCM_WARRANTY_CREATED: 'EscmWarrantyCreated',
  ESCM_WARRANTY_APPROVED: 'EscmWarrantyApproved',
  ESCM_WARRANTY_REJECTED: 'EscmWarrantyRejected',
  ESCM_WARRANTY_CLOSED: 'EscmWarrantyClosed',
  ESCM_CREDIT_NOTE_CREATED: 'EscmCreditNoteCreated',
  ESCM_CREDIT_NOTE_ISSUED: 'EscmCreditNoteIssued',
  ESCM_DEBIT_NOTE_CREATED: 'EscmDebitNoteCreated',
  ESCM_DEBIT_NOTE_ISSUED: 'EscmDebitNoteIssued',
  ESCM_RECEIVABLE_CREATED: 'EscmReceivableCreated',
  ESCM_PAYMENT_REGISTERED: 'EscmPaymentRegistered',
  ESCM_PAYMENT_CONFIRMED: 'EscmPaymentConfirmed',
  ESCM_PAYMENT_VOIDED: 'EscmPaymentVoided',
  ESCM_PAYMENT_RECONCILED: 'EscmPaymentReconciled',
  ESCM_COLLECTION_CAMPAIGN_CREATED: 'EscmCollectionCampaignCreated',
  ESCM_COLLECTION_REMINDER_SENT: 'EscmCollectionReminderSent',
  ESCM_COLLECTION_ESCALATED: 'EscmCollectionEscalated',
  ESCM_AGREEMENT_CREATED: 'EscmAgreementCreated',
  ESCM_AGREEMENT_ACTIVATED: 'EscmAgreementActivated',
  ESCM_PROMISE_CREATED: 'EscmPromiseCreated',
  ESCM_PROMISE_BROKEN: 'EscmPromiseBroken',
  ESCM_OPS_ALERT_CREATED: 'EscmOpsAlertCreated',
  ESCM_REPORT_EXPORTED: 'EscmReportExported',
  ESCM_CUSTOM_REPORT_CREATED: 'EscmCustomReportCreated',
  ESCM_ANALYTICS_ACCESSED: 'EscmAnalyticsAccessed',
  EFM_COA_VERSION_CREATED: 'EfmCoaVersionCreated',
  EFM_COA_VERSION_ACTIVATED: 'EfmCoaVersionActivated',
  EFM_ACCOUNT_UPDATED: 'EfmAccountUpdated',
  EFM_PARAMETER_UPDATED: 'EfmParameterUpdated',
  EFM_RULE_UPDATED: 'EfmRuleUpdated',
  EFM_JOURNAL_CREATED: 'EfmJournalCreated',
  EFM_JOURNAL_POSTED: 'EfmJournalPosted',
  EFM_VOUCHER_CREATED: 'EfmVoucherCreated',
  EFM_VOUCHER_APPROVED: 'EfmVoucherApproved',
  EFM_VOUCHER_REJECTED: 'EfmVoucherRejected',
  EFM_VOUCHER_VOIDED: 'EfmVoucherVoided',
  EFM_VOUCHER_REVERSED: 'EfmVoucherReversed',
  EFM_AP_INVOICE_REGISTERED: 'EfmApInvoiceRegistered',
  EFM_AP_INVOICE_POSTED: 'EfmApInvoicePosted',
  EFM_AP_PAYMENT_CREATED: 'EfmApPaymentCreated',
  EFM_AP_PAYMENT_APPROVED: 'EfmApPaymentApproved',
  EFM_AP_PAYMENT_REJECTED: 'EfmApPaymentRejected',
  EFM_AP_PAYMENT_PROCESSED: 'EfmApPaymentProcessed',
  EFM_TR_MOVEMENT_CREATED: 'EfmTrMovementCreated',
  EFM_TR_MOVEMENT_PROCESSED: 'EfmTrMovementProcessed',
  EFM_TR_RECONCILIATION_COMPLETED: 'EfmTrReconciliationCompleted',
  EFM_FA_ASSET_REGISTERED: 'EfmFaAssetRegistered',
  EFM_FA_ASSET_ACTIVATED: 'EfmFaAssetActivated',
  EFM_FA_DEPRECIATION_POSTED: 'EfmFaDepreciationPosted',
  EFM_FA_AMORTIZATION_POSTED: 'EfmFaAmortizationPosted',
  EFM_FA_DISPOSAL_POSTED: 'EfmFaDisposalPosted',
  EFM_FA_REVALUATION_POSTED: 'EfmFaRevaluationPosted',
  EFM_FA_TRANSFER_COMPLETED: 'EfmFaTransferCompleted',
  EFM_FA_MAINTENANCE_RECORDED: 'EfmFaMaintenanceRecorded',
  EFM_FA_PHYSICAL_INVENTORY_COMPLETED: 'EfmFaPhysicalInventoryCompleted',
  EFM_BG_BUDGET_CREATED: 'EfmBgBudgetCreated',
  EFM_BG_BUDGET_APPROVED: 'EfmBgBudgetApproved',
  EFM_BG_VERSION_CREATED: 'EfmBgVersionCreated',
  EFM_BG_COMMITMENT_CREATED: 'EfmBgCommitmentCreated',
  EFM_BG_EXECUTION_RECORDED: 'EfmBgExecutionRecorded',
  EFM_BG_TRANSFER_COMPLETED: 'EfmBgTransferCompleted',
  EFM_BG_EXCEPTION_REQUESTED: 'EfmBgExceptionRequested',
  EFM_BG_EXCEPTION_APPROVED: 'EfmBgExceptionApproved',
  EFM_BG_VALIDATION_BLOCKED: 'EfmBgValidationBlocked',
  EFM_FO_STATEMENT_GENERATED: 'EfmFoStatementGenerated',
  EFM_FO_CLOSING_COMPLETED: 'EfmFoClosingCompleted',
  EFM_FO_PERIOD_REOPENED: 'EfmFoPeriodReopened',
  EFM_FO_REPORT_GENERATED: 'EfmFoReportGenerated',
  EFM_FO_REPORT_EXPORTED: 'EfmFoReportExported',
  EFM_FO_KPI_CALCULATED: 'EfmFoKpiCalculated',
  EFM_FO_AI_INSIGHT_GENERATED: 'EfmFoAiInsightGenerated',
  HCM_EMPLOYEE_HIRED: 'HcmEmployeeHired',
  HCM_EMPLOYEE_UPDATED: 'HcmEmployeeUpdated',
  HCM_EMPLOYEE_TRANSFERRED: 'HcmEmployeeTransferred',
  HCM_EMPLOYEE_TERMINATED: 'HcmEmployeeTerminated',
  HCM_CONTRACT_CREATED: 'HcmContractCreated',
  HCM_CONTRACT_RENEWED: 'HcmContractRenewed',
  HCM_CONTRACT_TERMINATED: 'HcmContractTerminated',
  HCM_DOCUMENT_UPLOADED: 'HcmDocumentUploaded',
  HCM_ORG_STRUCTURE_UPDATED: 'HcmOrgStructureUpdated',
  HCM_RC_VACANCY_CREATED: 'HcmRcVacancyCreated',
  HCM_RC_VACANCY_APPROVED: 'HcmRcVacancyApproved',
  HCM_RC_VACANCY_PUBLISHED: 'HcmRcVacancyPublished',
  HCM_RC_VACANCY_STATUS_CHANGED: 'HcmRcVacancyStatusChanged',
  HCM_RC_CANDIDATE_CREATED: 'HcmRcCandidateCreated',
  HCM_RC_APPLICATION_CREATED: 'HcmRcApplicationCreated',
  HCM_RC_INTERVIEW_SCHEDULED: 'HcmRcInterviewScheduled',
  HCM_RC_INTERVIEW_COMPLETED: 'HcmRcInterviewCompleted',
  HCM_RC_ASSESSMENT_RECORDED: 'HcmRcAssessmentRecorded',
  HCM_RC_EVALUATION_RECORDED: 'HcmRcEvaluationRecorded',
  HCM_RC_RANKING_COMPUTED: 'HcmRcRankingComputed',
  HCM_RC_OFFER_CREATED: 'HcmRcOfferCreated',
  HCM_RC_OFFER_SENT: 'HcmRcOfferSent',
  HCM_RC_OFFER_SIGNED: 'HcmRcOfferSigned',
  HCM_RC_OFFER_ACCEPTED: 'HcmRcOfferAccepted',
  HCM_RC_ONBOARDING_STARTED: 'HcmRcOnboardingStarted',
  HCM_RC_ONBOARDING_COMPLETED: 'HcmRcOnboardingCompleted',
  HCM_TA_SHIFT_CREATED: 'HcmTaShiftCreated',
  HCM_TA_SHIFT_ASSIGNED: 'HcmTaShiftAssigned',
  HCM_TA_SHIFT_SWAP_REQUESTED: 'HcmTaShiftSwapRequested',
  HCM_TA_SHIFT_SWAP_DECIDED: 'HcmTaShiftSwapDecided',
  HCM_TA_PUNCH_RECORDED: 'HcmTaPunchRecorded',
  HCM_TA_CORRECTION_REQUESTED: 'HcmTaCorrectionRequested',
  HCM_TA_CORRECTION_DECIDED: 'HcmTaCorrectionDecided',
  HCM_TA_NOVELTY_CREATED: 'HcmTaNoveltyCreated',
  HCM_TA_NOVELTY_DECIDED: 'HcmTaNoveltyDecided',
  HCM_TA_OFFLINE_SYNCED: 'HcmTaOfflineSynced',
  HCM_PY_RUN_CREATED: 'HcmPyRunCreated',
  HCM_PY_RUN_CALCULATED: 'HcmPyRunCalculated',
  HCM_PY_RUN_APPROVED: 'HcmPyRunApproved',
  HCM_PY_RUN_PAID: 'HcmPyRunPaid',
  HCM_PY_RUN_REPROCESSED: 'HcmPyRunReprocessed',
  HCM_PY_SETTLEMENT_CALCULATED: 'HcmPySettlementCalculated',
  HCM_PY_DOCUMENT_GENERATED: 'HcmPyDocumentGenerated',
  HCM_PY_VACATION_REQUESTED: 'HcmPyVacationRequested',
  HCM_TD_COURSE_CREATED: 'HcmTdCourseCreated',
  HCM_TD_ENROLLMENT_CREATED: 'HcmTdEnrollmentCreated',
  HCM_TD_CERTIFICATION_CREATED: 'HcmTdCertificationCreated',
  HCM_TD_CERTIFICATION_RENEWED: 'HcmTdCertificationRenewed',
  HCM_TD_COMPETENCY_ASSESSED: 'HcmTdCompetencyAssessed',
  HCM_TD_EVALUATION_CREATED: 'HcmTdEvaluationCreated',
  HCM_TD_EVALUATION_COMPLETED: 'HcmTdEvaluationCompleted',
  HCM_TD_OBJECTIVE_CREATED: 'HcmTdObjectiveCreated',
  HCM_TD_CAREER_PLAN_CREATED: 'HcmTdCareerPlanCreated',
  HCM_SS_EXAM_SCHEDULED: 'HcmSsExamScheduled',
  HCM_SS_EXAM_COMPLETED: 'HcmSsExamCompleted',
  HCM_SS_RISK_CREATED: 'HcmSsRiskCreated',
  HCM_SS_RISK_ASSESSED: 'HcmSsRiskAssessed',
  HCM_SS_MITIGATION_CREATED: 'HcmSsMitigationCreated',
  HCM_SS_PPE_DELIVERED: 'HcmSsPpeDelivered',
  HCM_SS_OFFLINE_SYNCED: 'HcmSsOfflineSynced',
  HCM_SS_INCIDENT_REPORTED: 'HcmSsIncidentReported',
  HCM_SS_INCIDENT_INVESTIGATED: 'HcmSsIncidentInvestigated',
  HCM_SS_EVIDENCE_UPLOADED: 'HcmSsEvidenceUploaded',
  HCM_SS_INSPECTION_CREATED: 'HcmSsInspectionCreated',
  HCM_SS_INSPECTION_COMPLETED: 'HcmSsInspectionCompleted',
  HCM_SS_WELLBEING_CREATED: 'HcmSsWellbeingCreated',
  HCM_SS_EMERGENCY_PLAN_CREATED: 'HcmSsEmergencyPlanCreated',
  HEP_PORTAL_LOGIN: 'HepPortalLogin',
  HEP_PROFILE_UPDATED: 'HepProfileUpdated',
  HEP_DASHBOARD_VIEWED: 'HepDashboardViewed',
  HEP_REQUEST_SUBMITTED: 'HepRequestSubmitted',
  HEP_REQUEST_CANCELLED: 'HepRequestCancelled',
  HEP_REQUEST_DECIDED: 'HepRequestDecided',
  HEP_ATTACHMENT_ADDED: 'HepAttachmentAdded',
  HEP_CERTIFICATE_GENERATED: 'HepCertificateGenerated',
  HEP_PAYSLIP_VIEWED: 'HepPayslipViewed',
  HEP_PAYSLIP_DOWNLOADED: 'HepPayslipDownloaded',
  HEP_DOCUMENT_DOWNLOADED: 'HepDocumentDownloaded',
  HED_DASHBOARD_VIEWED: 'HedDashboardViewed',
  HED_DASHBOARD_EXPORTED: 'HedDashboardExported',
  HPA_PERSONAL_DASHBOARD_VIEWED: 'HpaPersonalDashboardViewed',
  HPA_ANALYTICS_VIEWED: 'HpaAnalyticsViewed',
  HPA_NOTIFICATIONS_REFRESHED: 'HpaNotificationsRefreshed',
  HPA_AI_INSIGHT_REQUESTED: 'HpaAiInsightRequested',

  EMFG_MASTER_PLAN_CREATED: 'EmfgMasterPlanCreated',
  EMFG_MASTER_PLAN_ACTIVATED: 'EmfgMasterPlanActivated',
  EMFG_ORDERS_GENERATED: 'EmfgOrdersGenerated',
  EMFG_BOM_CREATED: 'EmfgBomCreated',
  EMFG_ROUTING_CREATED: 'EmfgRoutingCreated',
  EMFG_ORDER_CREATED: 'EmfgOrderCreated',
  EMFG_ORDER_STATUS_CHANGED: 'EmfgOrderStatusChanged',
  EMFG_ORDER_RELEASED: 'EmfgOrderReleased',
  EMFG_ORDER_PROGRESS_RECORDED: 'EmfgOrderProgressRecorded',
  EMFG_ORDER_RESCHEDULED: 'EmfgOrderRescheduled',
  EMFG_SCHEDULE_CREATED: 'EmfgScheduleCreated',
  EMFG_SCHEDULE_AUTO: 'EmfgScheduleAuto',
  EMFG_INVENTORY_ISSUE_REQUESTED: 'EmfgInventoryIssueRequested',
  EMFG_INVENTORY_RECEIPT_REQUESTED: 'EmfgInventoryReceiptRequested',
  EMFG_SALES_LINK_UPDATED: 'EmfgSalesLinkUpdated',
  EMFG_WORKFLOW_STARTED: 'EmfgWorkflowStarted',
  EMFG_ACCOUNTING_ENTRY_REQUESTED: 'EmfgAccountingEntryRequested',
  EMFG_DASHBOARD_REFRESH: 'EmfgDashboardRefresh',
  EMFG_MES_ORDER_STARTED: 'EmfgMesOrderStarted',
  EMFG_MES_ORDER_FINISHED: 'EmfgMesOrderFinished',
  EMFG_MES_MATERIAL_CONSUMED: 'EmfgMesMaterialConsumed',
  EMFG_MES_PRODUCTION_RECORDED: 'EmfgMesProductionRecorded',
  EMFG_MES_OPERATION_STARTED: 'EmfgMesOperationStarted',
  EMFG_MES_OPERATION_FINISHED: 'EmfgMesOperationFinished',
  EMFG_MES_OFFLINE_SYNCED: 'EmfgMesOfflineSynced',
  EMFG_QMS_INSPECTION_CREATED: 'EmfgQmsInspectionCreated',
  EMFG_QMS_INSPECTION_COMPLETED: 'EmfgQmsInspectionCompleted',
  EMFG_QMS_NC_CREATED: 'EmfgQmsNcCreated',
  EMFG_QMS_NC_CLOSED: 'EmfgQmsNcClosed',
  EMFG_QMS_CAPA_CREATED: 'EmfgQmsCapaCreated',
  EMFG_QMS_CAPA_VERIFIED: 'EmfgQmsCapaVerified',
  EMFG_QMS_LOT_RELEASED: 'EmfgQmsLotReleased',
  EMFG_QMS_LOT_REJECTED: 'EmfgQmsLotRejected',
  EMFG_QMS_LOT_HELD: 'EmfgQmsLotHeld',
  EMFG_QMS_DASHBOARD_REFRESH: 'EmfgQmsDashboardRefresh',
  EMFG_RES_EQUIPMENT_CREATED: 'EmfgResEquipmentCreated',
  EMFG_RES_AVAILABILITY_CHANGED: 'EmfgResAvailabilityChanged',
  EMFG_RES_MAINTENANCE_RECORDED: 'EmfgResMaintenanceRecorded',
  EMFG_RES_DOWNTIME_RECORDED: 'EmfgResDowntimeRecorded',
  EMFG_RES_CAPACITY_COMPUTED: 'EmfgResCapacityComputed',
  EMFG_RES_OFFLINE_SYNCED: 'EmfgResOfflineSynced',
  EMFG_COST_STANDARD_CREATED: 'EmfgCostStandardCreated',
  EMFG_COST_CALCULATED: 'EmfgCostCalculated',
  EMFG_COST_WIP_UPDATED: 'EmfgCostWipUpdated',
  EMFG_COST_WIP_CLOSED: 'EmfgCostWipClosed',
  EMFG_COST_VARIANCE_COMPUTED: 'EmfgCostVarianceComputed',
  EMFG_COST_DASHBOARD_REFRESH: 'EmfgCostDashboardRefresh',
  EMFG_INTELLIGENCE_AGGREGATED: 'EmfgIntelligenceAggregated',
  EMFG_INTELLIGENCE_OEE_COMPUTED: 'EmfgIntelligenceOeeComputed',
  EMFG_INTELLIGENCE_SIMULATION_RUN: 'EmfgIntelligenceSimulationRun',
  EMFG_INTELLIGENCE_EXPORTED: 'EmfgIntelligenceExported',
  EMFG_INTELLIGENCE_DASHBOARD_REFRESH: 'EmfgIntelligenceDashboardRefresh',
  EMFG_INTELLIGENCE_ALERT_RAISED: 'EmfgIntelligenceAlertRaised',
  EMFG_INTELLIGENCE_AI_REQUESTED: 'EmfgIntelligenceAiRequested',
  EPSCM_FORECAST_COMPUTED: 'EpscmForecastComputed',
  EPSCM_REPLENISHMENT_PROPOSED: 'EpscmReplenishmentProposed',
  EPSCM_SUPPLY_PLAN_ACTIVATED: 'EpscmSupplyPlanActivated',
  EPSCM_ALERT_RAISED: 'EpscmAlertRaised',
  EPSCM_INVENTORY_CLASSIFIED: 'EpscmInventoryClassified',
  EPSCM_DASHBOARD_REFRESH: 'EpscmDashboardRefresh',
  EPSCM_WMS_PICK_COMPLETED: 'EpscmWmsPickCompleted',
  EPSCM_WMS_PACK_COMPLETED: 'EpscmWmsPackCompleted',
  EPSCM_WMS_DISPATCH_CONFIRMED: 'EpscmWmsDispatchConfirmed',
  EPSCM_WMS_RECEIPT_CONFIRMED: 'EpscmWmsReceiptConfirmed',
  EPSCM_WMS_TRANSFER_COMPLETED: 'EpscmWmsTransferCompleted',
  EPSCM_WMS_TRANSFER_APPROVAL_REQUESTED: 'EpscmWmsTransferApprovalRequested',
  EPSCM_WMS_CROSSDOCK_ASSIGNED: 'EpscmWmsCrossDockAssigned',
  EPSCM_WMS_DASHBOARD_REFRESH: 'EpscmWmsDashboardRefresh',
  EPSCM_WMS_OFFLINE_SYNCED: 'EpscmWmsOfflineSynced',
  EPSCM_TMS_TRIP_SCHEDULED: 'EpscmTmsTripScheduled',
  EPSCM_TMS_TRIP_STARTED: 'EpscmTmsTripStarted',
  EPSCM_TMS_TRIP_CLOSED: 'EpscmTmsTripClosed',
  EPSCM_TMS_ROUTE_OPTIMIZED: 'EpscmTmsRouteOptimized',
  EPSCM_TMS_DELIVERY_COMPLETED: 'EpscmTmsDeliveryCompleted',
  EPSCM_TMS_POD_CAPTURED: 'EpscmTmsPodCaptured',
  EPSCM_TMS_INCIDENT_RECORDED: 'EpscmTmsIncidentRecorded',
  EPSCM_TMS_COST_POSTED: 'EpscmTmsCostPosted',
  EPSCM_TMS_DASHBOARD_REFRESH: 'EpscmTmsDashboardRefresh',
  EPSCM_TMS_OFFLINE_SYNCED: 'EpscmTmsOfflineSynced',
  EPSCM_TMS_TELEMETRY_SLOT_READY: 'EpscmTmsTelemetrySlotReady',
  EPSCM_COLLAB_ORDER_CONFIRMED: 'EpscmCollabOrderConfirmed',
  EPSCM_COLLAB_DELIVERY_UPDATED: 'EpscmCollabDeliveryUpdated',
  EPSCM_COLLAB_DOCUMENT_UPLOADED: 'EpscmCollabDocumentUploaded',
  EPSCM_COLLAB_SLA_BREACH: 'EpscmCollabSlaBreach',
  EPSCM_COLLAB_TASK_COMPLETED: 'EpscmCollabTaskCompleted',
  EPSCM_COLLAB_SIMULATION_COMPLETED: 'EpscmCollabSimulationCompleted',
  EPSCM_COLLAB_DASHBOARD_REFRESH: 'EpscmCollabDashboardRefresh',
  EPSCM_COLLAB_OFFLINE_SYNCED: 'EpscmCollabOfflineSynced',
  EPSCM_COLLAB_AI_SLOT_READY: 'EpscmCollabAiSlotReady',
  EPSCM_COLLAB_NOTIFICATION_SENT: 'EpscmCollabNotificationSent',

  EAM_ASSET_REGISTERED: 'EamAssetRegistered',
  EAM_ASSET_UPDATED: 'EamAssetUpdated',
  EAM_LIFECYCLE_EVENT: 'EamLifecycleEvent',
  EAM_ASSET_TRANSFERRED: 'EamAssetTransferred',
  EAM_ASSET_LOANED: 'EamAssetLoaned',
  EAM_ASSET_RETIRED: 'EamAssetRetired',
  EAM_DOCUMENT_UPLOADED: 'EamDocumentUploaded',
  EAM_DASHBOARD_REFRESH: 'EamDashboardRefresh',
  EAM_OFFLINE_SYNCED: 'EamOfflineSynced',

  EAM_WORK_ORDER_CREATED: 'EamWorkOrderCreated',
  EAM_WORK_ORDER_APPROVED: 'EamWorkOrderApproved',
  EAM_WORK_ORDER_STARTED: 'EamWorkOrderStarted',
  EAM_WORK_ORDER_COMPLETED: 'EamWorkOrderCompleted',
  EAM_WORK_ORDER_CLOSED: 'EamWorkOrderClosed',
  EAM_SPARE_PART_CONSUMED: 'EamSparePartConsumed',
  EAM_INCIDENT_REPORTED: 'EamIncidentReported',
  EAM_SLA_BREACH: 'EamSlaBreach',
  EAM_CMMS_DASHBOARD_REFRESH: 'EamCmmsDashboardRefresh',
  EAM_CMMS_OFFLINE_SYNCED: 'EamCmmsOfflineSynced',
  EAM_CONDITION_READING: 'EamConditionReading',
  EAM_RELIABILITY_COMPUTED: 'EamReliabilityComputed',
  EAM_ENERGY_RECORDED: 'EamEnergyRecorded',
  EAM_ALERT_RAISED: 'EamAlertRaised',
  EAM_SIMULATION_RUN: 'EamSimulationRun',
  EAM_IOT_EVENT_QUEUED: 'EamIotEventQueued',
  EAM_PREDICTIVE_SLOT_READY: 'EamPredictiveSlotReady',
  EAM_DIGITAL_TWIN_SYNC: 'EamDigitalTwinSync',
  EAM_RELIABILITY_DASHBOARD_REFRESH: 'EamReliabilityDashboardRefresh',
  EAM_RELIABILITY_OFFLINE_SYNCED: 'EamReliabilityOfflineSynced',
  EAM_SUGGESTED_WORK_ORDER: 'EamSuggestedWorkOrder',
  BPMS_PROCESS_PUBLISHED: 'BpmsProcessPublished',
  BPMS_INSTANCE_STARTED: 'BpmsInstanceStarted',
  BPMS_INSTANCE_COMPLETED: 'BpmsInstanceCompleted',
  BPMS_TASK_ASSIGNED: 'BpmsTaskAssigned',
  BPMS_TASK_APPROVED: 'BpmsTaskApproved',
  BPMS_TASK_REJECTED: 'BpmsTaskRejected',
  BPMS_AUTOMATION_TRIGGERED: 'BpmsAutomationTriggered',
  BPMS_DASHBOARD_REFRESH: 'BpmsDashboardRefresh',
  BPMS_OFFLINE_SYNCED: 'BpmsOfflineSynced',
  BPMS_WEBHOOK_INVOKED: 'BpmsWebhookInvoked',
  EIP_EVENT_PUBLISHED: 'EipEventPublished',
  EIP_BRIDGE_INVOKED: 'EipBridgeInvoked',
  EIP_PLATFORM_BOOTSTRAPPED: 'EipPlatformBootstrapped',
  EIP_WEBHOOK_DELIVERED: 'EipWebhookDelivered',
  EIP_ESB_ROUTED: 'EipEsbRouted',
  EIP_DLQ_MESSAGE: 'EipDlqMessage',
  EIP_OFFLINE_SYNCED: 'EipOfflineSynced',
  EINT_PLATFORM_BOOTSTRAPPED: 'EintPlatformBootstrapped',
  EINT_AI_INVOKED: 'EintAiInvoked',
  EINT_REPORT_GENERATED: 'EintReportGenerated',
  EINT_ETL_COMPLETED: 'EintEtlCompleted',
  EINT_DASHBOARD_VIEWED: 'EintDashboardViewed',
  EINT_NOTIFICATION_SENT: 'EintNotificationSent',
  EINT_MODULE_ANALYTICS: 'EintModuleAnalytics',
  EOPS_PLATFORM_BOOTSTRAPPED: 'EopsPlatformBootstrapped',
  EOPS_CONFIG_CHANGED: 'EopsConfigChanged',
  EOPS_BACKUP_COMPLETED: 'EopsBackupCompleted',
  EOPS_RESTORE_COMPLETED: 'EopsRestoreCompleted',
  EOPS_DEPLOYMENT_COMPLETED: 'EopsDeploymentCompleted',
  EOPS_SECURITY_ALERT: 'EopsSecurityAlert',
  EOPS_MAINTENANCE_TOGGLED: 'EopsMaintenanceToggled',
  EOPS_MODULE_EVENT: 'EopsModuleEvent',
  EATP_PLATFORM_BOOTSTRAPPED: 'EatpPlatformBootstrapped',
  EATP_LABOR_RECORDED: 'EatpLaborRecorded',
  EATP_CAMPAIGN_CREATED: 'EatpCampaignCreated',
  EATP_MODULE_EVENT: 'EatpModuleEvent',
  EAPP_PLATFORM_BOOTSTRAPPED: 'EappPlatformBootstrapped',
  EAPP_FLIGHT_REGISTERED: 'EappFlightRegistered',
  EAPP_TELEMETRY_INGESTED: 'EappTelemetryIngested',
  EAPP_INSPECTION_RECORDED: 'EappInspectionRecorded',
  EAPP_MODULE_EVENT: 'EappModuleEvent',
  EIWP_PLATFORM_BOOTSTRAPPED: 'EiwpPlatformBootstrapped',
  EIWP_IRRIGATION_COMPLETED: 'EiwpIrrigationCompleted',
  EIWP_ALERT_GENERATED: 'EiwpAlertGenerated',
  EIWP_BALANCE_COMPUTED: 'EiwpBalanceComputed',
  EIWP_MODULE_EVENT: 'EiwpModuleEvent',
  EPHP_PLATFORM_BOOTSTRAPPED: 'EphpPlatformBootstrapped',
  EPHP_APPLICATION_RECORDED: 'EphpApplicationRecorded',
  EPHP_ALERT_GENERATED: 'EphpAlertGenerated',
  EPHP_MRL_VIOLATION: 'EphpMrlViolation',
  EPHP_MODULE_EVENT: 'EphpModuleEvent',
  EATR_PLATFORM_BOOTSTRAPPED: 'EatrPlatformBootstrapped',
  EATR_HARVEST_RECORDED: 'EatrHarvestRecorded',
  EATR_CUSTODY_TRANSFERRED: 'EatrCustodyTransferred',
  EATR_TRACE_QUERIED: 'EatrTraceQueried',
  EATR_MODULE_EVENT: 'EatrModuleEvent',
  EACC_PLATFORM_BOOTSTRAPPED: 'EaccPlatformBootstrapped',
  EACC_CERTIFICATION_ISSUED: 'EaccCertificationIssued',
  EACC_INSPECTION_RECORDED: 'EaccInspectionRecorded',
  EACC_COMPLIANCE_VIOLATION: 'EaccComplianceViolation',
  EACC_MODULE_EVENT: 'EaccModuleEvent',
  EFFM_PLATFORM_BOOTSTRAPPED: 'EffmPlatformBootstrapped',
  EFFM_OPERATION_COMPLETED: 'EffmOperationCompleted',
  EFFM_FUEL_RECORDED: 'EffmFuelRecorded',
  EFFM_TELEMETRY_RECEIVED: 'EffmTelemetryReceived',
  EFFM_MODULE_EVENT: 'EffmModuleEvent',
  EAIP_PLATFORM_BOOTSTRAPPED: 'EaipPlatformBootstrapped',
  EAIP_PREDICTION_EXECUTED: 'EaipPredictionExecuted',
  EAIP_RECOMMENDATION_GENERATED: 'EaipRecommendationGenerated',
  EAIP_SIMULATION_RUN: 'EaipSimulationRun',
  EAIP_MODULE_EVENT: 'EaipModuleEvent',
  EACE_PLATFORM_BOOTSTRAPPED: 'EacePlatformBootstrapped',
  EACE_CONTRACT_SIGNED: 'EaceContractSigned',
  EACE_VISIT_RECORDED: 'EaceVisitRecorded',
  EACE_COLLABORATION_EVENT: 'EaceCollaborationEvent',
  EACE_MODULE_EVENT: 'EaceModuleEvent',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const AGGREGATE_TYPES = {
  USER: 'User',
  RESOURCE: 'Resource',
  FILE: 'File',
  ORGANIZATION: 'Organization',
  FORM: 'Form',
  FORM_SUBMISSION: 'FormSubmission',
  SESSION: 'Session',
  POLICY: 'Policy',
  ROLE: 'Role',
  GROUP: 'Group',
  ORG_UNIT: 'OrgUnit',
  SERVICE_ACCOUNT: 'ServiceAccount',
  WORKFLOW: 'Workflow',
  WORKFLOW_INSTANCE: 'WorkflowInstance',
  NOTIFICATION: 'Notification',
  NOTIFICATION_RULE: 'NotificationRule',
  PRODUCER: 'Producer',
  PRODUCER_SEGMENT: 'ProducerSegment',
  FARM_UNIT: 'FarmUnit',
  FARM_LOT: 'FarmLot',
  FIELD_LOT: 'FieldLotProfile',
  FIELD_OPERATION: 'FieldOperation',
  GIS_LAYER: 'GisLayer',
  GIS_GEOFENCE: 'GisGeofence',
  GIS_ROUTE_PLAN: 'GisRoutePlan',
  GIS_ANALYSIS_JOB: 'GisTerritoryAnalysisJob',
} as const;

export type AggregateType = (typeof AGGREGATE_TYPES)[keyof typeof AGGREGATE_TYPES];

export const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'integer',
  'decimal',
  'currency',
  'boolean',
  'checkbox',
  'radio',
  'date',
  'time',
  'datetime',
  'select',
  'multi_select',
  'autocomplete',
  'geo',
  'geo_point',
  'geo_track',
  'geo_polygon',
  'map',
  'photo',
  'video',
  'audio',
  'signature',
  'barcode',
  'qrcode',
  'file',
  'pdf',
  'gallery',
  'relation',
  'calculated',
  'hidden',
  'derived',
  'repeat_group',
  'subform',
  'matrix',
  'scale',
  'likert',
  'rating',
  'emoji',
  'heading',
  'separator',
  'html',
  'markdown',
  'hyperlink',
  'button',
  'indicator',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Maps UDFE extended types to validation engine canonical types */
export const UDFE_FIELD_TYPE_ALIASES: Record<string, FormFieldType> = {
  geo_point: 'geo',
  map: 'geo',
  integer: 'number',
  decimal: 'number',
  currency: 'number',
  checkbox: 'boolean',
  radio: 'select',
  autocomplete: 'select',
  qrcode: 'barcode',
  pdf: 'file',
  gallery: 'photo',
  textarea: 'text',
  derived: 'calculated',
  geo_polygon: 'geo_track',
  subform: 'repeat_group',
};

export const UDFE_LAYOUT_FIELD_TYPES = [
  'heading',
  'separator',
  'html',
  'markdown',
  'hyperlink',
  'button',
  'indicator',
  'hidden',
] as const;

export type UdfeLayoutFieldType = (typeof UDFE_LAYOUT_FIELD_TYPES)[number];

export type ConditionalOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'empty'
  | 'not_empty';

export interface ConditionalRule {
  field: string;
  operator: ConditionalOperator;
  value?: unknown;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  requireGps?: boolean;
  maxAccuracyMeters?: number;
}

export interface FormFieldDefinition {
  key: string;
  type: FormFieldType;
  label: string;
  description?: string;
  sectionKey?: string;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  inheritFrom?: string;
  apiSource?: { url: string; valueField: string; labelField: string };
  options?: { value: string; label: string }[];
  validation?: FormFieldValidation;
  visibleWhen?: ConditionalRule | ConditionalRule[];
  requiredWhen?: ConditionalRule | ConditionalRule[];
  readOnlyWhen?: ConditionalRule | ConditionalRule[];
  calculate?: {
    expression: string;
    dependsOn: string[];
  };
  relationTo?: string;
  accept?: string;
  fields?: FormFieldDefinition[];
  matrix?: { rows: string[]; columns: string[] };
  scale?: { min: number; max: number; step?: number };
  likert?: { statements: string[]; options: string[] };
  metadata?: Record<string, unknown>;
  /** UCEM — data origin for low-code binding */
  dataProvider?: import('./ucem').FieldDataProvider;
}

export interface FormSectionDefinition {
  key: string;
  title: string;
  description?: string;
  visibleWhen?: ConditionalRule | ConditionalRule[];
  order?: number;
}

export type FormLayoutNodeType =
  | 'section'
  | 'accordion'
  | 'tabs'
  | 'tab'
  | 'repeat_group'
  | 'matrix'
  | 'field';

export type FormLayoutChild = string | FormLayoutNode;

export interface FormLayoutNodeBase {
  key: string;
  title?: string;
  description?: string;
}

export interface FormLayoutSectionNode extends FormLayoutNodeBase {
  type: 'section' | 'accordion';
  children: FormLayoutChild[];
}

export interface FormLayoutTabNode extends FormLayoutNodeBase {
  type: 'tab';
  children: FormLayoutChild[];
}

export interface FormLayoutTabsNode extends FormLayoutNodeBase {
  type: 'tabs';
  children: FormLayoutTabNode[];
}

export interface FormLayoutRepeatGroupNode extends FormLayoutNodeBase {
  type: 'repeat_group';
  min?: number;
  max?: number;
  children?: FormLayoutChild[];
}

export type FormMatrixResponseType = 'select' | 'radio' | 'number' | 'text' | 'checkbox';

export interface FormLayoutMatrixNode extends FormLayoutNodeBase {
  type: 'matrix';
  rows: string[];
  columns: Array<{ value: string; label: string }>;
  responseType?: FormMatrixResponseType;
}

export interface FormLayoutFieldNode extends FormLayoutNodeBase {
  type: 'field';
}

export type FormLayoutNode =
  | FormLayoutSectionNode
  | FormLayoutTabsNode
  | FormLayoutTabNode
  | FormLayoutRepeatGroupNode
  | FormLayoutMatrixNode
  | FormLayoutFieldNode;

export interface FormWorkflowBinding {
  workflowKey: string;
  initialState?: string;
  states?: string[];
  transitions?: Array<{
    from: string;
    to: string;
    action: string;
    requiredPermissions?: string[];
  }>;
}

export interface FormGeofence {
  center: { lat: number; lng: number };
  radiusMeters: number;
}

export interface FormLocationSettings {
  enabled?: boolean;
  required?: boolean;
  accuracy?: number;
}

export interface FormMediaSettings {
  allowPhotos?: boolean;
  multiplePhotos?: boolean;
  allowFiles?: boolean;
}

export interface FormSettings {
  requireGps?: boolean;
  geofence?: FormGeofence;
  allowDraft?: boolean;
  offlineCapable?: boolean;
  allowOffline?: boolean;
  requiresSync?: boolean;
  layoutMode?: 'flat' | 'tabs' | 'accordion';
  location?: FormLocationSettings;
  media?: FormMediaSettings;
}

export interface FormCatalogRequirement {
  catalogKey: string;
  source?: 'builtin' | 'api' | 'remote' | string;
  offline?: boolean;
}

export interface FormDefinitionSchema {
  version: number;
  fields: FormFieldDefinition[];
  sections?: FormSectionDefinition[];
  layout?: FormLayoutNode[];
  /** UCEM — reusable named data providers */
  dataProviders?: Record<string, import('./ucem').FieldDataProvider>;
  /** UCEM — catalog definitions bound to this form */
  universalCatalogs?: import('./ucem').UniversalCatalogDefinition[];
  settings?: FormSettings;
  workflow?: FormWorkflowBinding;
  aiReadiness?: Record<string, string>;
}

export const FORM_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived',
} as const;

export type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS];

export const FORM_SUBMISSION_RESOURCE_TYPE = 'form_submission';

/** Capture Processing Engine — routes submissions to ERP actions via form.metadata.processingType */
export const CAPTURE_PROCESSING_TYPES = {
  PRODUCER_CREATE: 'PRODUCER_CREATE',
  FARM_CREATE: 'FARM_CREATE',
  PRODUCTION_CREATE: 'PRODUCTION_CREATE',
} as const;

export type CaptureProcessingType =
  (typeof CAPTURE_PROCESSING_TYPES)[keyof typeof CAPTURE_PROCESSING_TYPES];

export interface FormCaptureMetadata {
  processingType?: CaptureProcessingType | string;
  requiredCatalogKeys?: string[];
  catalogRequirements?: FormCatalogRequirement[];
  /** UCEM — complements processingType; maps form fields → ERP entity */
  entityMapping?: import('./ucem').FormEntityMapping;
}

/** Capture Analytics — semantic event types for EBIAP BI ingestion */
export const CAPTURE_ANALYTICS_EVENT_TYPES = {
  PRODUCER_CREATED: 'PRODUCER_CREATED',
  FARM_CREATED: 'FARM_CREATED',
  PRODUCTION_REGISTERED: 'PRODUCTION_REGISTERED',
  FORM_COMPLETED: 'FORM_COMPLETED',
} as const;

export type CaptureAnalyticsEventType =
  (typeof CAPTURE_ANALYTICS_EVENT_TYPES)[keyof typeof CAPTURE_ANALYTICS_EVENT_TYPES];

export const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'geo',
  'file',
  'relation',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldDefinition {
  key: string;
  type: FieldType;
  label: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  };
  relationTo?: string;
  catalogId?: string;
}

export interface ResourceSchemaDefinition {
  resourceType: string;
  version: number;
  label?: string;
  fields: FieldDefinition[];
  states?: string[];
}

export interface EventMetadata {
  userId?: string;
  deviceId?: string;
  correlationId: string;
  causationId?: string;
  source: 'web' | 'android' | 'api' | 'system';
  ipAddress?: string;
  userAgent?: string;
}

export interface DomainEventPayload {
  [key: string]: unknown;
}

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  userType?: string;
  jti?: string;
}

export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'reject',
  'sign',
  'export',
  'import',
  'audit',
  'admin',
  'sync',
  'publish',
  'submit',
  'push',
  'lifecycle',
  'assign',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_RESOURCES = [
  'user',
  'role',
  'group',
  'policy',
  'session',
  'organization',
  'org_unit',
  'resource',
  'metadata',
  'masterdata',
  'form',
  'event',
  'audit',
  'sync',
  'producer',
  'farm',
  'lot',
  'field_operation',
  'lot_cost',
  'contract',
  'purchase',
  'inventory',
  'quality',
  'gis',
  'report',
  'finance',
  'ai',
  'service_account',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const SCOPE_TYPES = [
  'org',
  'org_unit',
  'branch',
  'region',
  'farm',
  'municipality',
  'module',
  'form',
  'resource',
  'device',
  'own',
] as const;

export type ScopeType = (typeof SCOPE_TYPES)[number];

export interface AccessContext {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  userType?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  scope?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/** Port for RBAC + PBAC authorization (implemented by Identity Engine). */
export abstract class AuthorizationService {
  abstract authorize(context: AccessContext, required: string[]): Promise<boolean>;
}

export interface PolicyCondition {
  type: string;
  operator?: string;
  field?: string;
  value?: unknown;
}

export interface PolicyDefinition {
  effect: 'allow' | 'deny';
  resource?: string;
  action?: string;
  subject?: {
    roles?: string[];
    groups?: string[];
    userTypes?: string[];
    userIds?: string[];
  };
  conditions?: PolicyCondition[] | { all?: PolicyCondition[]; any?: PolicyCondition[] };
}

export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
} as const;

// ─── Workflow Engine types ───────────────────────────────────────────────────

export const WORKFLOW_STATE_TYPES = [
  'initial',
  'intermediate',
  'final',
  'cancelled',
] as const;

export const WORKFLOW_GATEWAY_TYPES = [
  'none',
  'exclusive',
  'parallel',
  'inclusive',
] as const;

export type WorkflowGatewayType = (typeof WORKFLOW_GATEWAY_TYPES)[number];

export type WorkflowStateType = (typeof WORKFLOW_STATE_TYPES)[number];

export const WORKFLOW_ACTION_TYPES = [
  'emit_event',
  'update_resource',
  'create_task',
  'send_notification',
  'webhook',
  'generate_pdf',
  'call_api',
  'run_ai',
  'create_audit',
] as const;

export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export const WORKFLOW_PARTICIPANT_TYPES = [
  'user',
  'role',
  'group',
  'department',
  'team',
  'org_unit',
  'region',
  'branch',
  'dynamic',
] as const;

export type WorkflowParticipantType = (typeof WORKFLOW_PARTICIPANT_TYPES)[number];

export interface WorkflowParticipantDefinition {
  type: WorkflowParticipantType;
  ref?: string;
  dynamic?: string;
}

export interface WorkflowStateForms {
  required?: string[];
  optional?: string[];
  requireSignature?: boolean;
  requireGps?: boolean;
  requirePhoto?: boolean;
  requireVideo?: boolean;
}

export interface WorkflowStateDefinition {
  key: string;
  name: string;
  type: WorkflowStateType;
  metadata?: Record<string, unknown>;
  forms?: WorkflowStateForms;
  slaHours?: number;
  gatewayType?: WorkflowGatewayType;
  subprocessKey?: string;
}

export interface WorkflowTransitionRequirements {
  documents?: boolean;
  signature?: boolean;
  gps?: boolean;
  comment?: boolean;
}

export interface WorkflowNotificationDefinition {
  channel: 'internal' | 'email' | 'push' | 'sms' | 'whatsapp' | 'webhook';
  template?: string;
  recipients?: WorkflowParticipantDefinition[];
  subject?: string;
}

export interface WorkflowActionDefinition {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowTransitionDefinition {
  key: string;
  name: string;
  from: string;
  to: string;
  participants?: WorkflowParticipantDefinition[];
  permissions?: string[];
  conditions?: WorkflowRuleGroup;
  validations?: WorkflowRuleGroup;
  requirements?: WorkflowTransitionRequirements;
  dueInHours?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actions?: WorkflowActionDefinition[];
  notifications?: WorkflowNotificationDefinition[];
}

export interface WorkflowRuleGroup {
  all?: WorkflowRuleNode[];
  any?: WorkflowRuleNode[];
  if?: WorkflowRuleNode;
  then?: WorkflowRuleNode | WorkflowRuleNode[];
  else?: WorkflowRuleNode | WorkflowRuleNode[];
}

export type WorkflowRuleNode =
  | WorkflowRuleGroup
  | WorkflowRuleCondition
  | { type: 'event'; eventType: string; withinHours?: number };

export interface WorkflowRuleCondition {
  type: 'condition';
  field: string;
  operator: ConditionalOperator | 'contains' | 'matches';
  value?: unknown;
}

export interface WorkflowRuleDefinition {
  key: string;
  name: string;
  scope: 'global' | 'transition' | 'state';
  scopeRef?: string;
  rule: WorkflowRuleGroup;
}

export interface WorkflowDefinitionSchema {
  version: number;
  settings?: {
    defaultSlaHours?: number;
    allowParallelAssignments?: boolean;
    autoArchiveDays?: number;
    processCategory?: string;
    aiReadiness?: Record<string, boolean>;
  };
  states: WorkflowStateDefinition[];
  transitions: WorkflowTransitionDefinition[];
  rules?: WorkflowRuleDefinition[];
}

// ─── ENEAC types ─────────────────────────────────────────────────────────────

export const NOTIFICATION_ALERT_SEVERITIES = [
  'info',
  'warning',
  'critical',
  'emergency',
  'operational',
  'financial',
  'logistics',
  'quality',
  'security',
  'geographic',
] as const;

export type NotificationAlertSeverity = (typeof NOTIFICATION_ALERT_SEVERITIES)[number];

export const NOTIFICATION_CHANNELS = [
  'internal',
  'push',
  'email',
  'sms',
  'whatsapp',
  'telegram',
  'teams',
  'slack',
  'webhook',
  'external_api',
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_EVENT_CATEGORIES = [
  'business',
  'technical',
  'security',
  'system',
  'scheduled',
  'geographic',
  'ai',
  'external',
] as const;

export type NotificationEventCategory = (typeof NOTIFICATION_EVENT_CATEGORIES)[number];

export interface NotificationRecipientDefinition {
  type: 'user' | 'role' | 'group' | 'team' | 'dynamic';
  ref?: string;
  dynamic?: string;
}

export interface NotificationChannelConfig {
  channel: NotificationChannel;
  template?: string;
  subject?: string;
  webhookUrl?: string;
  config?: Record<string, unknown>;
}

export interface NotificationRuleDefinition {
  ruleKey: string;
  name: string;
  description?: string;
  priority?: number;
  eventTypes: string[];
  eventCategory?: NotificationEventCategory;
  alertSeverity?: NotificationAlertSeverity;
  conditions?: WorkflowRuleGroup;
  channels: NotificationChannelConfig[];
  recipients: NotificationRecipientDefinition[];
  schedule?: {
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    deferToNextDay?: boolean;
  };
  escalation?: {
    afterMinutes?: number;
    escalateTo?: NotificationRecipientDefinition[];
    increasePriority?: boolean;
  };
  suppression?: {
    windowSeconds?: number;
    keyTemplate?: string;
  };
  expiresInHours?: number;
  maxRetries?: number;
  groupingKey?: string;
  aiReadiness?: Record<string, boolean>;
}

// ─── EBIAP types ─────────────────────────────────────────────────────────────

export const BI_WIDGET_TYPES = [
  'kpi', 'indicator', 'bar', 'line', 'area', 'pie', 'radar', 'treemap',
  'heatmap', 'gauge', 'funnel', 'table', 'card', 'calendar', 'map', 'timeline', 'realtime',
] as const;

export type BiWidgetType = (typeof BI_WIDGET_TYPES)[number];

export const BI_DASHBOARD_CATEGORIES = [
  'executive', 'financial', 'commercial', 'operational', 'agronomic',
  'purchases', 'inventory', 'quality', 'producers', 'gis', 'ai', 'custom',
] as const;

export type BiDashboardCategory = (typeof BI_DASHBOARD_CATEGORIES)[number];

export const BI_REPORT_FORMATS = ['excel', 'csv', 'pdf', 'ods', 'json', 'xml'] as const;
export type BiReportFormat = (typeof BI_REPORT_FORMATS)[number];

export const BI_DATA_SOURCES = [
  'producers', 'farms', 'lots', 'forms', 'form_submissions', 'workflows',
  'events', 'gis_layers', 'purchases', 'inventory', 'quality', 'notifications',
  'kpi_history', 'lot_twins', 'farm_twins',
] as const;

export type BiDataSource = (typeof BI_DATA_SOURCES)[number];

export interface BiQueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value?: unknown;
}

export interface BiQueryAggregation {
  field: string;
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max';
  alias: string;
}

export interface BiVisualQueryDefinition {
  dataSource: BiDataSource | string;
  filters?: BiQueryFilter[];
  groupBy?: string[];
  aggregations?: BiQueryAggregation[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  compareWith?: { period: 'previous_period' | 'previous_year'; field?: string };
  calculatedFields?: Array<{ key: string; expression: string }>;
  parameters?: Record<string, unknown>;
}

export interface BiWidgetDefinition {
  id: string;
  type: BiWidgetType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  query?: BiVisualQueryDefinition;
  kpiKey?: string;
  config?: Record<string, unknown>;
}

export interface BiDashboardDefinition {
  version: number;
  widgets: BiWidgetDefinition[];
  settings?: {
    refreshIntervalSec?: number;
    theme?: string;
    aiReadiness?: Record<string, boolean>;
  };
}

// ─── EAIDSP types ──────────────────────────────────────────────────────────────

export const AI_PROVIDER_TYPES = [
  'openai', 'google', 'anthropic', 'meta', 'mistral', 'deepseek', 'ollama', 'custom',
] as const;

export type AiProviderType = (typeof AI_PROVIDER_TYPES)[number];

export const AI_SERVICE_TYPES = [
  'chat', 'completion', 'summarization', 'classification', 'extraction', 'translation',
  'correction', 'document_analysis', 'ocr', 'image_analysis', 'audio_analysis',
  'speech_recognition', 'recommendation', 'anomaly_detection', 'prediction', 'explanation',
] as const;

export type AiServiceType = (typeof AI_SERVICE_TYPES)[number];

export const AI_COPILOT_CATEGORIES = [
  'management', 'purchases', 'finance', 'inventory', 'quality', 'laboratory',
  'producers', 'field_technician', 'logistics', 'hr', 'system_admin',
] as const;

export type AiCopilotCategory = (typeof AI_COPILOT_CATEGORIES)[number];

export const AI_RAG_SOURCE_TYPES = [
  'document', 'contract', 'procedure', 'manual', 'erp_record', 'report', 'form', 'regulation',
] as const;

export type AiRagSourceType = (typeof AI_RAG_SOURCE_TYPES)[number];

export interface AiExplainability {
  confidence: number;
  sources: Array<{ type: string; ref: string; title?: string; dataDate?: string }>;
  modelUsed: string;
  providerType: string;
  latencyMs: number;
  justification?: string;
  ragUsed: boolean;
}

export interface AiCompletionRequest {
  serviceType: AiServiceType;
  prompt: string;
  systemPrompt?: string;
  variables?: Record<string, unknown>;
  moduleContext?: string;
  copilotKey?: string;
  conversationId?: string;
  useRag?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AiCompletionResponse {
  content: string;
  explainability: AiExplainability;
  tokensIn: number;
  tokensOut: number;
  estimatedCost?: number;
  conversationId?: string;
  messageId?: string;
}

// ─── EAMIP types ───────────────────────────────────────────────────────────────

export const API_DEFINITION_STATUSES = ['draft', 'published', 'deprecated', 'unpublished'] as const;
export type ApiDefinitionStatus = (typeof API_DEFINITION_STATUSES)[number];

export const API_AUTH_TYPES = ['none', 'api_key', 'oauth2', 'jwt', 'oidc'] as const;
export type ApiAuthType = (typeof API_AUTH_TYPES)[number];

export const API_CLIENT_STATUSES = ['active', 'suspended', 'revoked'] as const;
export type ApiClientStatus = (typeof API_CLIENT_STATUSES)[number];

export const API_CONNECTOR_TYPES = [
  'dian', 'bank', 'payment_gateway', 'email', 'sms', 'whatsapp', 'gis', 'weather',
  'external_erp', 'crm', 'iot', 'auth_provider', 'custom',
] as const;
export type ApiConnectorType = (typeof API_CONNECTOR_TYPES)[number];

export const API_HEALTH_STATUSES = ['healthy', 'degraded', 'down', 'unknown'] as const;
export type ApiHealthStatus = (typeof API_HEALTH_STATUSES)[number];

export const API_BREAKER_STATES = ['closed', 'open', 'half_open'] as const;
export type ApiBreakerState = (typeof API_BREAKER_STATES)[number];

export const API_DOMAINS = [
  'core', 'prm', 'ftip', 'fmdt', 'forms', 'workflows', 'gis', 'notifications',
  'analytics', 'ai', 'integration', 'finance', 'logistics',
] as const;
export type ApiDomain = (typeof API_DOMAINS)[number];

export const API_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type ApiHttpMethod = (typeof API_HTTP_METHODS)[number];

export interface ApiGatewayRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface ApiGatewayResponse {
  statusCode: number;
  body: unknown;
  latencyMs: number;
  headers?: Record<string, string>;
}

// ─── EIAMP types ───────────────────────────────────────────────────────────────

export const IAM_MFA_TYPES = ['totp', 'email', 'sms', 'webauthn'] as const;
export type IamMfaType = (typeof IAM_MFA_TYPES)[number];

export const IAM_SECURITY_EVENT_TYPES = [
  'login_success', 'login_failure', 'logout', 'mfa_challenge', 'mfa_success',
  'password_change', 'password_reset', 'role_assigned', 'role_revoked',
  'permission_changed', 'user_created', 'user_deleted', 'user_locked',
  'privilege_elevation', 'session_revoked', 'access_denied', 'anomaly_detected',
] as const;

export type IamSecurityEventType = (typeof IAM_SECURITY_EVENT_TYPES)[number];

export const IAM_ANOMALY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IamAnomalySeverity = (typeof IAM_ANOMALY_SEVERITIES)[number];

export interface IamLoginContext {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  countryCode?: string;
}

export interface IamAuthGateResult {
  allowed: boolean;
  mfaRequired?: boolean;
  mfaToken?: string;
  mustChangePassword?: boolean;
  reason?: string;
}

// ─── EBRE types ──────────────────────────────────────────────────────────────

export const BRE_TRIGGER_TYPES = ['event', 'scheduled', 'manual', 'api'] as const;
export type BreTriggerType = (typeof BRE_TRIGGER_TYPES)[number];

export const BRE_RULE_STATUSES = ['draft', 'published', 'inactive', 'archived'] as const;
export type BreRuleStatus = (typeof BRE_RULE_STATUSES)[number];

export const BRE_HIT_POLICIES = ['first', 'collect', 'priority', 'unique'] as const;
export type BreHitPolicy = (typeof BRE_HIT_POLICIES)[number];

export const BRE_EXECUTION_STATUSES = ['success', 'failed', 'skipped', 'partial'] as const;
export type BreExecutionStatus = (typeof BRE_EXECUTION_STATUSES)[number];

export const BRE_EVENT_CATEGORIES = [
  'purchase',
  'producer',
  'farm',
  'lot',
  'contract',
  'inventory',
  'quality',
  'lab',
  'payment',
  'finance',
  'gis',
  'workflow',
  'form',
  'user',
  'security',
  'ai',
  'generic',
] as const;
export type BreEventCategory = (typeof BRE_EVENT_CATEGORIES)[number];

export const BRE_ACTION_TYPES = [
  'create_record',
  'update_record',
  'delete_record',
  'send_notification',
  'send_email',
  'create_task',
  'start_workflow',
  'generate_document',
  'call_api',
  'invoke_ai',
  'update_kpi',
  'audit',
  'emit_event',
  'set_variable',
] as const;
export type BreActionType = (typeof BRE_ACTION_TYPES)[number];

export interface BreActionDefinition {
  type: BreActionType;
  config: Record<string, unknown>;
  stopOnError?: boolean;
}

export interface BreExpressionDefinition {
  key: string;
  expression: string;
  type?: 'math' | 'string' | 'date' | 'geo' | 'api' | 'ai';
}

export interface BreScheduleDefinition {
  cron?: string;
  timezone?: string;
  intervalMinutes?: number;
  allowedHours?: { start: string; end: string };
}

export interface BreDecisionTableRow {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  priority?: number;
}

export interface BreDecisionTableDefinition {
  tableKey: string;
  name: string;
  description?: string;
  inputs: Array<{ key: string; type: string; label?: string }>;
  outputs: Array<{ key: string; type: string; label?: string }>;
  rows: BreDecisionTableRow[];
  hitPolicy?: BreHitPolicy;
}

export interface BusinessRuleDefinition {
  ruleKey: string;
  name: string;
  description?: string;
  groupKey?: string;
  priority?: number;
  triggerType?: BreTriggerType;
  eventTypes?: string[];
  eventCategory?: BreEventCategory | string;
  conditions?: WorkflowRuleGroup;
  expressions?: BreExpressionDefinition[];
  actions?: BreActionDefinition[];
  dependencies?: string[];
  schedule?: BreScheduleDefinition;
  decisionTableKey?: string;
  metadata?: Record<string, unknown>;
  aiReadiness?: Record<string, boolean>;
}

// ─── ESDJE types ─────────────────────────────────────────────────────────────

export const ESDJE_JOB_TYPES = [
  'one_time',
  'recurring',
  'scheduled',
  'deferred',
  'event',
  'manual',
  'distributed',
  'parallel',
  'dependent',
] as const;
export type EsdjeJobType = (typeof ESDJE_JOB_TYPES)[number];

export const ESDJE_JOB_STATUSES = [
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'dead_letter',
  'paused',
] as const;
export type EsdjeJobStatus = (typeof ESDJE_JOB_STATUSES)[number];

export const ESDJE_QUEUE_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;
export type EsdjeQueuePriority = (typeof ESDJE_QUEUE_PRIORITIES)[number];

export const ESDJE_RETRY_STRATEGIES = ['exponential', 'linear', 'fixed'] as const;
export type EsdjeRetryStrategy = (typeof ESDJE_RETRY_STRATEGIES)[number];

export const ESDJE_HANDLER_TYPES = [
  'workflow.trigger',
  'notification.send',
  'ai.invoke',
  'bre.evaluate',
  'sync.pull',
  'inventory.reconcile',
  'purchase.process',
  'finance.close',
  'contract.reminder',
  'webhook.call',
  'module.generic',
] as const;
export type EsdjeHandlerType = (typeof ESDJE_HANDLER_TYPES)[number];

export interface EsdjeScheduleDefinition {
  cron?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone?: string;
  businessDaysOnly?: boolean;
  allowedHours?: { start: string; end: string };
}

export interface EsdjeJobDefinition {
  jobKey: string;
  name: string;
  description?: string;
  jobType?: EsdjeJobType;
  handlerType: EsdjeHandlerType | string;
  queueKey?: string;
  payload?: Record<string, unknown>;
  schedule?: EsdjeScheduleDefinition;
  cronExpression?: string;
  timezone?: string;
  runAt?: string;
  eventTypes?: string[];
  dependencies?: string[];
  maxRetries?: number;
  retryStrategy?: EsdjeRetryStrategy;
  retryDelayMs?: number;
  timeoutMs?: number;
  priority?: number;
  parallelism?: number;
  businessDaysOnly?: boolean;
  metadata?: Record<string, unknown>;
}

// ─── EPPM types ──────────────────────────────────────────────────────────────

export const EPPM_PLUGIN_TYPES = [
  'business_module',
  'report',
  'dashboard',
  'integration',
  'connector',
  'template',
  'business_rule',
  'workflow',
  'widget',
  'theme',
  'language',
  'mobile_component',
  'ai_service',
] as const;
export type EppmPluginType = (typeof EPPM_PLUGIN_TYPES)[number];

export const EPPM_PACKAGE_STATUSES = ['draft', 'published', 'deprecated', 'archived'] as const;
export type EppmPackageStatus = (typeof EPPM_PACKAGE_STATUSES)[number];

export const EPPM_INSTALL_STATUSES = [
  'installed',
  'enabled',
  'disabled',
  'updating',
  'failed',
  'uninstalled',
] as const;
export type EppmInstallStatus = (typeof EPPM_INSTALL_STATUSES)[number];

export const EPPM_MARKETPLACE_VISIBILITY = ['public', 'private', 'org_only'] as const;
export type EppmMarketplaceVisibility = (typeof EPPM_MARKETPLACE_VISIBILITY)[number];

export const EPPM_VENDOR_TYPES = ['official', 'partner', 'third_party', 'internal'] as const;
export type EppmVendorType = (typeof EPPM_VENDOR_TYPES)[number];

export interface EppmPluginManifest {
  apiVersion: string;
  pluginKey: string;
  name: string;
  version: string;
  description?: string;
  vendor: string;
  pluginType: EppmPluginType;
  minPlatformVersion?: string;
  dependencies?: Array<{ pluginKey: string; version: string }>;
  permissions?: Array<{ key: string; description?: string; scope?: string }>;
  extensionPoints?: Array<{ pointKey: string; handler: string }>;
  events?: { subscribe?: string[]; publish?: string[] };
  configSchema?: Record<string, unknown>;
  signature?: string;
}

export interface EppmPluginDefinition {
  pluginKey: string;
  name: string;
  description?: string;
  vendor: string;
  vendorType?: EppmVendorType;
  pluginType: EppmPluginType;
  categoryKey: string;
  visibility?: EppmMarketplaceVisibility;
  manifest?: EppmPluginManifest;
  screenshots?: string[];
  documentation?: string;
  license?: string;
  compatibility?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ─── EIESDP types ────────────────────────────────────────────────────────────

export const EIESDP_DEVICE_TYPES = [
  'electronic_scale', 'temperature_sensor', 'humidity_sensor', 'soil_sensor', 'ph_sensor',
  'weather_station', 'gps_tracker', 'rfid_reader', 'nfc_reader', 'ble_beacon', 'qr_scanner',
  'barcode_scanner', 'ip_camera', 'drone', 'industrial_controller', 'plc', 'actuator',
  'energy_meter', 'custom_driver',
] as const;
export type EiesdpDeviceType = (typeof EIESDP_DEVICE_TYPES)[number];

export const EIESDP_DEVICE_STATUSES = [
  'registered', 'active', 'inactive', 'revoked', 'maintenance', 'offline',
] as const;
export type EiesdpDeviceStatus = (typeof EIESDP_DEVICE_STATUSES)[number];

export const EIESDP_PROTOCOLS = [
  'mqtt', 'http', 'https', 'tcp', 'udp', 'websocket', 'bluetooth', 'serial', 'usb', 'modbus', 'opcua',
] as const;
export type EiesdpProtocol = (typeof EIESDP_PROTOCOLS)[number];

export const EIESDP_ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type EiesdpAlertSeverity = (typeof EIESDP_ALERT_SEVERITIES)[number];

export interface EiesdpDeviceDefinition {
  deviceKey: string;
  name: string;
  deviceType: EiesdpDeviceType;
  protocol?: EiesdpProtocol;
  serialNumber?: string;
  macAddress?: string;
  groupKey?: string;
  tags?: string[];
  farmId?: string;
  lotId?: string;
  vehicleId?: string;
  collectionCenterId?: string;
  assignedUserId?: string;
  driverKey?: string;
  mqttTopic?: string;
  metadata?: Record<string, unknown>;
}

export interface EiesdpTelemetryPayload {
  deviceKey: string;
  metricKey: string;
  value?: number;
  valueText?: string;
  unit?: string;
  latitude?: number;
  longitude?: number;
  batteryLevel?: number;
  signalQuality?: number;
  firmwareVersion?: string;
  payload?: Record<string, unknown>;
  recordedAt?: string;
}

// ─── EIH types ───────────────────────────────────────────────────────────────

export const EIH_CONNECTOR_PROTOCOLS = [
  'rest', 'soap', 'graphql', 'grpc', 'sftp', 'ftp', 'email', 'database',
  'message_queue', 'flat_file', 'webhook', 'proprietary',
] as const;
export type EihConnectorProtocol = (typeof EIH_CONNECTOR_PROTOCOLS)[number];

export const EIH_CONNECTOR_CATEGORIES = [
  'billing', 'tax_authority', 'bank', 'payment_gateway', 'external_erp', 'crm',
  'accounting', 'weather', 'satellite', 'maps', 'iot', 'auth_service',
  'digital_signature', 'messaging', 'storage', 'custom',
] as const;
export type EihConnectorCategory = (typeof EIH_CONNECTOR_CATEGORIES)[number];

export const EIH_DATA_FORMATS = [
  'json', 'xml', 'csv', 'excel', 'pdf', 'plain_text', 'geojson', 'protobuf',
] as const;
export type EihDataFormat = (typeof EIH_DATA_FORMATS)[number];

export const EIH_SYNC_MODES = [
  'real_time', 'scheduled', 'incremental', 'full', 'bidirectional', 'unidirectional',
] as const;
export type EihSyncMode = (typeof EIH_SYNC_MODES)[number];

export const EIH_AUTH_TYPES = [
  'none', 'api_key', 'oauth2', 'jwt', 'basic', 'certificate', 'mutual_tls',
] as const;
export type EihAuthType = (typeof EIH_AUTH_TYPES)[number];

export interface EihConnectorDefinition {
  connectorKey: string;
  name: string;
  description?: string;
  protocol: EihConnectorProtocol;
  category: EihConnectorCategory;
  authType?: EihAuthType;
  dataFormat?: EihDataFormat;
  syncMode?: EihSyncMode;
  catalogKey?: string;
  endpointUrl?: string;
  config?: Record<string, unknown>;
  tags?: string[];
}

export interface EihIntegrationFlowDefinition {
  flowKey: string;
  name: string;
  description?: string;
  sourceConnectorKey?: string;
  targetConnectorKey?: string;
  syncMode?: EihSyncMode;
  scheduleCron?: string;
  routingRules?: unknown[];
  validationRules?: unknown[];
  definition?: Record<string, unknown>;
}

export interface EihFieldMappingDefinition {
  sourceField: string;
  targetField: string;
  transform?: string;
  isRequired?: boolean;
  defaultValue?: string;
}

export interface EihSyncPayload {
  flowKey?: string;
  connectorKey?: string;
  syncMode?: EihSyncMode;
  data?: Record<string, unknown>[];
}

// ─── EOP types ───────────────────────────────────────────────────────────────

export const EOP_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
export type EopLogLevel = (typeof EOP_LOG_LEVELS)[number];

export const EOP_COMPONENT_TYPES = [
  'frontend', 'backend', 'android', 'worker', 'job', 'scheduler', 'workflow',
  'integration', 'plugin', 'iot', 'ai', 'gis', 'api_gateway', 'auth',
  'database', 'redis', 'minio', 'broker', 'external',
] as const;
export type EopComponentType = (typeof EOP_COMPONENT_TYPES)[number];

export const EOP_HEALTH_STATUSES = ['healthy', 'degraded', 'unhealthy', 'unknown'] as const;
export type EopHealthStatus = (typeof EOP_HEALTH_STATUSES)[number];

export const EOP_ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type EopAlertSeverity = (typeof EOP_ALERT_SEVERITIES)[number];

export const EOP_METRIC_KINDS = [
  'cpu', 'ram', 'disk', 'network', 'latency', 'errors', 'response_time',
  'tps', 'active_users', 'connections', 'module_usage', 'org_usage', 'api_usage', 'custom',
] as const;
export type EopMetricKind = (typeof EOP_METRIC_KINDS)[number];

export interface EopLogPayload {
  level: EopLogLevel;
  component: EopComponentType;
  serviceName: string;
  message: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  attributes?: Record<string, unknown>;
  recordedAt?: string;
}

export interface EopTraceSpanPayload {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  component: EopComponentType;
  serviceName: string;
  statusCode?: string;
  durationMs: number;
  attributes?: Record<string, unknown>;
  startedAt: string;
  endedAt: string;
}

export interface EopMetricPayload {
  metricKey: string;
  kind: EopMetricKind;
  value: number;
  serviceName?: string;
  moduleKey?: string;
  apiPath?: string;
  unit?: string;
  labels?: Record<string, unknown>;
  recordedAt?: string;
}

export interface EopRumPayload {
  sessionId: string;
  pagePath: string;
  eventType: string;
  userId?: string;
  durationMs?: number;
  userAgent?: string;
  attributes?: Record<string, unknown>;
}

export interface EopMobileTelemetryPayload {
  deviceId: string;
  eventType: string;
  message?: string;
  stackTrace?: string;
  durationMs?: number;
  isOffline?: boolean;
  appVersion?: string;
  attributes?: Record<string, unknown>;
}

// ─── EPOP types ──────────────────────────────────────────────────────────────

export const EPOP_CACHE_LAYERS = ['client', 'server', 'data'] as const;
export type EpopCacheLayer = (typeof EPOP_CACHE_LAYERS)[number];

export const EPOP_PERF_KINDS = [
  'response_time', 'slow_query', 'memory', 'cpu', 'fps', 'bundle_size',
  'module_latency', 'cache_hit', 'cache_miss', 'connection_pool', 'queue_depth', 'custom',
] as const;
export type EpopPerfKind = (typeof EPOP_PERF_KINDS)[number];

export interface EpopPaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface EpopPaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
}

export interface EpopCacheSetPayload {
  cacheKey: string;
  layer?: EpopCacheLayer;
  value: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface EpopSlowQueryPayload {
  sqlText: string;
  durationMs: number;
  moduleKey?: string;
  tableNames?: string[];
  rowsExamined?: number;
  planSummary?: Record<string, unknown>;
}

export interface EpopPerfMetricPayload {
  metricKey: string;
  kind: EpopPerfKind;
  value: number;
  moduleKey?: string;
  unit?: string;
  labels?: Record<string, unknown>;
}

export interface EpopMobilePerfPayload {
  deviceId: string;
  startupMs?: number;
  memoryMb?: number;
  batteryPct?: number;
  fps?: number;
  syncMs?: number;
  listRenderMs?: number;
  offlineOps?: number;
  attributes?: Record<string, unknown>;
}

export interface EpopBundleMetricPayload {
  bundleKey: string;
  name: string;
  sizeBytes: number;
  gzipBytes?: number;
  chunkCount?: number;
  platform?: string;
}

// ─── CPEP types ──────────────────────────────────────────────────────────────

export const CPEP_TICKET_STATUSES = [
  'arrived', 'identity_validated', 'queued', 'receiving', 'weighed',
  'quality_pending', 'quality_done', 'settlement_pending', 'settled',
  'inventory_posted', 'cancelled',
] as const;
export type CpepTicketStatus = (typeof CPEP_TICKET_STATUSES)[number];

export const CPEP_QUALITY_GRADES = ['excelso', 'premium', 'standard', 'pasilla', 'reject'] as const;
export type CpepQualityGrade = (typeof CPEP_QUALITY_GRADES)[number];

export interface CpepTicketDefinition {
  ticketKey?: string;
  producerId?: string;
  producerCode?: string;
  producerName?: string;
  identityDoc?: string;
  farmId?: string;
  farmName?: string;
  lotId?: string;
  lotCode?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  driverName?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface CpepWeighingInput {
  grossWeightKg?: number;
  tareWeightKg?: number;
  source?: string;
  iotDeviceKey?: string;
  scaleKey?: string;
  contingency?: boolean;
  contingencyReason?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  freeze?: boolean;
  average?: boolean;
}

export type CpepScaleConnectionType =
  | 'usb'
  | 'serial_rs232'
  | 'ethernet'
  | 'tcp_ip'
  | 'bluetooth'
  | 'wifi'
  | 'iot_gateway';

export interface CpepScaleDefinition {
  scaleKey: string;
  name: string;
  connectionType: CpepScaleConnectionType;
  iotDeviceKey?: string;
  purchaseCenterId?: string;
  driverKey?: string;
  firmwareVersion?: string;
  certified?: boolean;
  certificationExpiresAt?: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  precisionKg?: number;
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  macAddress?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export type CpepQualityDecision =
  | 'accepted'
  | 'accepted_with_observations'
  | 'conditioned'
  | 'rejected'
  | 'requires_lab';

export interface CpepQualityInput {
  humidityPct?: number;
  temperatureC?: number;
  factor?: number;
  pasillaPct?: number;
  brocaPct?: number;
  blackBeansPct?: number;
  vinegarBeansPct?: number;
  brokenBeansPct?: number;
  foreignMatterPct?: number;
  impuritiesPct?: number;
  defectsPct?: number;
  color?: string;
  odor?: string;
  grade?: CpepQualityGrade;
  observations?: string;
  inspectorComments?: string;
  decision?: CpepQualityDecision;
  labResults?: Record<string, unknown>;
  photoKeys?: string[];
}

export type CpepPaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'deposit'
  | 'check'
  | 'digital_wallet'
  | 'mixed'
  | 'deferred'
  | 'partial';

export interface CpepSettlementInput {
  basePricePerKg: number;
  qualityPricePerKg?: number;
  bonusesTotal?: number;
  penaltiesTotal?: number;
  discountsTotal?: number;
  withholdingsTotal?: number;
  transportTotal?: number;
  advancesTotal?: number;
  creditsTotal?: number;
  taxesTotal?: number;
  paidAmount?: number;
  roundingMode?: 'nearest' | 'up' | 'down' | 'none';
  roundingPrecision?: number;
  lines?: Array<Record<string, unknown>>;
  bonusLines?: Array<Record<string, unknown>>;
  penaltyLines?: Array<Record<string, unknown>>;
  discountLines?: Array<Record<string, unknown>>;
}

export interface CpepPaymentInput {
  method: CpepPaymentMethod;
  amount: number;
  reference?: string;
  bankName?: string;
  accountNumber?: string;
  walletProvider?: string;
  deferredUntil?: string;
  notes?: string;
  payments?: Array<{
    method: CpepPaymentMethod;
    amount: number;
    reference?: string;
    bankName?: string;
    accountNumber?: string;
    walletProvider?: string;
  }>;
}

export const CPEP_CATALOG_KEYS = [
  'coffee_type',
  'variety',
  'coffee_state',
  'presentation',
  'unit_of_measure',
  'packaging_type',
  'destination_warehouse',
  'purchase_center',
  'collection_center',
  'scale',
  'authorized_vehicle',
  'carrier',
  'rejection_reason',
  'defect_type',
  'humidity_type',
  'analysis_type',
  'payment_type',
  'bank',
  'payment_method',
  'currency',
  'tax',
  'withholding',
  'bonus',
  'penalty',
  'discount_concept',
] as const;
export type CpepCatalogKey = (typeof CPEP_CATALOG_KEYS)[number];

export const CPEP_PARAMETER_KEYS = [
  'base_price_by_coffee_type',
  'auto_bonuses',
  'auto_penalties',
  'humidity_ranges',
  'quality_ranges',
  'factor_ranges',
  'reception_limits',
  'reception_schedule',
  'reception_by_center',
  'reception_by_org',
  'reception_by_season',
  'reception_by_producer',
] as const;
export type CpepParameterKey = (typeof CPEP_PARAMETER_KEYS)[number];

export interface CpepCatalogEntryDefinition {
  catalogKey: CpepCatalogKey | string;
  entryKey: string;
  name: string;
  description?: string;
  code?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CpepParameterDefinition {
  parameterKey: string;
  name: string;
  scopeType?: 'organization' | 'purchase_center' | 'producer' | 'season' | 'coffee_type' | 'user' | 'role';
  scopeRef?: string;
  value: Record<string, unknown>;
  dataType?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CpepReceptionRuleDefinition {
  ruleKey: string;
  name: string;
  purchaseCenterId?: string;
  producerId?: string;
  coffeeTypeKey?: string;
  seasonKey?: string;
  scheduleCron?: string;
  openTime?: string;
  closeTime?: string;
  maxTicketsDay?: number;
  maxKgDay?: number;
  minHumidityPct?: number;
  maxHumidityPct?: number;
  minFactor?: number;
  maxFactor?: number;
  minQualityScore?: number;
  maxQualityScore?: number;
  metadata?: Record<string, unknown>;
}

export const SYSTEM_PERMISSIONS = [
  { resource: 'user', action: 'create', scope: 'org' },
  { resource: 'user', action: 'read', scope: 'org' },
  { resource: 'user', action: 'update', scope: 'org' },
  { resource: 'user', action: 'delete', scope: 'org' },
  { resource: 'resource', action: 'create', scope: 'org' },
  { resource: 'resource', action: 'read', scope: 'org' },
  { resource: 'resource', action: 'update', scope: 'org' },
  { resource: 'resource', action: 'delete', scope: 'org' },
  { resource: 'metadata', action: 'create', scope: 'org' },
  { resource: 'metadata', action: 'read', scope: 'org' },
  { resource: 'metadata', action: 'update', scope: 'org' },
  { resource: 'event', action: 'read', scope: 'org' },
  { resource: 'audit', action: 'read', scope: 'org' },
  { resource: 'sync', action: 'read', scope: 'org' },
  { resource: 'sync', action: 'push', scope: 'org' },
  { resource: 'form', action: 'create', scope: 'org' },
  { resource: 'form', action: 'read', scope: 'org' },
  { resource: 'form', action: 'update', scope: 'org' },
  { resource: 'form', action: 'publish', scope: 'org' },
  { resource: 'form', action: 'submit', scope: 'org' },
  { resource: 'form', action: 'design', scope: 'org' },
  { resource: 'form', action: 'approve', scope: 'org' },
  { resource: 'form', action: 'delete', scope: 'org' },
  { resource: 'form', action: 'export', scope: 'org' },
  { resource: 'form', action: 'import', scope: 'org' },
  { resource: 'form', action: 'assign', scope: 'org' },
  { resource: 'form', action: 'admin', scope: 'org' },
  { resource: 'sync', action: 'admin', scope: 'org' },
  { resource: 'organization', action: 'read', scope: 'org' },
  { resource: 'organization', action: 'update', scope: 'org' },
  { resource: 'role', action: 'create', scope: 'org' },
  { resource: 'role', action: 'read', scope: 'org' },
  { resource: 'role', action: 'update', scope: 'org' },
  { resource: 'role', action: 'delete', scope: 'org' },
  { resource: 'group', action: 'create', scope: 'org' },
  { resource: 'group', action: 'read', scope: 'org' },
  { resource: 'group', action: 'update', scope: 'org' },
  { resource: 'group', action: 'delete', scope: 'org' },
  { resource: 'policy', action: 'create', scope: 'org' },
  { resource: 'policy', action: 'read', scope: 'org' },
  { resource: 'policy', action: 'update', scope: 'org' },
  { resource: 'policy', action: 'delete', scope: 'org' },
  { resource: 'session', action: 'read', scope: 'org' },
  { resource: 'session', action: 'admin', scope: 'org' },
  { resource: 'org_unit', action: 'create', scope: 'org' },
  { resource: 'org_unit', action: 'read', scope: 'org' },
  { resource: 'org_unit', action: 'update', scope: 'org' },
  { resource: 'org_unit', action: 'delete', scope: 'org' },
  { resource: 'service_account', action: 'create', scope: 'org' },
  { resource: 'service_account', action: 'read', scope: 'org' },
  { resource: 'service_account', action: 'delete', scope: 'org' },
  { resource: 'team', action: 'create', scope: 'org' },
  { resource: 'team', action: 'read', scope: 'org' },
  { resource: 'team', action: 'update', scope: 'org' },
  { resource: 'team', action: 'delete', scope: 'org' },
  { resource: 'workflow', action: 'create', scope: 'org' },
  { resource: 'workflow', action: 'read', scope: 'org' },
  { resource: 'workflow', action: 'update', scope: 'org' },
  { resource: 'workflow', action: 'publish', scope: 'org' },
  { resource: 'workflow', action: 'execute', scope: 'org' },
  { resource: 'workflow', action: 'approve', scope: 'org' },
  { resource: 'workflow', action: 'cancel', scope: 'org' },
  { resource: 'workflow', action: 'admin', scope: 'org' },
  { resource: 'workflow', action: 'import', scope: 'org' },
  { resource: 'workflow', action: 'export', scope: 'org' },
  { resource: 'producer', action: 'create', scope: 'org' },
  { resource: 'producer', action: 'read', scope: 'org' },
  { resource: 'producer', action: 'update', scope: 'org' },
  { resource: 'producer', action: 'delete', scope: 'org' },
  { resource: 'producer', action: 'approve', scope: 'org' },
  { resource: 'producer', action: 'lifecycle', scope: 'org' },
  { resource: 'producer', action: 'assign', scope: 'org' },
  { resource: 'producer', action: 'export', scope: 'org' },
  { resource: 'producer', action: 'import', scope: 'org' },
  { resource: 'producer', action: 'admin', scope: 'org' },
  { resource: 'farm', action: 'create', scope: 'org' },
  { resource: 'farm', action: 'read', scope: 'org' },
  { resource: 'farm', action: 'update', scope: 'org' },
  { resource: 'farm', action: 'delete', scope: 'org' },
  { resource: 'farm', action: 'approve', scope: 'org' },
  { resource: 'farm', action: 'export', scope: 'org' },
  { resource: 'farm', action: 'import', scope: 'org' },
  { resource: 'territory', action: 'geometry', scope: 'org' },
  { resource: 'territory', action: 'read', scope: 'org' },
  { resource: 'lot', action: 'create', scope: 'org' },
  { resource: 'lot', action: 'read', scope: 'org' },
  { resource: 'lot', action: 'update', scope: 'org' },
  { resource: 'lot', action: 'delete', scope: 'org' },
  { resource: 'lot', action: 'approve', scope: 'org' },
  { resource: 'lot', action: 'export', scope: 'org' },
  { resource: 'lot', action: 'import', scope: 'org' },
  { resource: 'lot', action: 'admin', scope: 'org' },
  { resource: 'lot', action: 'precision', scope: 'org' },
  { resource: 'field_operation', action: 'create', scope: 'org' },
  { resource: 'field_operation', action: 'verify', scope: 'org' },
  { resource: 'field_operation', action: 'void', scope: 'org' },
  { resource: 'lot_cost', action: 'read', scope: 'org' },
  { resource: 'lot_cost', action: 'create', scope: 'org' },
  { resource: 'lot_cost', action: 'approve', scope: 'org' },
  { resource: 'document', action: 'upload', scope: 'org' },
  { resource: 'document', action: 'read', scope: 'org' },
  { resource: 'report', action: 'read', scope: 'org' },
  { resource: 'gis', action: 'read', scope: 'org' },
  { resource: 'gis', action: 'measure', scope: 'org' },
  { resource: 'gis', action: 'capture', scope: 'org' },
  { resource: 'gis', action: 'edit', scope: 'org' },
  { resource: 'gis', action: 'analyze', scope: 'org' },
  { resource: 'gis', action: 'route', scope: 'org' },
  { resource: 'gis', action: 'route:approve', scope: 'org' },
  { resource: 'gis', action: 'layer:read', scope: 'org' },
  { resource: 'gis', action: 'layer:admin', scope: 'org' },
  { resource: 'gis', action: 'import', scope: 'org' },
  { resource: 'gis', action: 'export', scope: 'org' },
  { resource: 'gis', action: 'admin', scope: 'org' },
  { resource: 'notification', action: 'read', scope: 'org' },
  { resource: 'notification', action: 'create', scope: 'org' },
  { resource: 'notification', action: 'update', scope: 'org' },
  { resource: 'notification', action: 'delete', scope: 'org' },
  { resource: 'notification', action: 'send', scope: 'org' },
  { resource: 'notification', action: 'admin', scope: 'org' },
  { resource: 'notification', action: 'rule:read', scope: 'org' },
  { resource: 'notification', action: 'rule:create', scope: 'org' },
  { resource: 'notification', action: 'rule:update', scope: 'org' },
  { resource: 'notification', action: 'rule:publish', scope: 'org' },
  { resource: 'alert', action: 'read', scope: 'org' },
  { resource: 'alert', action: 'acknowledge', scope: 'org' },
  { resource: 'analytics', action: 'read', scope: 'org' },
  { resource: 'analytics', action: 'create', scope: 'org' },
  { resource: 'analytics', action: 'update', scope: 'org' },
  { resource: 'analytics', action: 'delete', scope: 'org' },
  { resource: 'analytics', action: 'admin', scope: 'org' },
  { resource: 'analytics', action: 'export', scope: 'org' },
  { resource: 'analytics', action: 'share', scope: 'org' },
  { resource: 'dashboard', action: 'read', scope: 'org' },
  { resource: 'dashboard', action: 'create', scope: 'org' },
  { resource: 'dashboard', action: 'update', scope: 'org' },
  { resource: 'dashboard', action: 'publish', scope: 'org' },
  { resource: 'dashboard', action: 'share', scope: 'org' },
  { resource: 'kpi', action: 'read', scope: 'org' },
  { resource: 'kpi', action: 'create', scope: 'org' },
  { resource: 'kpi', action: 'update', scope: 'org' },
  { resource: 'kpi', action: 'admin', scope: 'org' },
  { resource: 'report', action: 'export', scope: 'org' },
  { resource: 'report', action: 'schedule', scope: 'org' },
  { resource: 'report', action: 'share', scope: 'org' },
  { resource: 'query', action: 'read', scope: 'org' },
  { resource: 'query', action: 'create', scope: 'org' },
  { resource: 'query', action: 'execute', scope: 'org' },
  { resource: 'ai', action: 'read', scope: 'org' },
  { resource: 'ai', action: 'chat', scope: 'org' },
  { resource: 'ai', action: 'configure', scope: 'org' },
  { resource: 'ai', action: 'admin', scope: 'org' },
  { resource: 'ai', action: 'prompt:read', scope: 'org' },
  { resource: 'ai', action: 'prompt:create', scope: 'org' },
  { resource: 'ai', action: 'prompt:update', scope: 'org' },
  { resource: 'ai', action: 'prompt:approve', scope: 'org' },
  { resource: 'ai', action: 'rag:read', scope: 'org' },
  { resource: 'ai', action: 'rag:manage', scope: 'org' },
  { resource: 'ai', action: 'copilot:use', scope: 'org' },
  { resource: 'ai', action: 'metrics:read', scope: 'org' },
  { resource: 'api', action: 'read', scope: 'org' },
  { resource: 'api', action: 'publish', scope: 'org' },
  { resource: 'api', action: 'configure', scope: 'org' },
  { resource: 'api', action: 'admin', scope: 'org' },
  { resource: 'api', action: 'client:read', scope: 'org' },
  { resource: 'api', action: 'client:manage', scope: 'org' },
  { resource: 'api', action: 'key:manage', scope: 'org' },
  { resource: 'api', action: 'connector:read', scope: 'org' },
  { resource: 'api', action: 'connector:manage', scope: 'org' },
  { resource: 'api', action: 'metrics:read', scope: 'org' },
  { resource: 'api', action: 'developer:portal', scope: 'org' },
  { resource: 'iam', action: 'read', scope: 'org' },
  { resource: 'iam', action: 'admin', scope: 'org' },
  { resource: 'iam', action: 'user:manage', scope: 'org' },
  { resource: 'iam', action: 'role:manage', scope: 'org' },
  { resource: 'iam', action: 'policy:manage', scope: 'org' },
  { resource: 'iam', action: 'session:manage', scope: 'org' },
  { resource: 'iam', action: 'audit:read', scope: 'org' },
  { resource: 'iam', action: 'mfa:manage', scope: 'org' },
  { resource: 'iam', action: 'sso:manage', scope: 'org' },
  { resource: 'bre', action: 'read', scope: 'org' },
  { resource: 'bre', action: 'create', scope: 'org' },
  { resource: 'bre', action: 'update', scope: 'org' },
  { resource: 'bre', action: 'publish', scope: 'org' },
  { resource: 'bre', action: 'simulate', scope: 'org' },
  { resource: 'bre', action: 'admin', scope: 'org' },
  { resource: 'bre', action: 'group:manage', scope: 'org' },
  { resource: 'bre', action: 'decision:manage', scope: 'org' },
  { resource: 'bre', action: 'audit:read', scope: 'org' },
  { resource: 'scheduler', action: 'read', scope: 'org' },
  { resource: 'scheduler', action: 'create', scope: 'org' },
  { resource: 'scheduler', action: 'update', scope: 'org' },
  { resource: 'scheduler', action: 'execute', scope: 'org' },
  { resource: 'scheduler', action: 'admin', scope: 'org' },
  { resource: 'scheduler', action: 'queue:manage', scope: 'org' },
  { resource: 'scheduler', action: 'worker:manage', scope: 'org' },
  { resource: 'scheduler', action: 'audit:read', scope: 'org' },
  { resource: 'plugin', action: 'read', scope: 'org' },
  { resource: 'plugin', action: 'install', scope: 'org' },
  { resource: 'plugin', action: 'update', scope: 'org' },
  { resource: 'plugin', action: 'uninstall', scope: 'org' },
  { resource: 'plugin', action: 'publish', scope: 'org' },
  { resource: 'plugin', action: 'admin', scope: 'org' },
  { resource: 'plugin', action: 'marketplace:manage', scope: 'org' },
  { resource: 'plugin', action: 'developer:manage', scope: 'org' },
  { resource: 'plugin', action: 'audit:read', scope: 'org' },
  { resource: 'iot', action: 'read', scope: 'org' },
  { resource: 'iot', action: 'register', scope: 'org' },
  { resource: 'iot', action: 'update', scope: 'org' },
  { resource: 'iot', action: 'control', scope: 'org' },
  { resource: 'iot', action: 'revoke', scope: 'org' },
  { resource: 'iot', action: 'telemetry:read', scope: 'org' },
  { resource: 'iot', action: 'firmware:manage', scope: 'org' },
  { resource: 'iot', action: 'edge:manage', scope: 'org' },
  { resource: 'iot', action: 'admin', scope: 'org' },
  { resource: 'iot', action: 'audit:read', scope: 'org' },
  { resource: 'integration', action: 'read', scope: 'org' },
  { resource: 'integration', action: 'create', scope: 'org' },
  { resource: 'integration', action: 'update', scope: 'org' },
  { resource: 'integration', action: 'publish', scope: 'org' },
  { resource: 'integration', action: 'execute', scope: 'org' },
  { resource: 'integration', action: 'sync:manage', scope: 'org' },
  { resource: 'integration', action: 'webhook:manage', scope: 'org' },
  { resource: 'integration', action: 'admin', scope: 'org' },
  { resource: 'integration', action: 'audit:read', scope: 'org' },
  { resource: 'observability', action: 'read', scope: 'org' },
  { resource: 'observability', action: 'ingest', scope: 'org' },
  { resource: 'observability', action: 'alerts:manage', scope: 'org' },
  { resource: 'observability', action: 'incidents:manage', scope: 'org' },
  { resource: 'observability', action: 'admin', scope: 'org' },
  { resource: 'observability', action: 'audit:read', scope: 'org' },
  { resource: 'performance', action: 'read', scope: 'org' },
  { resource: 'performance', action: 'optimize', scope: 'org' },
  { resource: 'performance', action: 'cache:manage', scope: 'org' },
  { resource: 'performance', action: 'benchmark', scope: 'org' },
  { resource: 'performance', action: 'admin', scope: 'org' },
  { resource: 'performance', action: 'audit:read', scope: 'org' },
  { resource: 'coffee', action: 'read', scope: 'org' },
  { resource: 'coffee', action: 'receive', scope: 'org' },
  { resource: 'coffee', action: 'weigh', scope: 'org' },
  { resource: 'coffee', action: 'weigh:manual', scope: 'org' },
  { resource: 'coffee', action: 'weigh:configure', scope: 'org' },
  { resource: 'coffee', action: 'quality', scope: 'org' },
  { resource: 'coffee', action: 'quality:decide', scope: 'org' },
  { resource: 'coffee', action: 'quality:configure', scope: 'org' },
  { resource: 'coffee', action: 'settle', scope: 'org' },
  { resource: 'coffee', action: 'settle:void', scope: 'org' },
  { resource: 'coffee', action: 'settle:pay', scope: 'org' },
  { resource: 'coffee', action: 'inventory', scope: 'org' },
  { resource: 'coffee', action: 'admin', scope: 'org' },
  { resource: 'coffee', action: 'audit:read', scope: 'org' },
  { resource: 'coffee', action: 'config:read', scope: 'org' },
  { resource: 'coffee', action: 'config:manage', scope: 'org' },
  { resource: 'coffee', action: 'catalog:manage', scope: 'org' },
  { resource: 'inventory', action: 'read', scope: 'org' },
  { resource: 'inventory', action: 'item', scope: 'org' },
  { resource: 'inventory', action: 'warehouse', scope: 'org' },
  { resource: 'inventory', action: 'catalog', scope: 'org' },
  { resource: 'inventory', action: 'config', scope: 'org' },
  { resource: 'inventory', action: 'audit', scope: 'org' },
  { resource: 'inventory', action: 'admin', scope: 'org' },
  { resource: 'sales', action: 'read', scope: 'org' },
  { resource: 'sales', action: 'customer', scope: 'org' },
  { resource: 'sales', action: 'pricing', scope: 'org' },
  { resource: 'sales', action: 'catalog', scope: 'org' },
  { resource: 'sales', action: 'config', scope: 'org' },
  { resource: 'sales', action: 'audit', scope: 'org' },
  { resource: 'sales', action: 'admin', scope: 'org' },
  { resource: 'sales', action: 'crm', scope: 'org' },
  { resource: 'sales', action: 'opportunity', scope: 'org' },
  { resource: 'sales', action: 'quotation', scope: 'org' },
  { resource: 'sales', action: 'order', scope: 'org' },
  { resource: 'sales', action: 'approve', scope: 'org' },
  { resource: 'sales', action: 'reservation', scope: 'org' },
  { resource: 'sales', action: 'dispatch', scope: 'org' },
  { resource: 'sales', action: 'delivery', scope: 'org' },
  { resource: 'sales', action: 'logistics', scope: 'org' },
  { resource: 'sales', action: 'invoice', scope: 'org' },
  { resource: 'sales', action: 'billing', scope: 'org' },
  { resource: 'sales', action: 'return', scope: 'org' },
  { resource: 'sales', action: 'warranty', scope: 'org' },
  { resource: 'sales', action: 'receivable', scope: 'org' },
  { resource: 'sales', action: 'collection', scope: 'org' },
  { resource: 'sales', action: 'payment', scope: 'org' },
  { resource: 'sales', action: 'analytics', scope: 'org' },
  { resource: 'sales', action: 'report', scope: 'org' },
  { resource: 'sales', action: 'ops', scope: 'org' },
  { resource: 'finance', action: 'read', scope: 'org' },
  { resource: 'finance', action: 'config', scope: 'org' },
  { resource: 'finance', action: 'coa', scope: 'org' },
  { resource: 'finance', action: 'rule', scope: 'org' },
  { resource: 'finance', action: 'journal', scope: 'org' },
  { resource: 'finance', action: 'voucher', scope: 'org' },
  { resource: 'finance', action: 'approve', scope: 'org' },
  { resource: 'finance', action: 'period', scope: 'org' },
  { resource: 'finance', action: 'audit', scope: 'org' },
  { resource: 'finance', action: 'admin', scope: 'org' },
  { resource: 'finance', action: 'ap_invoice', scope: 'org' },
  { resource: 'finance', action: 'ap_pay', scope: 'org' },
  { resource: 'finance', action: 'ap_approve', scope: 'org' },
  { resource: 'finance', action: 'ap_schedule', scope: 'org' },
  { resource: 'finance', action: 'tr_config', scope: 'org' },
  { resource: 'finance', action: 'tr_move', scope: 'org' },
  { resource: 'finance', action: 'tr_cash', scope: 'org' },
  { resource: 'finance', action: 'tr_reconcile', scope: 'org' },
  { resource: 'finance', action: 'tr_approve', scope: 'org' },
  { resource: 'finance', action: 'fa_config', scope: 'org' },
  { resource: 'finance', action: 'fa_register', scope: 'org' },
  { resource: 'finance', action: 'fa_depreciate', scope: 'org' },
  { resource: 'finance', action: 'fa_dispose', scope: 'org' },
  { resource: 'finance', action: 'fa_approve', scope: 'org' },
  { resource: 'finance', action: 'fa_inventory', scope: 'org' },
  { resource: 'finance', action: 'bg_config', scope: 'org' },
  { resource: 'finance', action: 'bg_manage', scope: 'org' },
  { resource: 'finance', action: 'bg_validate', scope: 'org' },
  { resource: 'finance', action: 'bg_approve', scope: 'org' },
  { resource: 'hcm', action: 'read', scope: 'org' },
  { resource: 'hcm', action: 'config', scope: 'org' },
  { resource: 'hcm', action: 'employee', scope: 'org' },
  { resource: 'hcm', action: 'contract', scope: 'org' },
  { resource: 'hcm', action: 'document', scope: 'org' },
  { resource: 'hcm', action: 'org', scope: 'org' },
  { resource: 'hcm', action: 'import', scope: 'org' },
  { resource: 'hcm', action: 'audit', scope: 'org' },
  { resource: 'hcm', action: 'admin', scope: 'org' },
  { resource: 'hcm', action: 'rc_read', scope: 'org' },
  { resource: 'hcm', action: 'rc_config', scope: 'org' },
  { resource: 'hcm', action: 'rc_vacancy', scope: 'org' },
  { resource: 'hcm', action: 'rc_approve', scope: 'org' },
  { resource: 'hcm', action: 'rc_recruit', scope: 'org' },
  { resource: 'hcm', action: 'rc_import', scope: 'org' },
  { resource: 'hcm', action: 'rc_select', scope: 'org' },
  { resource: 'hcm', action: 'rc_hire', scope: 'org' },
  { resource: 'hcm', action: 'rc_onboard', scope: 'org' },
  { resource: 'hcm', action: 'rc_audit', scope: 'org' },
  { resource: 'hcm', action: 'ta_read', scope: 'org' },
  { resource: 'hcm', action: 'ta_config', scope: 'org' },
  { resource: 'hcm', action: 'ta_shift', scope: 'org' },
  { resource: 'hcm', action: 'ta_schedule', scope: 'org' },
  { resource: 'hcm', action: 'ta_punch', scope: 'org' },
  { resource: 'hcm', action: 'ta_novelty', scope: 'org' },
  { resource: 'hcm', action: 'ta_approve', scope: 'org' },
  { resource: 'hcm', action: 'ta_audit', scope: 'org' },
  { resource: 'hcm', action: 'ta_admin', scope: 'org' },
  { resource: 'hcm', action: 'py_read', scope: 'org' },
  { resource: 'hcm', action: 'py_config', scope: 'org' },
  { resource: 'hcm', action: 'py_period', scope: 'org' },
  { resource: 'hcm', action: 'py_run', scope: 'org' },
  { resource: 'hcm', action: 'py_approve', scope: 'org' },
  { resource: 'hcm', action: 'py_export', scope: 'org' },
  { resource: 'hcm', action: 'py_audit', scope: 'org' },
  { resource: 'hcm', action: 'py_admin', scope: 'org' },
  { resource: 'hcm', action: 'td_read', scope: 'org' },
  { resource: 'hcm', action: 'td_config', scope: 'org' },
  { resource: 'hcm', action: 'td_training', scope: 'org' },
  { resource: 'hcm', action: 'td_competency', scope: 'org' },
  { resource: 'hcm', action: 'td_evaluate', scope: 'org' },
  { resource: 'hcm', action: 'td_approve', scope: 'org' },
  { resource: 'hcm', action: 'td_objective', scope: 'org' },
  { resource: 'hcm', action: 'td_career', scope: 'org' },
  { resource: 'hcm', action: 'td_audit', scope: 'org' },
  { resource: 'hcm', action: 'td_admin', scope: 'org' },
  { resource: 'hcm', action: 'ss_read', scope: 'org' },
  { resource: 'hcm', action: 'ss_config', scope: 'org' },
  { resource: 'hcm', action: 'ss_health', scope: 'org' },
  { resource: 'hcm', action: 'ss_risk', scope: 'org' },
  { resource: 'hcm', action: 'ss_ppe', scope: 'org' },
  { resource: 'hcm', action: 'ss_incident', scope: 'org' },
  { resource: 'hcm', action: 'ss_inspect', scope: 'org' },
  { resource: 'hcm', action: 'ss_audit', scope: 'org' },
  { resource: 'hcm', action: 'ss_admin', scope: 'org' },
  { resource: 'portal', action: 'read', scope: 'org' },
  { resource: 'portal', action: 'profile', scope: 'org' },
  { resource: 'portal', action: 'request', scope: 'org' },
  { resource: 'portal', action: 'approve', scope: 'org' },
  { resource: 'portal', action: 'audit', scope: 'org' },
  { resource: 'portal', action: 'admin', scope: 'org' },
  { resource: 'hcm', action: 'hed_read', scope: 'org' },
  { resource: 'hcm', action: 'hed_export', scope: 'org' },
  { resource: 'hcm', action: 'hed_audit', scope: 'org' },
  { resource: 'hcm', action: 'hpa_read', scope: 'org' },
  { resource: 'hcm', action: 'hpa_export', scope: 'org' },
  { resource: 'hcm', action: 'hpa_ai', scope: 'org' },
  { resource: 'hcm', action: 'hpa_config', scope: 'org' },
  { resource: 'hcm', action: 'hpa_audit', scope: 'org' },
  { resource: 'manufacturing', action: 'read', scope: 'org' },
  { resource: 'manufacturing', action: 'config', scope: 'org' },
  { resource: 'manufacturing', action: 'plan', scope: 'org' },
  { resource: 'manufacturing', action: 'bom', scope: 'org' },
  { resource: 'manufacturing', action: 'routing', scope: 'org' },
  { resource: 'manufacturing', action: 'order', scope: 'org' },
  { resource: 'manufacturing', action: 'schedule', scope: 'org' },
  { resource: 'manufacturing', action: 'execute', scope: 'org' },
  { resource: 'manufacturing', action: 'quality', scope: 'org' },
  { resource: 'manufacturing', action: 'resources', scope: 'org' },
  { resource: 'manufacturing', action: 'cost', scope: 'org' },
  { resource: 'manufacturing', action: 'intelligence', scope: 'org' },
  { resource: 'manufacturing', action: 'audit', scope: 'org' },
  { resource: 'supply_chain', action: 'read', scope: 'org' },
  { resource: 'supply_chain', action: 'config', scope: 'org' },
  { resource: 'supply_chain', action: 'plan', scope: 'org' },
  { resource: 'supply_chain', action: 'replenish', scope: 'org' },
  { resource: 'supply_chain', action: 'audit', scope: 'org' },
  { resource: 'supply_chain', action: 'wms', scope: 'org' },
  { resource: 'supply_chain', action: 'wms_execute', scope: 'org' },
  { resource: 'supply_chain', action: 'tms', scope: 'org' },
  { resource: 'supply_chain', action: 'tms_execute', scope: 'org' },
  { resource: 'supply_chain', action: 'collab', scope: 'org' },
  { resource: 'supply_chain', action: 'collab_execute', scope: 'org' },
  { resource: 'asset_management', action: 'read', scope: 'org' },
  { resource: 'asset_management', action: 'config', scope: 'org' },
  { resource: 'asset_management', action: 'register', scope: 'org' },
  { resource: 'asset_management', action: 'maintain', scope: 'org' },
  { resource: 'asset_management', action: 'audit', scope: 'org' },
  { resource: 'asset_management', action: 'cmms', scope: 'org' },
  { resource: 'asset_management', action: 'cmms_execute', scope: 'org' },
  { resource: 'asset_management', action: 'reliability', scope: 'org' },
  { resource: 'asset_management', action: 'reliability_execute', scope: 'org' },
  { resource: 'bpms', action: 'read', scope: 'org' },
  { resource: 'bpms', action: 'config', scope: 'org' },
  { resource: 'bpms', action: 'execute', scope: 'org' },
  { resource: 'bpms', action: 'audit', scope: 'org' },
  { resource: 'eip', action: 'read', scope: 'org' },
  { resource: 'eip', action: 'config', scope: 'org' },
  { resource: 'eip', action: 'execute', scope: 'org' },
  { resource: 'eip', action: 'audit', scope: 'org' },
  { resource: 'eint', action: 'read', scope: 'org' },
  { resource: 'eint', action: 'config', scope: 'org' },
  { resource: 'eint', action: 'execute', scope: 'org' },
  { resource: 'eint', action: 'audit', scope: 'org' },
  { resource: 'eops', action: 'read', scope: 'org' },
  { resource: 'eops', action: 'config', scope: 'org' },
  { resource: 'eops', action: 'execute', scope: 'org' },
  { resource: 'eops', action: 'audit', scope: 'org' },
  { resource: 'eatp', action: 'read', scope: 'org' },
  { resource: 'eatp', action: 'config', scope: 'org' },
  { resource: 'eatp', action: 'execute', scope: 'org' },
  { resource: 'eatp', action: 'audit', scope: 'org' },
  { resource: 'eapp', action: 'read', scope: 'org' },
  { resource: 'eapp', action: 'config', scope: 'org' },
  { resource: 'eapp', action: 'execute', scope: 'org' },
  { resource: 'eapp', action: 'audit', scope: 'org' },
  { resource: 'eiwp', action: 'read', scope: 'org' },
  { resource: 'eiwp', action: 'config', scope: 'org' },
  { resource: 'eiwp', action: 'execute', scope: 'org' },
  { resource: 'eiwp', action: 'audit', scope: 'org' },
  { resource: 'ephp', action: 'read', scope: 'org' },
  { resource: 'ephp', action: 'config', scope: 'org' },
  { resource: 'ephp', action: 'execute', scope: 'org' },
  { resource: 'ephp', action: 'audit', scope: 'org' },
  { resource: 'eatr', action: 'read', scope: 'org' },
  { resource: 'eatr', action: 'config', scope: 'org' },
  { resource: 'eatr', action: 'execute', scope: 'org' },
  { resource: 'eatr', action: 'audit', scope: 'org' },
  { resource: 'eacc', action: 'read', scope: 'org' },
  { resource: 'eacc', action: 'config', scope: 'org' },
  { resource: 'eacc', action: 'execute', scope: 'org' },
  { resource: 'eacc', action: 'audit', scope: 'org' },
  { resource: 'effm', action: 'read', scope: 'org' },
  { resource: 'effm', action: 'config', scope: 'org' },
  { resource: 'effm', action: 'execute', scope: 'org' },
  { resource: 'effm', action: 'audit', scope: 'org' },
  { resource: 'eaip', action: 'read', scope: 'org' },
  { resource: 'eaip', action: 'config', scope: 'org' },
  { resource: 'eaip', action: 'execute', scope: 'org' },
  { resource: 'eaip', action: 'audit', scope: 'org' },
  { resource: 'eace', action: 'read', scope: 'org' },
  { resource: 'eace', action: 'config', scope: 'org' },
  { resource: 'eace', action: 'execute', scope: 'org' },
  { resource: 'eace', action: 'audit', scope: 'org' },
] as const;

export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  FIELD_AGENT: 'field_agent',
  VIEWER: 'viewer',
  SUPERVISOR: 'supervisor',
  BUYER: 'buyer',
} as const;

export const PRODUCER_LIFECYCLE_STATUS = [
  'draft',
  'pre_registered',
  'pending_approval',
  'active',
  'suspended',
  'inactive',
  'archived',
] as const;

export type ProducerLifecycleStatus =
  (typeof PRODUCER_LIFECYCLE_STATUS)[number];

export const PRODUCER_LIFECYCLE_TRANSITIONS: Record<
  ProducerLifecycleStatus,
  ProducerLifecycleStatus[]
> = {
  draft: ['pre_registered', 'archived'],
  pre_registered: ['pending_approval', 'draft', 'archived'],
  pending_approval: ['active', 'pre_registered', 'archived'],
  active: ['suspended', 'inactive', 'archived'],
  suspended: ['active', 'inactive', 'archived'],
  inactive: ['active', 'archived'],
  archived: [],
};

export const FARM_UNIT_STATUS = [
  'draft',
  'under_validation',
  'active',
  'inactive',
  'abandoned',
] as const;

export type FarmUnitStatus = (typeof FARM_UNIT_STATUS)[number];

export const FARM_LIFECYCLE_TRANSITIONS: Record<
  FarmUnitStatus,
  FarmUnitStatus[]
> = {
  draft: ['under_validation', 'abandoned'],
  under_validation: ['active', 'draft', 'abandoned'],
  active: ['inactive', 'abandoned'],
  inactive: ['active', 'abandoned'],
  abandoned: [],
};

export const FIELD_LOT_STATUS = [
  'draft',
  'active',
  'fallow',
  'renovation',
  'inactive',
  'abandoned',
] as const;

export type FieldLotStatus = (typeof FIELD_LOT_STATUS)[number];

export const FIELD_LOT_LIFECYCLE_TRANSITIONS: Record<
  FieldLotStatus,
  FieldLotStatus[]
> = {
  draft: ['active', 'abandoned'],
  active: ['fallow', 'renovation', 'inactive', 'abandoned'],
  fallow: ['active', 'renovation', 'inactive'],
  renovation: ['active', 'inactive'],
  inactive: ['active', 'abandoned'],
  abandoned: [],
};

export const FIELD_OPERATION_TYPES = [
  'planting',
  'replanting',
  'fertilization',
  'amendment',
  'pruning',
  'suckering',
  'stumping',
  'weeding',
  'herbicide',
  'agroinput_application',
  'phytosanitary',
  'irrigation',
  'harvest',
  'renovation',
  'eradication',
  'sampling',
  'soil_analysis',
  'foliar_analysis',
] as const;

export type FieldOperationType = (typeof FIELD_OPERATION_TYPES)[number];

export * from './ucem';
export * from './ure';
