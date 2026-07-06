import { apiRequest } from './client';

export function getEimsCenter() {
  return apiRequest<Record<string, unknown>>('/eims/center');
}

export function seedEims() {
  return apiRequest<unknown>('/eims/seed', { method: 'POST' });
}

export function listEimsCatalogKeys() {
  return apiRequest<string[]>('/eims/catalogs/keys');
}

export function listEimsCatalogs(catalogKey?: string, all = false) {
  const params = new URLSearchParams();
  if (catalogKey) params.set('catalogKey', catalogKey);
  if (all) params.set('all', 'true');
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/catalogs${q}`);
}

export function upsertEimsCatalog(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/catalogs', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsParameters() {
  return apiRequest<unknown[]>('/eims/parameters');
}

export function upsertEimsParameter(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/parameters', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsWarehouses(all = false) {
  return apiRequest<unknown[]>(`/eims/warehouses${all ? '?all=true' : ''}`);
}

export function upsertEimsWarehouse(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/warehouses', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsLocations(warehouseKey?: string) {
  const q = warehouseKey ? `?warehouseKey=${warehouseKey}` : '';
  return apiRequest<unknown[]>(`/eims/locations${q}`);
}

export function upsertEimsLocation(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/locations', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsItems(filters?: { itemTypeKey?: string; categoryKey?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.itemTypeKey) params.set('itemTypeKey', filters.itemTypeKey);
  if (filters?.categoryKey) params.set('categoryKey', filters.categoryKey);
  if (filters?.q) params.set('q', filters.q);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/items${q}`);
}

export function getEimsItem(itemKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/items/${itemKey}`);
}

export function getEimsItemByCode(code: string) {
  return apiRequest<Record<string, unknown>>(`/eims/items/code/${encodeURIComponent(code)}`);
}

export function upsertEimsItem(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/items', { method: 'POST', body: JSON.stringify(data) });
}

export function addEimsItemPhoto(itemKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eims/items/${itemKey}/photos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getEimsAudit() {
  return apiRequest<unknown[]>('/eims/audit');
}

export function listEimsMovements(filters?: {
  itemKey?: string;
  warehouseKey?: string;
  lotKey?: string;
  movementType?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.warehouseKey) params.set('warehouseKey', filters.warehouseKey);
  if (filters?.lotKey) params.set('lotKey', filters.lotKey);
  if (filters?.movementType) params.set('movementType', filters.movementType);
  if (filters?.status) params.set('status', filters.status);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/movements${q}`);
}

export function getEimsMovementMonitor() {
  return apiRequest<Record<string, unknown>>('/eims/movements/monitor');
}

export function postEimsMovement(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/movements', { method: 'POST', body: JSON.stringify(data) });
}

export function postEimsMovementBatch(movements: Array<Record<string, unknown>>) {
  return apiRequest<unknown>('/eims/movements/batch', {
    method: 'POST',
    body: JSON.stringify({ movements }),
  });
}

export function importEimsMovementsCsv(csv: string) {
  return apiRequest<unknown>('/eims/movements/import', {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });
}

export function voidEimsMovement(movementKey: string, reason: string) {
  return apiRequest<unknown>(`/eims/movements/${movementKey}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function listEimsStock(filters?: { itemKey?: string; warehouseKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.warehouseKey) params.set('warehouseKey', filters.warehouseKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/stock${q}`);
}

