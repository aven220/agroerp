import { apiRequest } from './client';

export function getEscmCenter() {
  return apiRequest<Record<string, unknown>>('/escm/center');
}

export function seedEscm() {
  return apiRequest<unknown>('/escm/seed', { method: 'POST' });
}

export function listEscmCatalogKeys() {
  return apiRequest<string[]>('/escm/catalogs/keys');
}

export function listEscmCatalogs(catalogKey?: string, all = false) {
  const params = new URLSearchParams();
  if (catalogKey) params.set('catalogKey', catalogKey);
  if (all) params.set('all', 'true');
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/catalogs${q}`);
}

export function upsertEscmCatalog(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/catalogs', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmParameters() {
  return apiRequest<unknown[]>('/escm/parameters');
}

export function upsertEscmParameter(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/parameters', { method: 'POST', body: JSON.stringify(data) });
}

export function getEscmAudit() {
  return apiRequest<unknown[]>('/escm/audit');
}

export function listEscmCustomers(filters?: {
  status?: string;
  customerType?: string;
  segmentKey?: string;
  channelKey?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerType) params.set('customerType', filters.customerType);
  if (filters?.segmentKey) params.set('segmentKey', filters.segmentKey);
  if (filters?.channelKey) params.set('channelKey', filters.channelKey);
  if (filters?.q) params.set('q', filters.q);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/customers${q}`);
}

export function getEscmCustomer(customerKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/customers/${encodeURIComponent(customerKey)}`);
}

export function createEscmCustomer(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/customers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEscmCustomer(customerKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function addEscmContact(customerKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addEscmAddress(customerKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function recordEscmVisit(customerKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/visits`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getEscmCrmPanel(customerKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/crm/${encodeURIComponent(customerKey)}`);
}

export function getEscmCommercialHistory(customerKey?: string) {
  const q = customerKey ? `?customerKey=${encodeURIComponent(customerKey)}` : '';
  return apiRequest<unknown[]>(`/escm/history${q}`);
}

export function listEscmPriceLists() {
  return apiRequest<unknown[]>('/escm/price-lists');
}

export function getEscmPriceList(priceListKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/price-lists/${encodeURIComponent(priceListKey)}`);
}

export function upsertEscmPriceList(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/price-lists', { method: 'POST', body: JSON.stringify(data) });
}

export function upsertEscmPriceListItem(priceListKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/price-lists/${encodeURIComponent(priceListKey)}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function resolveEscmPrice(data: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/escm/pricing/resolve', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listEscmConditions(customerKey?: string) {
  const q = customerKey ? `?customerKey=${encodeURIComponent(customerKey)}` : '';
  return apiRequest<unknown[]>(`/escm/conditions${q}`);
}

export function upsertEscmCondition(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/conditions', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmDiscountRules() {
  return apiRequest<unknown[]>('/escm/discount-rules');
}

export function upsertEscmDiscountRule(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/discount-rules', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmPromotions() {
  return apiRequest<unknown[]>('/escm/promotions');
}

export function upsertEscmPromotion(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/promotions', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmCreditPolicies() {
  return apiRequest<unknown[]>('/escm/credit-policies');
}

export function upsertEscmCreditPolicy(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/credit-policies', { method: 'POST', body: JSON.stringify(data) });
}

export function upsertEscmCustomerPricing(
  customerKey: string,
  data: { itemKey: string; unitPrice: number; currencyKey?: string },
) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/pricing`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function upsertEscmRegionalPricing(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/pricing/regional', { method: 'POST', body: JSON.stringify(data) });
}

export function upsertEscmSeasonPricing(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/pricing/season', { method: 'POST', body: JSON.stringify(data) });
}

export function upsertEscmCreditLimit(
  customerKey: string,
  data: { creditLimit: number; currencyKey?: string },
) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/credit-limit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getEscmCrmDashboard() {
  return apiRequest<Record<string, unknown>>('/escm/crm/dashboard');
}

export function getEscmCustomerTimeline(customerKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/crm/timeline/${encodeURIComponent(customerKey)}`);
}

export function getEscmPipeline() {
  return apiRequest<Record<string, unknown>>('/escm/pipeline');
}

export function listEscmPipelineStages() {
  return apiRequest<unknown[]>('/escm/pipeline/stages');
}

export function seedEscmPipeline() {
  return apiRequest<unknown>('/escm/pipeline/seed', { method: 'POST' });
}

