import { computeLineTotals, computeQuotationTotals, type QuotationLineInput } from './escm-quotation.engine';

export type EscmOrderStatusValue =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'reserved'
  | 'in_preparation'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'confirmed'
  | 'in_fulfillment'
  | 'fulfilled';

export type EscmOrderTypeValue =
  | 'standard'
  | 'national'
  | 'international'
  | 'scheduled'
  | 'recurring'
  | 'partial'
  | 'consolidated';

const STATUS_ALIASES: Record<string, EscmOrderStatusValue> = {
  confirmed: 'approved',
  in_fulfillment: 'in_preparation',
  fulfilled: 'delivered',
};

export function normalizeOrderStatus(status: string): EscmOrderStatusValue {
  return (STATUS_ALIASES[status] ?? status) as EscmOrderStatusValue;
}

const TRANSITIONS: Record<EscmOrderStatusValue, EscmOrderStatusValue[]> = {
  draft: ['pending_approval', 'approved', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['reserved', 'in_preparation', 'cancelled'],
  rejected: ['draft', 'cancelled'],
  reserved: ['in_preparation', 'cancelled'],
  in_preparation: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['dispatched', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  confirmed: ['reserved', 'in_preparation', 'cancelled'],
  in_fulfillment: ['ready_for_dispatch', 'cancelled'],
  fulfilled: [],
};

export function canTransitionOrder(from: string, to: EscmOrderStatusValue): boolean {
  const normalized = normalizeOrderStatus(from);
  const allowed = TRANSITIONS[normalized] ?? [];
  return allowed.includes(to);
}

export function isTerminalOrderStatus(status: string): boolean {
  const n = normalizeOrderStatus(status);
  return n === 'delivered' || n === 'cancelled' || n === 'rejected';
}

export function isEditableOrderStatus(status: string): boolean {
  const n = normalizeOrderStatus(status);
  return n === 'draft' || n === 'rejected';
}

export function resolveOrderType(input: {
  orderType?: EscmOrderTypeValue;
  countryCode?: string;
  scheduledAt?: Date | string | null;
  recurrenceKey?: string | null;
  parentOrderId?: string | null;
  consolidationKey?: string | null;
}): EscmOrderTypeValue {
  if (input.consolidationKey) return 'consolidated';
  if (input.parentOrderId) return 'partial';
  if (input.recurrenceKey) return 'recurring';
  if (input.scheduledAt) return 'scheduled';
  if (input.orderType) return input.orderType;
  if (input.countryCode && input.countryCode !== 'CO') return 'international';
  return 'standard';
}

export function computeOrderTotals(
  lines: QuotationLineInput[],
  headerDiscountPct = 0,
) {
  return computeQuotationTotals(lines, headerDiscountPct);
}

export function generateApprovalKey(seq: number): string {
  return `APR-${String(seq).padStart(6, '0')}`;
}

export function generateConsolidationKey(seq: number): string {
  return `CONS-${String(seq).padStart(6, '0')}`;
}

export function generateRecurrenceKey(seq: number): string {
  return `REC-${String(seq).padStart(6, '0')}`;
}

export function compareOrderPriority(a: { priority: number; createdAt: Date }, b: { priority: number; createdAt: Date }): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function mapStatusToLegacy(status: EscmOrderStatusValue): EscmOrderStatusValue {
  if (status === 'approved') return 'confirmed';
  if (status === 'in_preparation') return 'in_fulfillment';
  if (status === 'delivered') return 'fulfilled';
  return status;
}
