import { CpepQualityGrade } from '@agroerp/shared';

export type SettlementLine = {
  code: string;
  label: string;
  amount: number;
  kind: 'base' | 'quality_price' | 'bonus' | 'penalty' | 'discount' | 'withholding' | 'transport' | 'advance' | 'credit' | 'tax' | 'rounding';
  detail?: string;
};

export type RoundingMode = 'nearest' | 'up' | 'down' | 'none';

export interface SettlementDetailLine {
  code: string;
  label: string;
  amount: number;
  source?: string;
}

export interface SettlementComputationInput {
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
  lines?: SettlementLine[];
  grossWeightKg?: number;
  tareWeightKg?: number;
  qualityGrade?: CpepQualityGrade;
  humidityPct?: number;
  factor?: number;
  bonusLines?: SettlementDetailLine[];
  penaltyLines?: SettlementDetailLine[];
  discountLines?: SettlementDetailLine[];
  roundingMode?: RoundingMode;
  roundingPrecision?: number;
  taxRatePct?: number;
  withholdingPct?: number;
}

export interface SettlementSimulation {
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  netWeightKg: number;
  qualityGrade?: string;
  humidityPct?: number;
  factor?: number;
  basePricePerKg: number;
  qualityPricePerKg?: number;
  appliedPricePerKg: number;
  baseAmount: number;
  bonusLines: SettlementDetailLine[];
  penaltyLines: SettlementDetailLine[];
  discountLines: SettlementDetailLine[];
  bonusesTotal: number;
  penaltiesTotal: number;
  discountsTotal: number;
  transportTotal: number;
  advancesTotal: number;
  creditsTotal: number;
  withholdingsTotal: number;
  taxesTotal: number;
  subtotal: number;
  totalAmount: number;
  netPayable: number;
  lines: SettlementLine[];
  paymentStatus: 'pending' | 'partial' | 'paid';
}

export const SETTLEMENT_FLOW_STEPS = [
  { step: 1, key: 'quality_received', label: 'Recepción de calidad' },
  { step: 2, key: 'price_loaded', label: 'Precio vigente' },
  { step: 3, key: 'rules_applied', label: 'Reglas de negocio' },
  { step: 4, key: 'bonuses', label: 'Bonificaciones' },
  { step: 5, key: 'penalties', label: 'Castigos' },
  { step: 6, key: 'discounts', label: 'Descuentos' },
  { step: 7, key: 'taxes', label: 'Impuestos y retenciones' },
  { step: 8, key: 'simulated', label: 'Simulación' },
  { step: 9, key: 'operator_confirmed', label: 'Confirmación operador' },
  { step: 10, key: 'producer_signed', label: 'Firma productor' },
  { step: 11, key: 'registered', label: 'Registro definitivo' },
  { step: 12, key: 'documents', label: 'Documentos' },
  { step: 13, key: 'inventory', label: 'Inventario y contabilidad' },
] as const;

export function applyRounding(value: number, mode: RoundingMode = 'nearest', precision = 0): number {
  if (mode === 'none') return value;
  const factor = 10 ** precision;
  const scaled = value * factor;
  if (mode === 'up') return Math.ceil(scaled) / factor;
  if (mode === 'down') return Math.floor(scaled) / factor;
  return Math.round(scaled) / factor;
}

export function qualityPriceMultiplier(grade?: CpepQualityGrade): number {
  switch (grade) {
    case 'excelso':
      return 1.08;
    case 'premium':
      return 1.04;
    case 'pasilla':
      return 0.92;
    case 'reject':
      return 0.7;
    default:
      return 1;
  }
}