export function listEimsKardex(filters?: { itemKey?: string; warehouseKey?: string; lotKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.warehouseKey) params.set('warehouseKey', filters.warehouseKey);
  if (filters?.lotKey) params.set('lotKey', filters.lotKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/kardex${q}`);
}

export function getEimsCostHistory(itemKey?: string) {
  const q = itemKey ? `?itemKey=${itemKey}` : '';
  return apiRequest<unknown[]>(`/eims/costs/history${q}`);
}

export function getEimsInventoryValue() {
  return apiRequest<Record<string, unknown>>('/eims/costs/value');
}

export function compareEimsValuationMethods(itemKey: string, warehouseKey: string) {
  return apiRequest<Record<string, unknown>>(
    `/eims/costs/compare?itemKey=${encodeURIComponent(itemKey)}&warehouseKey=${encodeURIComponent(warehouseKey)}`,
  );
}

export function listEimsPeriods() {
  return apiRequest<unknown[]>('/eims/periods');
}

export function closeEimsPeriod(periodType: string, refDate?: string) {
  return apiRequest<unknown>('/eims/periods/close', {
    method: 'POST',
    body: JSON.stringify({ periodType, refDate }),
  });
}

export function reopenEimsPeriod(periodKey: string, reason: string) {
  return apiRequest<unknown>(`/eims/periods/${periodKey}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function recalculateEimsPeriod(periodKey: string, reason: string) {
  return apiRequest<unknown>(`/eims/periods/${periodKey}/recalculate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function getEimsFinancialReport() {
  return apiRequest<Record<string, unknown>>('/eims/reports/financial');
}

export function listEimsLots(filters?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v != null && v !== '') params.set(k, String(v));
    }
  }
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/lots${q}`);
}

export function getEimsLot(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/lots/${encodeURIComponent(lotKey)}`);
}

export function getEimsLotByCode(code: string) {
  return apiRequest<Record<string, unknown>>(`/eims/lots/code/${encodeURIComponent(code)}`);
}

export function getEimsLot360(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/lots/${encodeURIComponent(lotKey)}/360`);
}

export function getEimsLotGenealogy(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/lots/${encodeURIComponent(lotKey)}/genealogy`);
}

export function getEimsLotMovementsMap(lotKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/lots/${encodeURIComponent(lotKey)}/movements-map`);
}

export function getEimsLotTimeline(lotKey: string) {
  return apiRequest<unknown[]>(`/eims/lots/${encodeURIComponent(lotKey)}/timeline`);
}

export function createEimsLot(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/lots', { method: 'POST', body: JSON.stringify(data) });
}

export function reclassifyEimsLot(lotKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eims/lots/${encodeURIComponent(lotKey)}/reclassify`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function blockExpiredEimsLots() {
  return apiRequest<unknown>('/eims/lots/block-expired', { method: 'POST', body: '{}' });
}

export function listEimsExpiryPanel() {
  return apiRequest<unknown[]>('/eims/lots/expiry');
}

export function listEimsExpiryAlerts(acknowledged?: boolean) {
  const q = acknowledged == null ? '' : `?acknowledged=${acknowledged}`;
  return apiRequest<unknown[]>(`/eims/lots/alerts${q}`);
}

export function refreshEimsExpiryAlerts() {
  return apiRequest<unknown>('/eims/lots/alerts/refresh', { method: 'POST', body: '{}' });
}

export function acknowledgeEimsAlert(alertKey: string) {
  return apiRequest<unknown>(`/eims/lots/alerts/${encodeURIComponent(alertKey)}/acknowledge`, {
    method: 'POST',
    body: '{}',
  });
}

export function registerEimsLotIncident(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/lots/incidents', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsTransformations() {
  return apiRequest<unknown[]>('/eims/lots/transformations');
}

export function postEimsTransform(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/transforms', { method: 'POST', body: JSON.stringify(data) });
}

export function splitEimsLot(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/transforms/split', { method: 'POST', body: JSON.stringify(data) });
}

export function mergeEimsLots(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/transforms/merge', { method: 'POST', body: JSON.stringify(data) });
}

export function mixEimsLots(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/transforms/mix', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsSerials(filters?: { itemKey?: string; lotKey?: string; serialType?: string }) {
  const params = new URLSearchParams();
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.lotKey) params.set('lotKey', filters.lotKey);
  if (filters?.serialType) params.set('serialType', filters.serialType);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/serials${q}`);
}

export function createEimsSerial(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/serials', { method: 'POST', body: JSON.stringify(data) });
}

export function getEimsCountsCenter() {
  return apiRequest<Record<string, unknown>>('/eims/counts/center');
}

export function listEimsCounts(filters?: { status?: string; countType?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.countType) params.set('countType', filters.countType);
  if (filters?.q) params.set('q', filters.q);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/counts${q}`);
}

export function getEimsCount(countKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/counts/${encodeURIComponent(countKey)}`);
}

