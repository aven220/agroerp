import { checkCreditAvailable } from './escm-pricing.engine';

export type ValidationCheck = {
  key: string;
  passed: boolean;
  severity: 'error' | 'warning';
  message: string;
  details?: Record<string, unknown>;
};

export type OrderValidationInput = {
  customerStatus: string;
  creditLimit: number;
  creditUsed: number;
  orderTotal: number;
  creditCheckEnabled: boolean;
  lines: Array<{
    itemKey: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    resolvedPrice?: number | null;
    availableQty?: number;
    reservedQty?: number;
    blockedQty?: number;
  }>;
  maxDiscountPct: number;
  userCanOverrideDiscount: boolean;
  userCanCreateOrder: boolean;
  commercialPolicyOk: boolean;
};

export function validateCustomerStatus(status: string): ValidationCheck {
  const ok = status === 'active' || status === 'prospect';
  return {
    key: 'customer_status',
    passed: ok,
    severity: 'error',
    message: ok ? 'Cliente activo' : `Cliente en estado ${status}`,
    details: { status },
  };
}

export function validateCredit(input: {
  limit: number;
  used: number;
  amount: number;
  enabled: boolean;
}): ValidationCheck {
  if (!input.enabled) {
    return { key: 'credit_limit', passed: true, severity: 'warning', message: 'Validación de crédito deshabilitada' };
  }
  const ok = checkCreditAvailable(input.limit, input.used, input.amount);
  return {
    key: 'credit_limit',
    passed: ok,
    severity: 'error',
    message: ok ? 'Crédito disponible' : 'Pedido excede límite de crédito',
    details: { limit: input.limit, used: input.used, amount: input.amount, available: input.limit - input.used },
  };
}

export function validateInventoryLine(line: {
  itemKey: string;
  quantity: number;
  availableQty?: number;
  blockedQty?: number;
}): ValidationCheck {
  const available = line.availableQty ?? 0;
  const blocked = line.blockedQty ?? 0;
  const effective = Math.max(0, available - blocked);
  const ok = effective >= line.quantity;
  return {
    key: `inventory_${line.itemKey}`,
    passed: ok,
    severity: ok ? 'warning' : 'error',
    message: ok
      ? `Stock disponible para ${line.itemKey}`
      : `Stock insuficiente para ${line.itemKey} (${effective} < ${line.quantity})`,
    details: { itemKey: line.itemKey, available: effective, required: line.quantity, blocked },
  };
}

export function validatePriceLine(line: {
  itemKey: string;
  unitPrice: number;
  resolvedPrice?: number | null;
}): ValidationCheck {
  if (line.resolvedPrice == null) {
    return { key: `price_${line.itemKey}`, passed: true, severity: 'warning', message: 'Precio sin referencia de lista' };
  }
  const ok = Math.abs(line.unitPrice - line.resolvedPrice) < 0.01;
  return {
    key: `price_${line.itemKey}`,
    passed: ok,
    severity: ok ? 'warning' : 'error',
    message: ok ? 'Precio vigente' : `Precio no vigente para ${line.itemKey}`,
    details: { unitPrice: line.unitPrice, resolvedPrice: line.resolvedPrice },
  };
}

export function validateDiscountLine(line: {
  itemKey: string;
  discountPct: number;
  maxDiscountPct: number;
  canOverride: boolean;
}): ValidationCheck {
  const ok = line.discountPct <= line.maxDiscountPct || line.canOverride;
  return {
    key: `discount_${line.itemKey}`,
    passed: ok,
    severity: ok ? 'warning' : 'error',
    message: ok ? 'Descuento autorizado' : `Descuento excede máximo (${line.discountPct}% > ${line.maxDiscountPct}%)`,
    details: { discountPct: line.discountPct, maxDiscountPct: line.maxDiscountPct },
  };
}

export function validateUserPermission(canCreate: boolean): ValidationCheck {
  return {
    key: 'user_permission',
    passed: canCreate,
    severity: 'error',
    message: canCreate ? 'Usuario autorizado' : 'Usuario sin permiso para pedidos',
  };
}

export function validateCommercialPolicy(ok: boolean): ValidationCheck {
  return {
    key: 'commercial_policy',
    passed: ok,
    severity: 'error',
    message: ok ? 'Políticas comerciales cumplidas' : 'Incumplimiento de políticas comerciales',
  };
}

export function runOrderValidation(input: OrderValidationInput): {
  passed: boolean;
  hasErrors: boolean;
  checks: ValidationCheck[];
} {
  const checks: ValidationCheck[] = [
    validateUserPermission(input.userCanCreateOrder),
    validateCustomerStatus(input.customerStatus),
    validateCredit({
      limit: input.creditLimit,
      used: input.creditUsed,
      amount: input.orderTotal,
      enabled: input.creditCheckEnabled,
    }),
    validateCommercialPolicy(input.commercialPolicyOk),
  ];

  for (const line of input.lines) {
    checks.push(validateInventoryLine(line));
    checks.push(validatePriceLine(line));
    checks.push(validateDiscountLine({
      itemKey: line.itemKey,
      discountPct: line.discountPct,
      maxDiscountPct: input.maxDiscountPct,
      canOverride: input.userCanOverrideDiscount,
    }));
  }

  const hasErrors = checks.some((c) => !c.passed && c.severity === 'error');
  const passed = !hasErrors;
  return { passed, hasErrors, checks };
}
