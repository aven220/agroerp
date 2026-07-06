export type WeighingValidationCode =
  | 'NEGATIVE_WEIGHT'
  | 'OUT_OF_RANGE'
  | 'ABOVE_MAX'
  | 'BELOW_MIN'
  | 'ABNORMAL_VARIATION'
  | 'INCONSISTENT_READINGS'
  | 'SCALE_DISCONNECTED'
  | 'SCALE_UNCERTIFIED'
  | 'SCALE_BUSY'
  | 'SCALE_OFFLINE'
  | 'NET_INVALID'
  | 'STABILITY_REQUIRED'
  | 'CONTINGENCY_REASON_REQUIRED';

export interface WeighingValidationIssue {
  code: WeighingValidationCode;
  severity: 'error' | 'warning';
  message: string;
}

export interface ScaleLimits {
  minWeightKg?: number;
  maxWeightKg?: number;
  certified?: boolean;
  certificationExpiresAt?: Date | string | null;
  status?: string;
  lastSeenAt?: Date | string | null;
  offlineThresholdMs?: number;
}

export interface ReadingSample {
  weightKg: number;
  recordedAt?: Date | string;
}

export function computeNetWeight(grossKg?: number | null, tareKg?: number | null): number | null {
  if (grossKg == null || tareKg == null) return null;
  const net = grossKg - tareKg;
  return net > 0 ? Number(net.toFixed(3)) : 0;
}

export function generateTicketCodes(ticketKey: string) {
  return {
    qrCode: `CPEP:${ticketKey}`,
    barcode: ticketKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20),
  };
}

export function generateWeighingNumber(ticketKey: string, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `WGH-${ticketKey.slice(0, 12)}-${stamp}-${String(seq).padStart(3, '0')}`.toUpperCase();
}

export function averageReadings(readings: number[]): number | null {
  if (!readings.length) return null;
  const sum = readings.reduce((a, b) => a + b, 0);
  return Number((sum / readings.length).toFixed(3));
}

export function computeStabilityScore(readings: number[]): number {
  if (readings.length < 2) return readings.length === 1 ? 1 : 0;
  const avg = averageReadings(readings) ?? 0;
  if (avg === 0) return 0;
  const variance =
    readings.reduce((acc, v) => acc + (v - avg) ** 2, 0) / readings.length;
  const cv = Math.sqrt(variance) / Math.abs(avg);
  return Number(Math.max(0, Math.min(1, 1 - cv * 10)).toFixed(3));
}

export function isStable(readings: number[], minScore = 0.92, minSamples = 3): boolean {
  if (readings.length < minSamples) return false;
  return computeStabilityScore(readings) >= minScore;
}

export function validateWeightValue(
  weightKg: number | null | undefined,
  limits: ScaleLimits = {},
): WeighingValidationIssue[] {
  const issues: WeighingValidationIssue[] = [];
  if (weightKg == null) return issues;
  if (weightKg < 0) {
    issues.push({
      code: 'NEGATIVE_WEIGHT',
      severity: 'error',
      message: `Peso negativo no permitido: ${weightKg} kg`,
    });
  }
  const min = limits.minWeightKg ?? 0;
  const max = limits.maxWeightKg ?? 50_000;
  if (weightKg < min) {
    issues.push({
      code: 'BELOW_MIN',
      severity: 'error',
      message: `Peso ${weightKg} kg por debajo del mínimo permitido (${min} kg)`,
    });
  }
  if (weightKg > max) {
    issues.push({
      code: 'ABOVE_MAX',
      severity: 'error',
      message: `Peso ${weightKg} kg superior al máximo permitido (${max} kg)`,
    });
  }
  if (weightKg < min || weightKg > max) {
    issues.push({
      code: 'OUT_OF_RANGE',
      severity: 'error',
      message: `Peso fuera de rango [${min}, ${max}] kg`,
    });
  }
  return issues;
}

