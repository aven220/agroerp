export function generateEatrKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EATR_TRACE_EVENT_TYPES = [
  'soil_prep', 'planting', 'labor', 'irrigation', 'fertilization', 'phytosanitary',
  'monitoring', 'climate_event', 'harvest', 'postharvest',
];

export const EATR_LOT_TYPES = ['agricultural', 'sub_lot', 'harvest', 'commercial'];
export const EATR_POSTHARVEST_STEPS = ['reception', 'classification', 'selection', 'washing', 'drying', 'packing', 'storage', 'dispatch'];
export const EATR_CUSTODY_TYPES = ['transfer', 'reception', 'dispatch', 'movement'];
export const EATR_EXPORT_MARKETS = ['national', 'international', 'export'];

export const EATR_MODULE_SLOTS = [
  'eatp', 'eapp', 'eiwp', 'ephp', 'egsip', 'ftip', 'fmdt', 'eims', 'escm', 'epscm', 'efm', 'eint', 'ebiap', 'eiamp',
];

export function computeHarvestYield(producedKg: number, lossKg: number, wasteKg: number, areaHa?: number) {
  const netKg = Math.max(0, producedKg - lossKg - wasteKg);
  const yieldPct = producedKg > 0 ? (netKg / producedKg) * 100 : 0;
  const yieldPerHa = areaHa && areaHa > 0 ? netKg / areaHa : undefined;
  return { producedKg, lossKg, wasteKg, netKg, yieldPct: Math.round(yieldPct * 100) / 100, yieldPerHa };
}

export function buildTraceChain(events: Array<{ eventType: string; occurredAt: Date; payload?: Record<string, unknown> }>) {
  return events
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    .map((e, i) => ({
      sequence: i + 1,
      eventType: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      payload: e.payload ?? {},
    }));
}

export function aggregateEatrIndicators(data: {
  productionLots: number;
  harvestLots: number;
  commercialLots: number;
  traceEvents30d: number;
  qualityInspections: number;
  custodyTransfers30d: number;
}) {
  const traceScore = Math.min(
    100,
    data.productionLots * 3 + data.commercialLots * 4 + Math.min(40, data.traceEvents30d) + data.qualityInspections * 2,
  );
  return { ...data, traceScore, traceabilityReady: traceScore >= 40 };
}

export function validateQualityConformity(input: {
  moisturePct?: number; defectsPct?: number; maxMoisture?: number; maxDefects?: number;
}) {
  const maxM = input.maxMoisture ?? 85;
  const maxD = input.maxDefects ?? 10;
  const moistureOk = input.moisturePct == null || input.moisturePct <= maxM;
  const defectsOk = input.defectsPct == null || input.defectsPct <= maxD;
  return { isConforming: moistureOk && defectsOk, moistureOk, defectsOk };
}