export function planEimsCount(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/counts', { method: 'POST', body: JSON.stringify(data) });
}

export function assignEimsCount(countKey: string, assignees: Array<Record<string, unknown>>) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignees }),
  });
}

export function startEimsCount(countKey: string) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/start`, {
    method: 'POST',
    body: '{}',
  });
}

export function captureEimsCount(countKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/capture`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function reconcileEimsCount(countKey: string) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/reconcile`, {
    method: 'POST',
    body: '{}',
  });
}

export function getEimsCountDifferences(countKey: string) {
  return apiRequest<unknown[]>(`/eims/counts/${encodeURIComponent(countKey)}/differences`);
}

export function getEimsCountReconciliation(countKey: string) {
  return apiRequest<unknown[]>(`/eims/counts/${encodeURIComponent(countKey)}/reconciliation`);
}

export function requestAllEimsAdjustments(countKey: string) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/adjustments/request-all`, {
    method: 'POST',
    body: '{}',
  });
}

export function approveAllEimsAdjustments(countKey: string, comments?: string) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/approve-all`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function approveEimsAdjustment(
  countKey: string,
  adjustmentKey: string,
  data?: Record<string, unknown>,
) {
  return apiRequest<unknown>(
    `/eims/counts/${encodeURIComponent(countKey)}/adjustments/${encodeURIComponent(adjustmentKey)}/approve`,
    { method: 'POST', body: JSON.stringify(data ?? {}) },
  );
}

export function closeEimsCount(countKey: string, notes?: string) {
  return apiRequest<unknown>(`/eims/counts/${encodeURIComponent(countKey)}/close`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function listEimsCountHistory() {
  return apiRequest<unknown[]>('/eims/counts/history');
}

export function listEimsCountActs(countKey?: string) {
  const q = countKey ? `?countKey=${encodeURIComponent(countKey)}` : '';
  return apiRequest<unknown[]>(`/eims/counts/acts${q}`);
}

export function getEimsSupplyCenter() {
  return apiRequest<Record<string, unknown>>('/eims/supply/center');
}

export function listEimsReservations(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters ?? {});
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/reservations${q}`);
}

export function createEimsReservation(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/reservations', { method: 'POST', body: JSON.stringify(data) });
}

export function releaseEimsReservation(reservationKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/eims/reservations/${encodeURIComponent(reservationKey)}/release`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function reassignEimsReservation(reservationKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eims/reservations/${encodeURIComponent(reservationKey)}/reassign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function expireEimsReservations() {
  return apiRequest<unknown>('/eims/reservations/expire', { method: 'POST', body: '{}' });
}

export function listEimsStockLevels(filters?: { itemKey?: string; warehouseKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.warehouseKey) params.set('warehouseKey', filters.warehouseKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/supply/levels${q}`);
}

export function upsertEimsStockLevel(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/supply/levels', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsSupplyRules() {
  return apiRequest<unknown[]>('/eims/supply/rules');
}

export function upsertEimsSupplyRule(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/supply/rules', { method: 'POST', body: JSON.stringify(data) });
}

