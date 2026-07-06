import { apiRequest } from './client';

export interface CoffeeDashboard {
  ticketsToday: number;
  queueLength: number;
  weighedToday: number;
  qualityToday: number;
  settlementsToday: number;
  inventoryToday: number;
  kgToday: number;
  amountToday: number;
  queue: CoffeeTicket[];
  suggestions: Array<Record<string, unknown>>;
  operations?: Record<string, unknown>;
  alerts?: Array<Record<string, unknown>>;
  kpis?: Record<string, unknown>;
  purchasesToday?: CoffeeTicket[];
}

export interface CoffeeTicket {
  id: string;
  ticketKey: string;
  status: string;
  producerName?: string;
  producerId?: string;
  farmName?: string;
  lotCode?: string;
  vehiclePlate?: string;
  turnNumber?: number;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  qrCode?: string;
  barcode?: string;
  quality?: Record<string, unknown>;
  settlement?: Record<string, unknown>;
  createdAt: string;
}

export function getCoffeeCenter() {
  return apiRequest<CoffeeDashboard>('/cpep/center');
}

export function listCoffeeTickets(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<CoffeeTicket[]>(`/cpep/tickets${q}`);
}

export function getCoffeeTicket(ticketKey: string) {
  return apiRequest<CoffeeTicket>(`/cpep/tickets/${ticketKey}`);
}

export function createCoffeeTicket(data: Record<string, unknown>) {
  return apiRequest<CoffeeTicket>('/cpep/tickets', { method: 'POST', body: JSON.stringify(data) });
}

export function validateCoffeeIdentity(ticketKey: string) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/identity`, { method: 'POST' });
}

export function assignCoffeeTurn(ticketKey: string) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/turn`, { method: 'POST' });
}

export function listCoffeeQueue() {
  return apiRequest<CoffeeTicket[]>('/cpep/queue');
}

export function weighCoffeeTicket(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/weigh`, { method: 'POST', body: JSON.stringify(data) });
}

export function recordCoffeeQuality(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/quality`, { method: 'POST', body: JSON.stringify(data) });
}

export function listCoffeeQuality(filters?: { producerId?: string; farmId?: string; lotId?: string; lotCode?: string }) {
  const params = new URLSearchParams();
  if (filters?.producerId) params.set('producerId', filters.producerId);
  if (filters?.farmId) params.set('farmId', filters.farmId);
  if (filters?.lotId) params.set('lotId', filters.lotId);
  if (filters?.lotCode) params.set('lotCode', filters.lotCode);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/cpep/quality${q}`);
}

export function listQualityPending() {
  return apiRequest<CoffeeTicket[]>('/cpep/quality/pending');
}

export function getQualityIndicators() {
  return apiRequest<Record<string, unknown>>('/cpep/quality/indicators');
}

export function listQualitySessions(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/cpep/quality/sessions${q}`);
}

export function getQualitySession(sessionKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/quality/sessions/${sessionKey}`);
}

export function listQualityAlerts(all = false) {
  return apiRequest<unknown[]>(`/cpep/quality/alerts${all ? '?all=true' : ''}`);
}

export function listQualityPhotos(ticketKey?: string) {
  const q = ticketKey ? `?ticketKey=${ticketKey}` : '';
  return apiRequest<unknown[]>(`/cpep/quality/photos${q}`);
}

export function listQualitySamples() {
  return apiRequest<unknown[]>('/cpep/quality/samples');
}

export function getQualitySample(sampleKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/quality/samples/${sampleKey}`);
}