export function qualityAdjustments(grade: CpepQualityGrade, humidityPct?: number, factor?: number) {
  const bonusLines: SettlementDetailLine[] = [];
  const penaltyLines: SettlementDetailLine[] = [];
  if (grade === 'excelso') bonusLines.push({ code: 'GRADE_EXCELSO', label: 'Bonificación excelso', amount: 200, source: 'quality' });
  if (grade === 'premium') bonusLines.push({ code: 'GRADE_PREMIUM', label: 'Bonificación premium', amount: 100, source: 'quality' });
  if (grade === 'pasilla') penaltyLines.push({ code: 'GRADE_PASILLA', label: 'Castigo pasilla', amount: 150, source: 'quality' });
  if (grade === 'reject') penaltyLines.push({ code: 'GRADE_REJECT', label: 'Castigo rechazo', amount: 500, source: 'quality' });
  if (humidityPct != null && humidityPct > 12.5) {
    penaltyLines.push({
      code: 'HUMIDITY',
      label: `Castigo humedad ${humidityPct}%`,
      amount: (humidityPct - 12.5) * 50,
      source: 'quality',
    });
  }
  if (factor != null && factor < 88) {
    penaltyLines.push({
      code: 'FACTOR_LOW',
      label: `Castigo factor ${factor}`,
      amount: (88 - factor) * 20,
      source: 'quality',
    });
  }
  if (factor != null && factor > 94) {
    bonusLines.push({
      code: 'FACTOR_HIGH',
      label: `Bonificación factor ${factor}`,
      amount: (factor - 94) * 15,
      source: 'quality',
    });
  }
  return {
    bonus: bonusLines.reduce((s, l) => s + l.amount, 0),
    penalty: penaltyLines.reduce((s, l) => s + l.amount, 0),
    bonusLines,
    penaltyLines,
  };
}