export function listEscmProspects(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/escm/prospects${q}`);
}

export function createEscmProspect(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/prospects', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmOpportunities(filters?: { status?: string; stageKey?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.stageKey) params.set('stageKey', filters.stageKey);
  if (filters?.q) params.set('q', filters.q);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/opportunities${q}`);
}

export function createEscmOpportunity(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/opportunities', { method: 'POST', body: JSON.stringify(data) });
}

export function changeEscmOpportunityStage(opportunityKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/opportunities/${encodeURIComponent(opportunityKey)}/stage`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listEscmActivities(filters?: { status?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/activities${q}`);
}

export function createEscmActivity(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/activities', { method: 'POST', body: JSON.stringify(data) });
}

export function completeEscmActivity(activityKey: string) {
  return apiRequest<unknown>(`/escm/activities/${encodeURIComponent(activityKey)}/complete`, { method: 'POST' });
}

export function recordEscmInteraction(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/interactions', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmQuotations(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/quotations${q}`);
}

export function getEscmQuotation(quotationKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/quotations/${encodeURIComponent(quotationKey)}`);
}

export function createEscmQuotation(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/quotations', { method: 'POST', body: JSON.stringify(data) });
}

export function versionEscmQuotation(quotationKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/quotations/${encodeURIComponent(quotationKey)}/version`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function duplicateEscmQuotation(quotationKey: string) {
  return apiRequest<unknown>(`/escm/quotations/${encodeURIComponent(quotationKey)}/duplicate`, { method: 'POST' });
}

export function simulateEscmQuotation(data: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/escm/quotations/simulate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function approveEscmQuotation(quotationKey: string, signatureUrl?: string) {
  return apiRequest<unknown>(`/escm/quotations/${encodeURIComponent(quotationKey)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ signatureUrl }),
  });
}

export function rejectEscmQuotation(quotationKey: string, rejectionReason?: string) {
  return apiRequest<unknown>(`/escm/quotations/${encodeURIComponent(quotationKey)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
}

export function convertEscmQuotation(quotationKey: string, data?: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/escm/quotations/${encodeURIComponent(quotationKey)}/convert`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function listEscmOrders(filters?: { status?: string; customerKey?: string; orderType?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  if (filters?.orderType) params.set('orderType', filters.orderType);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/orders${q}`);
}

export function getEscmOrderCenter() {
  return apiRequest<Record<string, unknown>>('/escm/orders/center');
}

export function getEscmOrder(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/orders/${encodeURIComponent(orderKey)}`);
}

export function getEscmOrderTracking(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/orders/${encodeURIComponent(orderKey)}/tracking`);
}

export function createEscmOrder(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/orders', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEscmOrder(orderKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function validateEscmOrder(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/orders/${encodeURIComponent(orderKey)}/validate`, { method: 'POST' });
}

export function submitEscmOrder(orderKey: string) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/submit`, { method: 'POST', body: '{}' });
}

export function transitionEscmOrder(orderKey: string, toStatus: string, reason?: string) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/transition`, {
    method: 'POST',
    body: JSON.stringify({ toStatus, reason }),
  });
}

export function cancelEscmOrder(orderKey: string, reason?: string) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function consolidateEscmOrders(orderKeys: string[]) {
  return apiRequest<unknown>('/escm/orders/consolidate', {
    method: 'POST',
    body: JSON.stringify({ orderKeys }),
  });
}

export function listEscmPendingApprovals() {
  return apiRequest<unknown[]>('/escm/approvals/pending');
}

