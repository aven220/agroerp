export function generateEaipKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EAIP_PREDICTION_SERVICES = [
  'yield', 'production', 'harvest_date', 'water_demand', 'fertilization',
  'pest', 'disease', 'machinery_availability', 'input_consumption',
];

export const EAIP_SIMULATION_TYPES = [
  'campaign', 'crop', 'yield', 'variety_change', 'climate_scenario',
];

export const EAIP_TWIN_ENTITY_TYPES = ['farm', 'field_lot', 'crop', 'infrastructure', 'machinery'];
export const EAIP_RECOMMENDATION_CATEGORIES = ['irrigation', 'fertilization', 'harvest', 'pest_control', 'machinery', 'labor'];

export const EAIP_MODULE_SLOTS = [
  'eaidsp', 'ebiap', 'egsip', 'eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'effm',
  'eims', 'escm', 'epscm', 'eam', 'eint', 'eiamp', 'efm',
];

export function computeRecommendationScore(factors: Record<string, number>) {
  const weights: Record<string, number> = {
    phenology: 0.2, climate: 0.15, soil: 0.1, lotHistory: 0.15,
    waterAvailability: 0.15, machineryAvailability: 0.1, staffAvailability: 0.05, productionGoals: 0.1,
  };
  let score = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (factors[key] != null) {
      score += factors[key] * weight;
      totalWeight += weight;
    }
  }
  const normalized = totalWeight > 0 ? score / totalWeight : 0;
  return { score: Math.round(normalized * 100) / 100, priority: normalized >= 0.7 ? 'high' : normalized >= 0.4 ? 'medium' : 'low' };
}

export function runSimulationProjection(base: { yieldPerHa?: number; costPerHa?: number; areaHa?: number }, params: { yieldDeltaPct?: number; costDeltaPct?: number; climateFactor?: number }) {
  const yieldFactor = 1 + (params.yieldDeltaPct ?? 0) / 100;
  const costFactor = 1 + (params.costDeltaPct ?? 0) / 100;
  const climate = params.climateFactor ?? 1;
  const yieldPerHa = (base.yieldPerHa ?? 0) * yieldFactor * climate;
  const costPerHa = (base.costPerHa ?? 0) * costFactor;
  const areaHa = base.areaHa ?? 1;
  return {
    yieldProjection: Math.round(yieldPerHa * areaHa * 100) / 100,
    costProjection: Math.round(costPerHa * areaHa * 100) / 100,
    yieldPerHa: Math.round(yieldPerHa * 100) / 100,
    margin: Math.round((yieldPerHa - costPerHa) * areaHa * 100) / 100,
  };
}

export function buildTwinState(entityType: string, telemetry?: Record<string, unknown>, metadata?: Record<string, unknown>) {
  return {
    entityType,
    status: telemetry?.status ?? 'active',
    telemetry: telemetry ?? {},
    metadata: metadata ?? {},
    syncedAt: new Date().toISOString(),
  };
}

export function aggregateEaipIndicators(data: {
  activeModels: number;
  predictions30d: number;
  recommendationsActive: number;
  simulations30d: number;
  twinEntities: number;
  assistantSessions30d: number;
  intelligentAlerts: number;
}) {
  const intelligenceScore = Math.min(
    100,
    data.activeModels * 5 + Math.min(30, data.predictions30d) + data.recommendationsActive * 2 +
      Math.min(20, data.simulations30d * 2) + data.twinEntities * 3,
  );
  return { ...data, intelligenceScore, intelligenceReady: intelligenceScore >= 40 };
}

export function simulatePredictionOutput(serviceType: string, input: Record<string, unknown>) {
  const base = typeof input.baseValue === 'number' ? input.baseValue : 100;
  const variance = (Math.random() * 0.2 - 0.1) * base;
  return {
    serviceType,
    predictedValue: Math.round((base + variance) * 100) / 100,
    confidence: Math.round((0.75 + Math.random() * 0.2) * 100) / 100,
    modelRef: input.modelRef ?? 'fallback',
  };
}
