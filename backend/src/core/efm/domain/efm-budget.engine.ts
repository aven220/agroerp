export type BudgetAvailabilityInput = {
  budgetAmount: number;
  committed: number;
  obligated: number;
  executed: number;
  reserved: number;
};

export type BudgetAvailabilityResult = {
  available: number;
  utilizationPct: number;
  breakdown: {
    budget: number;
    committed: number;
    obligated: number;
    executed: number;
    reserved: number;
  };
};

export type VarianceResult = {
  budget: number;
  executed: number;
  committed: number;
  obligated: number;
  variance: number;
  variancePct: number;
  compliancePct: number;
};

export const DEFAULT_BG_CONTROL_RULES = [
  { ruleKey: 'RULE-BG-PURCHASE', name: 'Validación compras', sourceModule: 'purchase', enforceHardBlock: true, tolerancePercent: 0 },
  { ruleKey: 'RULE-BG-AP-INVOICE', name: 'Validación facturas CxP', sourceModule: 'accounts_payable', enforceHardBlock: true, tolerancePercent: 1 },
  { ruleKey: 'RULE-BG-AP-PAYMENT', name: 'Validación pagos', sourceModule: 'payment', enforceHardBlock: true, tolerancePercent: 0 },
  { ruleKey: 'RULE-BG-TREASURY', name: 'Validación tesorería', sourceModule: 'treasury', enforceHardBlock: false, tolerancePercent: 2 },
  { ruleKey: 'RULE-BG-CONTRACT', name: 'Validación contratos', sourceModule: 'contract', enforceHardBlock: true, tolerancePercent: 0 },
] as const;

export const DEFAULT_BG_DIMENSIONS = [
  { nodeKey: 'BU-OPS', dimensionType: 'business_unit', code: 'OPS', name: 'Operaciones' },
  { nodeKey: 'BU-CORP', dimensionType: 'business_unit', code: 'CORP', name: 'Corporativo' },
  { nodeKey: 'AR-ADMIN', dimensionType: 'area', code: 'ADMIN', name: 'Administración', parentKey: 'BU-CORP' },
  { nodeKey: 'AR-FIN', dimensionType: 'area', code: 'FIN', name: 'Finanzas', parentKey: 'BU-CORP' },
  { nodeKey: 'AR-PROD', dimensionType: 'area', code: 'PROD', name: 'Producción', parentKey: 'BU-OPS' },
  { nodeKey: 'PR-PROC', dimensionType: 'process', code: 'PROC', name: 'Procesamiento', parentKey: 'AR-PROD' },
  { nodeKey: 'PR-LOG', dimensionType: 'process', code: 'LOG', name: 'Logística', parentKey: 'AR-PROD' },
] as const;

export function generateBgKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function computeAvailableBudget(input: BudgetAvailabilityInput): BudgetAvailabilityResult {
  const consumed = input.committed + input.obligated + input.executed + input.reserved;
  const available = Math.max(0, roundMoney(input.budgetAmount - consumed));
  const utilizationPct = input.budgetAmount > 0
    ? roundMoney((consumed / input.budgetAmount) * 100)
    : 0;

  return {
    available,
    utilizationPct,
    breakdown: {
      budget: input.budgetAmount,
      committed: input.committed,
      obligated: input.obligated,
      executed: input.executed,
      reserved: input.reserved,
    },
  };
}

export function validateBudgetAvailability(
  available: number,
  requestedAmount: number,
  tolerancePercent = 0,
): { allowed: boolean; shortfall: number } {
  const maxAllowed = available * (1 + tolerancePercent / 100);
  const allowed = requestedAmount <= maxAllowed;
  const shortfall = allowed ? 0 : roundMoney(requestedAmount - available);
  return { allowed, shortfall };
}

export function computeVariance(
  budget: number,
  executed: number,
  committed = 0,
  obligated = 0,
): VarianceResult {
  const totalUsed = executed + committed + obligated;
  const variance = roundMoney(budget - totalUsed);
  const variancePct = budget > 0 ? roundMoney((variance / budget) * 100) : 0;
  const compliancePct = budget > 0 ? roundMoney(Math.min(100, (executed / budget) * 100)) : 0;

  return { budget, executed, committed, obligated, variance, variancePct, compliancePct };
}

export function projectClosing(
  budget: number,
  executed: number,
  daysElapsed: number,
  totalDays: number,
): { projectedExecution: number; projectedVariance: number; projectedCompliancePct: number } {
  if (daysElapsed <= 0 || totalDays <= 0) {
    return { projectedExecution: executed, projectedVariance: budget - executed, projectedCompliancePct: budget > 0 ? (executed / budget) * 100 : 0 };
  }
  const dailyRate = executed / daysElapsed;
  const projectedExecution = roundMoney(dailyRate * totalDays);
  const projectedVariance = roundMoney(budget - projectedExecution);
  const projectedCompliancePct = budget > 0 ? roundMoney(Math.min(150, (projectedExecution / budget) * 100)) : 0;
  return { projectedExecution, projectedVariance, projectedCompliancePct };
}

export function distributeAnnualToMonthly(annualAmount: number, months = 12): number[] {
  const base = roundMoney(annualAmount / months);
  const lines = Array(months).fill(base);
  const diff = roundMoney(annualAmount - base * months);
  if (diff !== 0) lines[11] = roundMoney(lines[11] + diff);
  return lines;
}

export function buildPeriodKey(fiscalYear: number, month: number): string {
  return `${fiscalYear}-${String(month).padStart(2, '0')}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