export function approveEscmOrder(approvalKey: string, comments?: string) {
  return apiRequest<unknown>(`/escm/approvals/${encodeURIComponent(approvalKey)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function rejectEscmOrder(approvalKey: string, comments?: string) {
  return apiRequest<unknown>(`/escm/approvals/${encodeURIComponent(approvalKey)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function listEscmReservations(filters?: { customerKey?: string; documentKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  if (filters?.documentKey) params.set('documentKey', filters.documentKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/reservations${q}`);
}

export function reserveEscmOrder(orderKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/reserve`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function getEscmLogisticsCenter() {
  return apiRequest<Record<string, unknown>>('/escm/logistics/center');
}

export function listEscmDispatches(filters?: { status?: string; orderKey?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.orderKey) params.set('orderKey', filters.orderKey);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/dispatches${q}`);
}

export function getEscmDispatch(dispatchKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/dispatches/${encodeURIComponent(dispatchKey)}`);
}

export function getEscmDispatchTracking(dispatchKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/dispatches/${encodeURIComponent(dispatchKey)}/tracking`);
}

export function createEscmDispatch(orderKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function shipEscmDispatch(dispatchKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/dispatches/${encodeURIComponent(dispatchKey)}/ship`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function listEscmRoutes(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/escm/routes${q}`);
}

export function getEscmRoute(routeKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/routes/${encodeURIComponent(routeKey)}`);
}

export function createEscmRoute(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/routes', { method: 'POST', body: JSON.stringify(data) });
}

export function startEscmRoute(routeKey: string) {
  return apiRequest<unknown>(`/escm/routes/${encodeURIComponent(routeKey)}/start`, { method: 'POST', body: '{}' });
}

export function listEscmDeliveries(filters?: { orderKey?: string; outcome?: string }) {
  const params = new URLSearchParams();
  if (filters?.orderKey) params.set('orderKey', filters.orderKey);
  if (filters?.outcome) params.set('outcome', filters.outcome);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/deliveries${q}`);
}

export function registerEscmDelivery(dispatchKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/dispatches/${encodeURIComponent(dispatchKey)}/deliver`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listEscmIncidents(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/escm/incidents${q}`);
}

export function reportEscmIncident(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/incidents', { method: 'POST', body: JSON.stringify(data) });
}

export function listEscmPickWaves(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/escm/pick-waves${q}`);
}

export function createEscmPickWave(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/pick-waves', { method: 'POST', body: JSON.stringify(data) });
}

export function getEscmQuotationVersions(quoteGroupKey: string) {
  return apiRequest<unknown[]>(`/escm/quotations/group/${encodeURIComponent(quoteGroupKey)}/versions`);
}

export function getEscmBillingCenter() {
  return apiRequest<Record<string, unknown>>('/escm/billing/center');
}

export function getEscmBillingHistory(filters?: { customerKey?: string; documentKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  if (filters?.documentKey) params.set('documentKey', filters.documentKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/billing/history${q}`);
}

export function listEscmInvoices(filters?: { status?: string; customerKey?: string; orderKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  if (filters?.orderKey) params.set('orderKey', filters.orderKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/invoices${q}`);
}

export function getEscmInvoice(invoiceKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/invoices/${encodeURIComponent(invoiceKey)}`);
}

export function issueEscmInvoice(invoiceKey: string) {
  return apiRequest<unknown>(`/escm/invoices/${encodeURIComponent(invoiceKey)}/issue`, { method: 'POST', body: '{}' });
}

export function voidEscmInvoice(invoiceKey: string, reason: string) {
  return apiRequest<unknown>(`/escm/invoices/${encodeURIComponent(invoiceKey)}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function invoiceEscmOrder(orderKey: string, data?: Record<string, unknown>) {
  return apiRequest<unknown>(`/escm/orders/${encodeURIComponent(orderKey)}/invoice`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function listEscmReturns(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/returns${q}`);
}

export function approveEscmReturn(returnKey: string) {
  return apiRequest<unknown>(`/escm/returns/${encodeURIComponent(returnKey)}/approve`, { method: 'POST', body: '{}' });
}

export function processEscmReturn(returnKey: string) {
  return apiRequest<unknown>(`/escm/returns/${encodeURIComponent(returnKey)}/process`, { method: 'POST', body: '{}' });
}

export function listEscmWarranties(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/warranties${q}`);
}

export function approveEscmWarranty(claimKey: string, resolutionType: 'replacement' | 'repair') {
  return apiRequest<unknown>(`/escm/warranties/${encodeURIComponent(claimKey)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionType }),
  });
}

export function listEscmCreditNotes(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/credit-notes${q}`);
}

export function issueEscmCreditNote(creditNoteKey: string) {
  return apiRequest<unknown>(`/escm/credit-notes/${encodeURIComponent(creditNoteKey)}/issue`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEscmDebitNotes(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/debit-notes${q}`);
}

export function listEscmBillingDocuments(filters?: { documentType?: string; referenceKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.documentType) params.set('documentType', filters.documentType);
  if (filters?.referenceKey) params.set('referenceKey', filters.referenceKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/billing-documents${q}`);
}

export function listEscmTaxRules(ruleType?: string) {
  const q = ruleType ? `?ruleType=${encodeURIComponent(ruleType)}` : '';
  return apiRequest<unknown[]>(`/escm/tax-rules${q}`);
}

export function getEscmArCenter() {
  return apiRequest<Record<string, unknown>>('/escm/ar/center');
}

export function listEscmReceivables(filters?: { status?: string; customerKey?: string; overdue?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  if (filters?.overdue) params.set('overdue', 'true');
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/receivables${q}`);
}

export function listEscmPayments(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/payments${q}`);
}

export function registerEscmPayment(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/payments', { method: 'POST', body: JSON.stringify(data) });
}

export function reconcileEscmPayment(paymentKey: string, bankRef?: string) {
  return apiRequest<unknown>(`/escm/payments/${encodeURIComponent(paymentKey)}/reconcile`, {
    method: 'POST',
    body: JSON.stringify({ bankRef }),
  });
}

export function sendEscmReminder(receivableKey: string, channel?: 'email' | 'reminder') {
  return apiRequest<unknown>(`/escm/receivables/${encodeURIComponent(receivableKey)}/remind`, {
    method: 'POST',
    body: JSON.stringify({ channel }),
  });
}

export function listEscmCollectionActivities(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/collection/activities${q}`);
}

export function createEscmCampaign(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/collection/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

export function activateEscmCampaign(campaignKey: string) {
  return apiRequest<unknown>(`/escm/collection/campaigns/${encodeURIComponent(campaignKey)}/activate`, {
    method: 'POST',
    body: '{}',
  });
}

export function runEscmAutoReminders() {
  return apiRequest<unknown>('/escm/collection/auto-reminders', { method: 'POST', body: '{}' });
}

export function listEscmAgreements(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/agreements${q}`);
}

export function listEscmPromises(filters?: { status?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/promises${q}`);
}

export function generateEscmStatement(customerKey: string) {
  return apiRequest<unknown>(`/escm/customers/${encodeURIComponent(customerKey)}/statement`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEscmArDocuments(filters?: { documentType?: string; customerKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.documentType) params.set('documentType', filters.documentType);
  if (filters?.customerKey) params.set('customerKey', filters.customerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/escm/ar/documents${q}`);
}

export function getEscmCustomerBalance(customerKey: string) {
  return apiRequest<Record<string, unknown>>(`/escm/customers/${encodeURIComponent(customerKey)}/balance`);
}

export function getEscmOpsCenter(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/center${q}`);
}

export function getEscmOpsExecutive(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/executive${q}`);
}

export function getEscmOpsCommercial(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/commercial${q}`);
}

export function getEscmOpsRegionMap() {
  return apiRequest<unknown[]>('/escm/ops/region-map');
}

export function getEscmOpsKpis(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/kpis${q}`);
}

export function getEscmOpsAnalytics(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/analytics${q}`);
}

export function getEscmOpsAiInsights() {
  return apiRequest<Record<string, unknown>>('/escm/ops/ai/insights');
}

export function listEscmOpsAlerts(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/escm/ops/alerts${q}`);
}

export function evaluateEscmOpsAlerts() {
  return apiRequest<unknown>('/escm/ops/alerts/evaluate', { method: 'POST', body: '{}' });
}

export function acknowledgeEscmOpsAlert(alertKey: string) {
  return apiRequest<unknown>(`/escm/ops/alerts/${encodeURIComponent(alertKey)}/acknowledge`, {
    method: 'POST',
    body: '{}',
  });
}

export function resolveEscmOpsAlert(alertKey: string) {
  return apiRequest<unknown>(`/escm/ops/alerts/${encodeURIComponent(alertKey)}/resolve`, {
    method: 'POST',
    body: '{}',
  });
}

export function generateEscmReport(reportType: string, filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null) params.set(k, String(v));
    });
  }
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/escm/ops/reports/${encodeURIComponent(reportType)}${q}`);
}

export function exportEscmReport(reportType: string, format: 'csv' | 'excel' | 'pdf', filters?: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/escm/ops/reports/export', {
    method: 'POST',
    body: JSON.stringify({ reportType, format, filters }),
  });
}

export function listEscmReportRuns(reportType?: string) {
  const q = reportType ? `?reportType=${encodeURIComponent(reportType)}` : '';
  return apiRequest<unknown[]>(`/escm/ops/reports/runs${q}`);
}

export function listEscmCustomReports() {
  return apiRequest<unknown[]>('/escm/ops/custom-reports');
}

export function createEscmCustomReport(data: Record<string, unknown>) {
  return apiRequest<unknown>('/escm/ops/custom-reports', { method: 'POST', body: JSON.stringify(data) });
}

export function runEscmCustomReport(reportKey: string) {
  return apiRequest<unknown>(`/escm/ops/custom-reports/${encodeURIComponent(reportKey)}/run`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEscmAnalyticsAudit() {
  return apiRequest<unknown[]>('/escm/ops/analytics/audit');
}

export function downloadEscmExport(result: { content: string; mimeType: string; extension: string; runKey: string }) {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.runKey}.${result.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

