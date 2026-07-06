export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production';

export type DepreciationInput = {
  acquisitionCost: number;
  residualValue: number;
  usefulLifeMonths: number;
  accumulatedDepreciation: number;
  depreciationMethod: DepreciationMethod;
  unitsOfProduction?: number | null;
  unitsUsed?: number;
  periodUnits?: number;
  decliningRate?: number;
};

export type DepreciationResult = {
  amount: number;
  openingNbv: number;
  closingNbv: number;
  fullyDepreciated: boolean;
};

export const DEFAULT_FA_CATEGORIES = [
  { categoryKey: 'CAT-MACH', code: 'MACH', name: 'Maquinaria', assetClass: 'machinery', defaultUsefulLifeMonths: 120, defaultResidualPercent: 10 },
  { categoryKey: 'CAT-VEH', code: 'VEH', name: 'Vehículos', assetClass: 'vehicle', defaultUsefulLifeMonths: 60, defaultResidualPercent: 10 },
  { categoryKey: 'CAT-COMP', code: 'COMP', name: 'Equipos de cómputo', assetClass: 'computer', defaultUsefulLifeMonths: 36, defaultResidualPercent: 0 },
  { categoryKey: 'CAT-FURN', code: 'FURN', name: 'Muebles', assetClass: 'furniture', defaultUsefulLifeMonths: 120, defaultResidualPercent: 5 },
  { categoryKey: 'CAT-BLD', code: 'BLD', name: 'Edificaciones', assetClass: 'building', defaultUsefulLifeMonths: 240, defaultResidualPercent: 10 },
  { categoryKey: 'CAT-LAND', code: 'LAND', name: 'Terrenos', assetClass: 'land', defaultUsefulLifeMonths: 0, defaultResidualPercent: 0 },
  { categoryKey: 'CAT-TOOL', code: 'TOOL', name: 'Herramientas', assetClass: 'tool', defaultUsefulLifeMonths: 24, defaultResidualPercent: 0 },
  { categoryKey: 'CAT-AGRI', code: 'AGRI', name: 'Equipos agrícolas', assetClass: 'agricultural', defaultUsefulLifeMonths: 84, defaultResidualPercent: 10 },
  { categoryKey: 'CAT-INT', code: 'INT', name: 'Activos intangibles', assetClass: 'intangible', isIntangible: true, defaultUsefulLifeMonths: 60, defaultResidualPercent: 0 },
  { categoryKey: 'CAT-OTHER', code: 'OTHER', name: 'Otros activos', assetClass: 'other', defaultUsefulLifeMonths: 60, defaultResidualPercent: 5 },
] as const;

export function generateFaKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function computeDepreciableBase(acquisitionCost: number, residualValue: number): number {
  return Math.max(0, acquisitionCost - residualValue);
}

export function computeNetBookValue(acquisitionCost: number, accumulatedDepreciation: number): number {
  return Math.max(0, acquisitionCost - accumulatedDepreciation);
}

export function computePeriodDepreciation(input: DepreciationInput): DepreciationResult {
  const openingNbv = computeNetBookValue(input.acquisitionCost, input.accumulatedDepreciation);
  const depreciableBase = computeDepreciableBase(input.acquisitionCost, input.residualValue);

  if (openingNbv <= input.residualValue || depreciableBase <= 0 || input.usefulLifeMonths <= 0) {
    return { amount: 0, openingNbv, closingNbv: openingNbv, fullyDepreciated: true };
  }

  let amount = 0;

  switch (input.depreciationMethod) {
    case 'straight_line': {
      const monthly = depreciableBase / input.usefulLifeMonths;
      amount = monthly;
      break;
    }
    case 'declining_balance': {
      const rate = input.decliningRate ?? (2 / input.usefulLifeMonths);
      amount = openingNbv * rate;
      const remaining = openingNbv - input.residualValue;
      if (amount > remaining) amount = remaining;
      break;
    }
    case 'units_of_production': {
      const totalUnits = input.unitsOfProduction ?? 0;
      const periodUnits = input.periodUnits ?? 0;
      if (totalUnits <= 0 || periodUnits <= 0) {
        amount = 0;
      } else {
        amount = (depreciableBase / totalUnits) * periodUnits;
      }
      break;
    }
    default:
      amount = depreciableBase / input.usefulLifeMonths;
  }

  const maxAllowed = openingNbv - input.residualValue;
  if (amount > maxAllowed) amount = maxAllowed;
  if (amount < 0) amount = 0;

  const closingNbv = openingNbv - amount;
  return {
    amount: roundMoney(amount),
    openingNbv: roundMoney(openingNbv),
    closingNbv: roundMoney(closingNbv),
    fullyDepreciated: closingNbv <= input.residualValue,
  };
}

export function computeDisposalGainLoss(nbvAtDisposal: number, proceedsAmount: number): number {
  return roundMoney(proceedsAmount - nbvAtDisposal);
}

export function buildDepreciationSchedule(
  acquisitionCost: number,
  residualValue: number,
  usefulLifeMonths: number,
  method: DepreciationMethod = 'straight_line',
): Array<{ period: number; amount: number; accumulated: number; nbv: number }> {
  const schedule: Array<{ period: number; amount: number; accumulated: number; nbv: number }> = [];
  let accumulated = 0;

  for (let period = 1; period <= usefulLifeMonths; period++) {
    const result = computePeriodDepreciation({
      acquisitionCost,
      residualValue,
      usefulLifeMonths,
      accumulatedDepreciation: accumulated,
      depreciationMethod: method,
    });
    if (result.amount <= 0 && result.fullyDepreciated) break;
    accumulated += result.amount;
    schedule.push({
      period,
      amount: result.amount,
      accumulated: roundMoney(accumulated),
      nbv: result.closingNbv,
    });
    if (result.fullyDepreciated) break;
  }

  return schedule;
}

export function generateAssetTag(categoryCode: string, seq: number): string {
  return `${categoryCode}-${String(seq).padStart(6, '0')}`;
}

export function generateQrPayload(organizationId: string, assetKey: string, assetTag: string): string {
  return `AGROERP:FA:${organizationId}:${assetKey}:${assetTag}`;
}

export function reconcilePhysicalCount(
  expected: { locationKey?: string | null; responsibleUserId?: string | null },
  actual: { locationKey?: string | null; responsibleUserId?: string | null },
): 'found' | 'mismatch' | 'not_found' {
  if (!actual.locationKey && !actual.responsibleUserId) return 'not_found';
  const locMatch = !expected.locationKey || expected.locationKey === actual.locationKey;
  const respMatch = !expected.responsibleUserId || expected.responsibleUserId === actual.responsibleUserId;
  return locMatch && respMatch ? 'found' : 'mismatch';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