export function computeSettlement(
  netWeightKg: number,
  input: SettlementComputationInput,
): SettlementSimulation {
  const appliedPricePerKg =
    input.qualityPricePerKg ??
    input.basePricePerKg * qualityPriceMultiplier(input.qualityGrade);
  const baseAmount = netWeightKg * appliedPricePerKg;

  const qualityAdj =
    input.qualityGrade != null
      ? qualityAdjustments(input.qualityGrade, input.humidityPct, input.factor)
      : { bonus: 0, penalty: 0, bonusLines: [], penaltyLines: [] };

  const bonusLines = [
    ...qualityAdj.bonusLines,
    ...(input.bonusLines ?? []),
  ];
  const penaltyLines = [
    ...qualityAdj.penaltyLines,
    ...(input.penaltyLines ?? []),
  ];
  const discountLines = [...(input.discountLines ?? [])];

  let bonuses = (input.bonusesTotal ?? 0) + qualityAdj.bonus;
  let penalties = (input.penaltiesTotal ?? 0) + qualityAdj.penalty;
  if (input.bonusLines?.length) bonuses += input.bonusLines.reduce((s, l) => s + l.amount, 0);
  if (input.penaltyLines?.length) penalties += input.penaltyLines.reduce((s, l) => s + l.amount, 0);

  let discounts = input.discountsTotal ?? 0;
  if (input.discountLines?.length) {
    discounts += input.discountLines.reduce((s, l) => s + l.amount, 0);
  }

  let withholdings = input.withholdingsTotal ?? 0;
  let taxes = input.taxesTotal ?? 0;
  const transport = input.transportTotal ?? 0;
  const advances = input.advancesTotal ?? 0;
  const credits = input.creditsTotal ?? 0;

  const taxableBase = baseAmount + bonuses - penalties - discounts - transport;
  if (input.taxRatePct != null && input.taxRatePct > 0 && !input.taxesTotal) {
    taxes = taxableBase * (input.taxRatePct / 100);
  }
  if (input.withholdingPct != null && input.withholdingPct > 0 && !input.withholdingsTotal) {
    withholdings = taxableBase * (input.withholdingPct / 100);
  }

  const lines: SettlementLine[] = [
    {
      code: 'BASE',
      label: 'Precio base aplicado',
      amount: baseAmount,
      kind: 'base',
      detail: `${netWeightKg} kg × ${appliedPricePerKg}`,
    },
  ];
  if (input.qualityPricePerKg != null && input.qualityPricePerKg !== input.basePricePerKg) {
    lines.push({
      code: 'QUALITY_PRICE',
      label: 'Precio por calidad',
      amount: input.qualityPricePerKg,
      kind: 'quality_price',
      detail: input.qualityGrade,
    });
  }
  for (const b of bonusLines) {
    lines.push({ code: b.code, label: b.label, amount: b.amount, kind: 'bonus', detail: b.source });
  }
  if (!bonusLines.length && bonuses) {
    lines.push({ code: 'BONUS', label: 'Bonificaciones', amount: bonuses, kind: 'bonus' });
  }
  for (const p of penaltyLines) {
    lines.push({ code: p.code, label: p.label, amount: -p.amount, kind: 'penalty', detail: p.source });
  }
  if (!penaltyLines.length && penalties) {
    lines.push({ code: 'PENALTY', label: 'Castigos', amount: -penalties, kind: 'penalty' });
  }
  for (const d of discountLines) {
    lines.push({ code: d.code, label: d.label, amount: -d.amount, kind: 'discount', detail: d.source });
  }
  if (!discountLines.length && discounts) {
    lines.push({ code: 'DISCOUNT', label: 'Descuentos', amount: -discounts, kind: 'discount' });
  }
  if (transport) lines.push({ code: 'TRANSPORT', label: 'Fletes', amount: -transport, kind: 'transport' });
  if (advances) lines.push({ code: 'ADVANCE', label: 'Anticipos', amount: -advances, kind: 'advance' });
  if (credits) lines.push({ code: 'CREDIT', label: 'Créditos', amount: -credits, kind: 'credit' });
  if (withholdings) lines.push({ code: 'WITHHOLD', label: 'Retenciones', amount: -withholdings, kind: 'withholding' });
  if (taxes) lines.push({ code: 'TAX', label: 'Impuestos', amount: -taxes, kind: 'tax' });

  const subtotalRaw = baseAmount + bonuses - penalties - discounts - transport;
  const totalRaw = Math.max(0, subtotalRaw - advances - credits - withholdings - taxes);
  const roundingMode = input.roundingMode ?? 'nearest';
  const roundingPrecision = input.roundingPrecision ?? 0;
  const totalAmount = applyRounding(totalRaw, roundingMode, roundingPrecision);
  const roundingDiff = totalAmount - totalRaw;
  if (Math.abs(roundingDiff) > 0.0001) {
    lines.push({
      code: 'ROUNDING',
      label: `Redondeo (${roundingMode})`,
      amount: roundingDiff,
      kind: 'rounding',
    });
  }

  const paid = input.paidAmount ?? 0;
  const paymentStatus = paid <= 0 ? 'pending' : paid >= totalAmount ? 'paid' : 'partial';

  return {
    grossWeightKg: input.grossWeightKg ?? null,
    tareWeightKg: input.tareWeightKg ?? null,
    netWeightKg,
    qualityGrade: input.qualityGrade,
    humidityPct: input.humidityPct,
    factor: input.factor,
    basePricePerKg: input.basePricePerKg,
    qualityPricePerKg: input.qualityPricePerKg,
    appliedPricePerKg,
    baseAmount: Number(baseAmount.toFixed(2)),
    bonusLines,
    penaltyLines,
    discountLines,
    bonusesTotal: Number(bonuses.toFixed(2)),
    penaltiesTotal: Number(penalties.toFixed(2)),
    discountsTotal: Number(discounts.toFixed(2)),
    transportTotal: transport,
    advancesTotal: advances,
    creditsTotal: credits,
    withholdingsTotal: Number(withholdings.toFixed(2)),
    taxesTotal: Number(taxes.toFixed(2)),
    subtotal: Number(applyRounding(subtotalRaw, roundingMode, roundingPrecision).toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    netPayable: Number(Math.max(0, totalAmount - paid).toFixed(2)),
    lines: input.lines?.length ? (input.lines as SettlementLine[]) : lines,
    paymentStatus,
  };
}

export function generateSettlementKey(ticketKey: string): string {
  return `LIQ-${ticketKey}`;
}

export function generatePaymentKey(settlementKey: string, seq: number): string {
  return `PAY-${settlementKey}-${String(seq).padStart(3, '0')}`;
}

export function validatePaymentAmount(
  amount: number,
  outstanding: number,
  method: string,
): string | null {
  if (amount <= 0) return 'Monto de pago inválido';
  if (method !== 'deferred' && method !== 'partial' && method !== 'mixed' && amount > outstanding + 0.01) {
    return 'Monto supera el saldo pendiente';
  }
  return null;
}