export function startQualitySession(ticketKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/quality/tickets/${ticketKey}/start`, { method: 'POST' });
}

export function qualityIdentifyLot(sessionKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/lot`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function qualityRegisterSample(sessionKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/sample`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function qualityAddPhoto(sessionKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/photos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function qualityRecordParameters(sessionKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/parameters`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function qualityEvaluate(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/evaluate`, { method: 'POST' });
}

export function qualityDecide(sessionKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/sessions/${sessionKey}/decide`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function qualityReevaluate(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/tickets/${ticketKey}/reevaluate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSampleCustody(sampleKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/quality/samples/${sampleKey}/custody`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function settleCoffeeTicket(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/settle`, { method: 'POST', body: JSON.stringify(data) });
}

export function listCoffeeSettlements() {
  return apiRequest<unknown[]>('/cpep/settlements');
}

export function listSettlementPending() {
  return apiRequest<CoffeeTicket[]>('/cpep/settlements/pending');
}

export function getSettlementKpis() {
  return apiRequest<Record<string, unknown>>('/cpep/settlements/kpis');
}

export function getSettlement(settlementKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/settlements/${settlementKey}`);
}

export function getSettlementSession(sessionKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/settlements/sessions/${sessionKey}`);
}

export function startSettlementSession(ticketKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/settlements/tickets/${ticketKey}/start`, { method: 'POST' });
}

export function simulateSettlement(ticketKey: string, data?: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/cpep/settlements/tickets/${ticketKey}/simulate`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function resimulateSettlement(sessionKey: string, data?: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/cpep/settlements/sessions/${sessionKey}/simulate`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function confirmSettlementOperator(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/settlements/sessions/${sessionKey}/confirm-operator`, { method: 'POST' });
}

export function confirmSettlementProducer(sessionKey: string, data: { signerName: string; signatureData: string }) {
  return apiRequest<unknown>(`/cpep/settlements/sessions/${sessionKey}/confirm-producer`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function registerSettlement(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/settlements/sessions/${sessionKey}/register`, { method: 'POST' });
}

export function voidSettlement(settlementKey: string, reason: string) {
  return apiRequest<unknown>(`/cpep/settlements/${settlementKey}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function registerCoffeePayment(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function reprintCoffeeDocument(documentKey: string) {
  return apiRequest<unknown>(`/cpep/documents/${documentKey}/reprint`, { method: 'POST' });
}

export function getCoffeeDocument(documentKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/documents/${documentKey}`);
}

export function postCoffeeInventory(ticketKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/inventory`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function listCoffeeInventory() {
  return apiRequest<unknown[]>('/cpep/inventory');
}

export function listInventoryLots(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/cpep/inventory/lots${q}`);
}

export function getInventoryLot(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/inventory/lots/${lotKey}`);
}

export function inventoryByQr(code: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/inventory/qr/${encodeURIComponent(code)}`);
}

export function getInventoryKardex(lotKey?: string, warehouse?: string) {
  const params = new URLSearchParams();
  if (lotKey) params.set('lotKey', lotKey);
  if (warehouse) params.set('warehouse', warehouse);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/cpep/inventory/kardex${q}`);
}

export function getInventoryCosts(lotKey?: string) {
  const q = lotKey ? `?lotKey=${lotKey}` : '';
  return apiRequest<unknown[]>(`/cpep/inventory/costs${q}`);
}

export function registerInventoryMovement(lotKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/inventory/lots/${lotKey}/movements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function revalueInventoryLot(lotKey: string, unitCost: number, reason: string) {
  return apiRequest<unknown>(`/cpep/inventory/lots/${lotKey}/revalue`, {
    method: 'POST',
    body: JSON.stringify({ unitCost, reason }),
  });
}

export function getTraceabilityByTicket(ticketKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/traceability/ticket/${ticketKey}`);
}

export function getTraceabilityByLot(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/traceability/lot/${lotKey}`);
}

export function getTraceabilityByQr(code: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/traceability/qr/${encodeURIComponent(code)}`);
}

export function getTraceabilityAudit() {
  return apiRequest<Record<string, unknown>>('/cpep/traceability/audit');
}

export function listCoffeeDocuments(ticketKey?: string) {
  const q = ticketKey ? `?ticketKey=${ticketKey}` : '';
  return apiRequest<unknown[]>(`/cpep/documents${q}`);
}

export function listCoffeePrices() {
  return apiRequest<unknown[]>('/cpep/config/prices');
}

export function upsertCoffeePrice(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/config/prices', { method: 'POST', body: JSON.stringify(data) });
}

export function getCoffeeAudit() {
  return apiRequest<unknown[]>('/cpep/audit');
}

export function getCoffeeAi() {
  return apiRequest<unknown[]>('/cpep/ai/analysis');
}

export function searchCoffeeProducers(q: string) {
  return apiRequest<unknown[]>(`/cpep/lookups/producers?q=${encodeURIComponent(q)}`);
}

export function getCoffeeProducer(producerId: string) {
  return apiRequest<unknown>(`/cpep/lookups/producers/${producerId}`);
}

export function listCoffeeFarms(producerId?: string) {
  const q = producerId ? `?producerId=${producerId}` : '';
  return apiRequest<unknown[]>(`/cpep/lookups/farms${q}`);
}

export function listCoffeeLots(farmId?: string) {
  const q = farmId ? `?farmId=${farmId}` : '';
  return apiRequest<unknown[]>(`/cpep/lookups/lots${q}`);
}

export function listCoffeeScales() {
  return apiRequest<unknown[]>('/cpep/iot/scales');
}

export function weighCoffeeIot(ticketKey: string, deviceKey: string, weighingType: 'gross' | 'tare' = 'gross') {
  return apiRequest<unknown>(`/cpep/tickets/${ticketKey}/weigh/iot`, {
    method: 'POST',
    body: JSON.stringify({ deviceKey, weighingType }),
  });
}

export function listRegisteredScales(purchaseCenterId?: string) {
  const q = purchaseCenterId ? `?purchaseCenterId=${purchaseCenterId}` : '';
  return apiRequest<unknown[]>(`/cpep/scales${q}`);
}

export function upsertCoffeeScale(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/scales', { method: 'POST', body: JSON.stringify(data) });
}

export function diagnoseCoffeeScale(scaleKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/scales/${scaleKey}/diagnose`);
}

export function syncCoffeeScalesFromIot() {
  return apiRequest<unknown[]>('/cpep/scales/sync-iot', { method: 'POST' });
}

export function getWeighingMonitor() {
  return apiRequest<Record<string, unknown>>('/cpep/weighing/monitor');
}

export function listWeighingPending(purchaseCenterId?: string) {
  const q = purchaseCenterId ? `?purchaseCenterId=${purchaseCenterId}` : '';
  return apiRequest<CoffeeTicket[]>(`/cpep/weighing/pending${q}`);
}

export function listWeighingSessions(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/cpep/weighing/sessions${q}`);
}

export function getWeighingSession(sessionKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/weighing/sessions/${sessionKey}`);
}

export function listWeighingHistory(ticketKey?: string) {
  const q = ticketKey ? `?ticketKey=${ticketKey}` : '';
  return apiRequest<unknown[]>(`/cpep/weighing/history${q}`);
}

export function listWeighingAlerts(all = false) {
  return apiRequest<unknown[]>(`/cpep/weighing/alerts${all ? '?all=true' : ''}`);
}

export function startWeighingSession(ticketKey: string, data?: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/cpep/weighing/tickets/${ticketKey}/start`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function selectWeighingScale(sessionKey: string, scaleKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/scale`, {
    method: 'POST',
    body: JSON.stringify({ scaleKey }),
  });
}

export function verifyWeighingScale(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/verify`, { method: 'POST' });
}

export function captureWeighingReading(sessionKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/capture`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function confirmWeighingGross(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/confirm-gross`, { method: 'POST' });
}

export function confirmWeighingTare(sessionKey: string, skip = false) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/confirm-tare${skip ? '?skip=true' : ''}`, {
    method: 'POST',
  });
}

export function validateWeighingSession(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/validate`, { method: 'POST' });
}

export function confirmWeighingSession(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/confirm`, { method: 'POST' });
}

export function sendWeighingToQuality(sessionKey: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/to-quality`, { method: 'POST' });
}

export function enableWeighingContingency(sessionKey: string, reason: string) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/contingency`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function manualWeighingCapture(sessionKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/weighing/sessions/${sessionKey}/manual`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function syncWeighingContingency() {
  return apiRequest<unknown>('/cpep/weighing/sync-contingency', { method: 'POST' });
}

export function getCoffeePurchasesToday() {
  return apiRequest<CoffeeTicket[]>('/cpep/purchases/today');
}

export function getCoffeeKpis(days = 30) {
  return apiRequest<Record<string, unknown>>(`/cpep/kpis?days=${days}`);
}

export function getCoffeeStatistics() {
  return apiRequest<Record<string, unknown>>('/cpep/statistics');
}

export function getOpsCenter() {
  return apiRequest<Record<string, unknown>>('/cpep/ops/center');
}

export function getExecutiveDashboard() {
  return apiRequest<Record<string, unknown>>('/cpep/ops/executive');
}

export function getOperationalDashboard() {
  return apiRequest<Record<string, unknown>>('/cpep/ops/operational');
}

export function getOpsAlerts(all = false) {
  return apiRequest<unknown[]>(`/cpep/ops/alerts${all ? '?all=true' : ''}`);
}

export function evaluateOpsAlerts() {
  return apiRequest<unknown[]>('/cpep/ops/alerts/evaluate', { method: 'POST' });
}

export function acknowledgeOpsAlert(alertKey: string) {
  return apiRequest<unknown>(`/cpep/ops/alerts/${alertKey}/ack`, { method: 'POST' });
}

export function getCoffeeAnalytics() {
  return apiRequest<Record<string, unknown>>('/cpep/analytics');
}

export function compareCoffeePeriods(currentDays = 30, previousDays = 30) {
  return apiRequest<Record<string, unknown>>(
    `/cpep/analytics/compare?currentDays=${currentDays}&previousDays=${previousDays}`,
  );
}

export function getAnalyticsAudit() {
  return apiRequest<unknown[]>('/cpep/analytics/audit');
}

export function listCoffeeReports() {
  return apiRequest<unknown[]>('/cpep/reports');
}

export function getCoffeeReport(reportKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/reports/${reportKey}`);
}

export function generateCoffeeReport(data: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/cpep/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateCustomCoffeeReport(data: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/cpep/reports/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function downloadReportExport(report: Record<string, unknown>) {
  const format = String(report.format ?? 'csv');
  const payload = String(report.exportPayload ?? '');
  const mime =
    format === 'pdf'
      ? 'application/pdf'
      : format === 'excel'
        ? 'application/vnd.ms-excel'
        : format === 'csv'
          ? 'text/csv'
          : 'application/json';
  const blob = new Blob([payload], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${String(report.reportKey ?? 'report')}.${format === 'excel' ? 'csv' : format === 'json' ? 'json' : format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getCoffeeConfigCenter() {
  return apiRequest<Record<string, unknown>>('/cpep/config/center');
}

export function seedCoffeeConfig() {
  return apiRequest<unknown>('/cpep/config/seed', { method: 'POST' });
}

export function listCoffeeCatalogs(catalogKey?: string, all = false) {
  const params = new URLSearchParams();
  if (catalogKey) params.set('catalogKey', catalogKey);
  if (all) params.set('all', 'true');
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/cpep/config/catalogs${q}`);
}

export function listCoffeeCatalogKeys() {
  return apiRequest<string[]>('/cpep/config/catalogs/keys');
}

export function upsertCoffeeCatalog(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/config/catalogs', { method: 'POST', body: JSON.stringify(data) });
}

export function listCoffeeParameters(parameterKey?: string) {
  const q = parameterKey ? `?parameterKey=${parameterKey}` : '';
  return apiRequest<unknown[]>(`/cpep/config/parameters${q}`);
}

export function upsertCoffeeParameter(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/config/parameters', { method: 'POST', body: JSON.stringify(data) });
}

export function listCoffeeReceptionRules() {
  return apiRequest<unknown[]>('/cpep/config/reception-rules');
}

export function upsertCoffeeReceptionRule(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/config/reception-rules', { method: 'POST', body: JSON.stringify(data) });
}

export function validateCoffeeReception(data: Record<string, unknown>) {
  return apiRequest<{ valid: boolean; violations: string[] }>('/cpep/config/reception-rules/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listCoffeePurchaseCenters(all = false) {
  return apiRequest<unknown[]>(`/cpep/config/purchase-centers${all ? '?all=true' : ''}`);
}

export function upsertCoffeePurchaseCenter(data: Record<string, unknown>) {
  return apiRequest<unknown>('/cpep/config/purchase-centers', { method: 'POST', body: JSON.stringify(data) });
}

export function listCoffeeConfigChanges(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/cpep/config/changes${q}`);
}

export function wizardSearchProducers(q: string, method?: string) {
  const params = new URLSearchParams({ q });
  if (method) params.set('method', method);
  return apiRequest<unknown[]>(`/cpep/wizard/search?${params}`);
}

export function wizardArrival(data: Record<string, unknown>) {
  return apiRequest<CoffeeTicket>('/cpep/wizard/arrival', { method: 'POST', body: JSON.stringify(data) });
}

export function getWizardState(ticketKey: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/wizard/${ticketKey}`);
}

export function wizardSetProducer(ticketKey: string, producerId: string) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/producer`, {
    method: 'POST',
    body: JSON.stringify({ producerId }),
  });
}

export function wizardSetOrigin(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/origin`, { method: 'POST', body: JSON.stringify(data) });
}

export function wizardSetVehicle(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/vehicle`, { method: 'POST', body: JSON.stringify(data) });
}

export function wizardAddPhoto(ticketKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/photos`, { method: 'POST', body: JSON.stringify(data) });
}

export function wizardAssignTurn(ticketKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/turn`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function wizardConfirm(ticketKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/confirm`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function wizardToWeighing(ticketKey: string) {
  return apiRequest<unknown>(`/cpep/wizard/${ticketKey}/to-weighing`, { method: 'POST' });
}

export function validateCoffeeGate(data: Record<string, unknown>) {
  return apiRequest<{ allowed: boolean; checks: Array<Record<string, unknown>> }>('/cpep/gate/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listCoffeeTurnsQueue() {
  return apiRequest<CoffeeTicket[]>('/cpep/turns/queue');
}

export function callNextCoffeeTurn() {
  return apiRequest<unknown>('/cpep/turns/call-next', { method: 'POST' });
}

export function callCoffeeTurn(ticketKey: string) {
  return apiRequest<unknown>(`/cpep/turns/${ticketKey}/call`, { method: 'POST' });
}

export function setCoffeeTurnPriority(ticketKey: string, priority: number, preferential = false) {
  return apiRequest<unknown>(`/cpep/turns/${ticketKey}/priority`, {
    method: 'POST',
    body: JSON.stringify({ priority, preferential }),
  });
}

export function reorderCoffeeTurns(orderedTicketKeys: string[]) {
  return apiRequest<unknown>('/cpep/turns/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedTicketKeys }),
  });
}

export function getCoffeeTurnMetrics() {
  return apiRequest<Record<string, unknown>>('/cpep/turns/metrics');
}

export function getCoffeeTurnHistory() {
  return apiRequest<unknown[]>('/cpep/turns/history');
}

export function getPublicCoffeeTurns(organizationId: string) {
  return apiRequest<Record<string, unknown>>(`/cpep/turns/public/${organizationId}`);
}