export function validateScaleState(limits: ScaleLimits): WeighingValidationIssue[] {
  const issues: WeighingValidationIssue[] = [];
  const status = limits.status ?? 'available';
  if (status === 'offline' || status === 'error') {
    issues.push({
      code: 'SCALE_OFFLINE',
      severity: 'error',
      message: `Balanza en estado ${status}`,
    });
  }
  if (status === 'busy') {
    issues.push({
      code: 'SCALE_BUSY',
      severity: 'warning',
      message: 'Balanza ocupada por otra sesión',
    });
  }
  if (status === 'uncertified' || limits.certified === false) {
    issues.push({
      code: 'SCALE_UNCERTIFIED',
      severity: 'error',
      message: 'Balanza no certificada',
    });
  }
  if (limits.certificationExpiresAt) {
    const expires = new Date(limits.certificationExpiresAt).getTime();
    if (!Number.isNaN(expires) && expires < Date.now()) {
      issues.push({
        code: 'SCALE_UNCERTIFIED',
        severity: 'error',
        message: 'Certificación de balanza vencida',
      });
    }
  }
  const threshold = limits.offlineThresholdMs ?? 120_000;
  if (limits.lastSeenAt) {
    const last = new Date(limits.lastSeenAt).getTime();
    if (!Number.isNaN(last) && Date.now() - last > threshold) {
      issues.push({
        code: 'SCALE_DISCONNECTED',
        severity: 'error',
        message: 'Balanza desconectada (sin señal reciente)',
      });
    }
  }
  return issues;
}

export function validateReadingConsistency(
  readings: ReadingSample[],
  maxVariationPct = 2,
): WeighingValidationIssue[] {
  const issues: WeighingValidationIssue[] = [];
  if (readings.length < 2) return issues;
  const values = readings.map((r) => r.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = averageReadings(values) ?? 0;
  if (avg <= 0) return issues;
  const variationPct = ((max - min) / avg) * 100;
  if (variationPct > maxVariationPct) {
    issues.push({
      code: 'INCONSISTENT_READINGS',
      severity: 'error',
      message: `Lecturas inconsistentes: variación ${variationPct.toFixed(2)}% > ${maxVariationPct}%`,
    });
  }
  if (variationPct > maxVariationPct * 1.5) {
    issues.push({
      code: 'ABNORMAL_VARIATION',
      severity: 'error',
      message: `Variación anormal entre lecturas (${variationPct.toFixed(2)}%)`,
    });
  }
  return issues;
}

export function validateNetWeight(
  grossKg?: number | null,
  tareKg?: number | null,
): WeighingValidationIssue[] {
  const issues: WeighingValidationIssue[] = [];
  const net = computeNetWeight(grossKg, tareKg);
  if (grossKg != null && tareKg != null && (net == null || net <= 0)) {
    issues.push({
      code: 'NET_INVALID',
      severity: 'error',
      message: `Peso neto inválido (bruto=${grossKg}, tara=${tareKg})`,
    });
  }
  return issues;
}

export function validateWeighingCapture(input: {
  weightKg?: number | null;
  readings?: ReadingSample[];
  scale?: ScaleLimits;
  requireStability?: boolean;
  contingency?: boolean;
  contingencyReason?: string;
}): WeighingValidationIssue[] {
  const issues: WeighingValidationIssue[] = [];
  if (input.scale && !input.contingency) {
    issues.push(...validateScaleState(input.scale));
  }
  issues.push(...validateWeightValue(input.weightKg, input.scale ?? {}));
  if (input.readings?.length) {
    issues.push(...validateReadingConsistency(input.readings));
    if (input.requireStability && !isStable(input.readings.map((r) => r.weightKg))) {
      issues.push({
        code: 'STABILITY_REQUIRED',
        severity: 'error',
        message: 'Se requiere estabilidad del peso antes de confirmar',
      });
    }
  }
  if (input.contingency && !input.contingencyReason?.trim()) {
    issues.push({
      code: 'CONTINGENCY_REASON_REQUIRED',
      severity: 'error',
      message: 'Justificación obligatoria en modo contingencia',
    });
  }
  return issues;
}

export function hasBlockingErrors(issues: WeighingValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export const WEIGHING_FLOW_STEPS = [
  { step: 1, key: 'reception', label: 'Recepción del productor' },
  { step: 2, key: 'select_scale', label: 'Selección de balanza' },
  { step: 3, key: 'verify_scale', label: 'Verificación de balanza' },
  { step: 4, key: 'capture_gross', label: 'Captura peso bruto' },
  { step: 5, key: 'confirm_gross', label: 'Confirmación operador (bruto)' },
  { step: 6, key: 'capture_tare', label: 'Captura peso tara' },
  { step: 7, key: 'compute_net', label: 'Cálculo peso neto' },
  { step: 8, key: 'validate', label: 'Validación de inconsistencias' },
  { step: 9, key: 'confirm', label: 'Confirmación final' },
  { step: 10, key: 'quality', label: 'Envío a control de calidad' },
] as const;