export function listEimsSupplySuggestions(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/eims/supply/suggestions${q}`);
}

export function generateEimsSupplySuggestions() {
  return apiRequest<unknown>('/eims/supply/suggestions/generate', { method: 'POST', body: '{}' });
}

export function acceptEimsSupplySuggestion(suggestionKey: string) {
  return apiRequest<unknown>(`/eims/supply/suggestions/${encodeURIComponent(suggestionKey)}/accept`, {
    method: 'POST',
    body: '{}',
  });
}

export function rejectEimsSupplySuggestion(suggestionKey: string, reason: string) {
  return apiRequest<unknown>(`/eims/supply/suggestions/${encodeURIComponent(suggestionKey)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function listEimsPlanningAlerts(acknowledged?: boolean) {
  const q = acknowledged == null ? '' : `?acknowledged=${acknowledged}`;
  return apiRequest<unknown[]>(`/eims/supply/alerts${q}`);
}

export function refreshEimsPlanningAlerts() {
  return apiRequest<unknown>('/eims/supply/alerts/evaluate', { method: 'POST', body: '{}' });
}

export function acknowledgeEimsPlanningAlert(alertKey: string) {
  return apiRequest<unknown>(`/eims/supply/alerts/${encodeURIComponent(alertKey)}/acknowledge`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEimsSupplyCalendar(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/supply/calendar${q}`);
}

export function getEimsSupplyProjection(horizonDays = 90) {
  return apiRequest<Record<string, unknown>>(`/eims/supply/projection?horizonDays=${horizonDays}`);
}

export function listEimsForecasts(filters?: { itemKey?: string; warehouseKey?: string }) {
  const params = new URLSearchParams(filters ?? {});
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/eims/planning/forecasts${q}`);
}

export function generateEimsForecasts(horizonDays = 90) {
  return apiRequest<unknown>(`/eims/planning/forecasts/generate?horizonDays=${horizonDays}`, {
    method: 'POST',
    body: '{}',
  });
}

export function getEimsPlanner() {
  return apiRequest<Record<string, unknown>>('/eims/planning/planner');
}

export function listEimsScenarios() {
  return apiRequest<unknown[]>('/eims/planning/scenarios');
}

export function createEimsScenario(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/planning/scenarios', { method: 'POST', body: JSON.stringify(data) });
}

export function simulateEimsScenario(scenarioKey: string) {
  return apiRequest<unknown>(`/eims/planning/scenarios/${encodeURIComponent(scenarioKey)}/simulate`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEimsAiInsights() {
  return apiRequest<unknown[]>('/eims/planning/ai-insights');
}

export function refreshEimsAiInsights() {
  return apiRequest<unknown>('/eims/planning/ai-insights/refresh', { method: 'POST', body: '{}' });
}

export function getEimsOpsCenter() {
  return apiRequest<Record<string, unknown>>('/eims/ops/center');
}

export function getEimsOpsKpis() {
  return apiRequest<Record<string, unknown>>('/eims/ops/kpis');
}

export function getEimsOpsAnalytics(filters?: { warehouseKey?: string; itemKey?: string; days?: number }) {
  const params = new URLSearchParams();
  if (filters?.warehouseKey) params.set('warehouseKey', filters.warehouseKey);
  if (filters?.itemKey) params.set('itemKey', filters.itemKey);
  if (filters?.days) params.set('days', String(filters.days));
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/eims/ops/analytics${q}`);
}

export function getEimsExecutiveDashboard() {
  return apiRequest<Record<string, unknown>>('/eims/ops/dashboard/executive');
}

export function getEimsOperationalDashboard() {
  return apiRequest<Record<string, unknown>>('/eims/ops/dashboard/operational');
}

export function getEimsOpsAi() {
  return apiRequest<Record<string, unknown>>('/eims/ops/ai');
}

export function getEimsWarehouseMap() {
  return apiRequest<unknown[]>('/eims/ops/warehouse-map');
}

export function listEimsOpsAlerts(acknowledged?: boolean) {
  const q = acknowledged == null ? '' : `?acknowledged=${acknowledged}`;
  return apiRequest<unknown[]>(`/eims/ops/alerts${q}`);
}

export function refreshEimsOpsAlerts() {
  return apiRequest<unknown>('/eims/ops/alerts/refresh', { method: 'POST', body: '{}' });
}

export function acknowledgeEimsOpsAlert(alertKey: string) {
  return apiRequest<unknown>(`/eims/ops/alerts/${encodeURIComponent(alertKey)}/acknowledge`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEimsReports() {
  return apiRequest<unknown[]>('/eims/ops/reports');
}

export function listEimsReportDefinitions() {
  return apiRequest<unknown[]>('/eims/ops/reports/definitions');
}

export function saveEimsReportDefinition(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eims/ops/reports/definitions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function runEimsReport(data: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/eims/ops/reports/run', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listEimsReportRuns() {
  return apiRequest<unknown[]>('/eims/ops/reports/runs');
}

export function getEimsReportRun(runKey: string) {
  return apiRequest<Record<string, unknown>>(`/eims/ops/reports/runs/${encodeURIComponent(runKey)}`);
}
