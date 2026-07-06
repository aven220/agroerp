export type EscmCustomerTypeValue =
  | 'individual'
  | 'company'
  | 'cooperative'
  | 'exporter'
  | 'distributor'
  | 'wholesaler'
  | 'retailer'
  | 'international';

export type EscmCustomerStatusValue =
  | 'prospect'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'blocked';

const STATUS_TRANSITIONS: Record<EscmCustomerStatusValue, EscmCustomerStatusValue[]> = {
  prospect: ['active', 'inactive', 'blocked'],
  active: ['inactive', 'suspended', 'blocked'],
  inactive: ['active', 'prospect'],
  suspended: ['active', 'inactive', 'blocked'],
  blocked: ['inactive', 'suspended'],
};

export function generateCustomerKey(type: EscmCustomerTypeValue, seq: number): string {
  const prefix = type.slice(0, 3).toUpperCase();
  return `CUS-${prefix}-${String(seq).padStart(6, '0')}`;
}

export function generateContactKey(customerKey: string, seq: number): string {
  return `CTC-${customerKey.slice(0, 12)}-${seq}`;
}

export function generateAddressKey(customerKey: string, type: string, seq: number): string {
  return `ADR-${type.slice(0, 3).toUpperCase()}-${customerKey.slice(0, 8)}-${seq}`;
}

export function generateVisitKey(customerKey: string): string {
  return `VST-${customerKey}-${Date.now()}`;
}

export function generateHistoryKey(customerKey: string, seq: number): string {
  return `HIS-${customerKey.slice(0, 12)}-${seq}`;
}

export function canTransitionStatus(
  from: EscmCustomerStatusValue,
  to: EscmCustomerStatusValue,
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateCustomerInput(input: {
  legalName?: string;
  customerType?: string;
  documentNumber?: string;
  creditLimit?: number;
  creditUsed?: number;
}): string | null {
  if (!input.legalName?.trim()) return 'Nombre legal requerido';
  if (!input.customerType) return 'Tipo de cliente requerido';
  if (input.creditLimit != null && input.creditLimit < 0) return 'Límite de crédito inválido';
  if (
    input.creditLimit != null &&
    input.creditUsed != null &&
    input.creditUsed > input.creditLimit
  ) {
    return 'Crédito utilizado excede el límite';
  }
  return null;
}

export function classifyCustomer(input: {
  lifetimeValue: number;
  lastPurchaseAt?: Date | null;
  status: EscmCustomerStatusValue;
}): string {
  if (input.status === 'inactive') return 'inactive';
  if (input.status === 'prospect') return 'prospect';
  if (!input.lastPurchaseAt) return 'prospect';
  const days = Math.floor((Date.now() - input.lastPurchaseAt.getTime()) / 86400000);
  if (days > 365) return 'dormant';
  if (input.lifetimeValue >= 100000000) return 'strategic';
  if (input.lifetimeValue >= 10000000) return 'premium';
  return 'standard';
}

export function mergeOfflineVisits<T extends { visitKey: string; visitedAt: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const map = new Map(existing.map((v) => [v.visitKey, v]));
  for (const v of incoming) {
    const prev = map.get(v.visitKey);
    if (!prev || v.visitedAt > prev.visitedAt) map.set(v.visitKey, v);
  }
  return [...map.values()].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
}
