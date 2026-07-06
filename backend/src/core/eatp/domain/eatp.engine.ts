import { EatpRunStatus } from '@agroerp/prisma-eatp-client';
import { FIELD_OPERATION_TYPES } from '@agroerp/shared';

export function generateEatpKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EATP_LABOR_TYPES = [
  { code: 'land_prep', name: 'Preparación del terreno', fmdtCode: 'weeding' },
  { code: 'planting', name: 'Siembra', fmdtCode: 'planting' },
  { code: 'fertilization', name: 'Fertilización', fmdtCode: 'fertilization' },
  { code: 'irrigation', name: 'Riego', fmdtCode: 'irrigation' },
  { code: 'phytosanitary', name: 'Control fitosanitario', fmdtCode: 'phytosanitary' },
  { code: 'pruning', name: 'Poda', fmdtCode: 'pruning' },
  { code: 'harvest', name: 'Cosecha', fmdtCode: 'harvest' },
  { code: 'post_harvest', name: 'Poscosecha', fmdtCode: 'agroinput_application' },
] as const;

export const EATP_FARM_UNIT_TYPES = [
  'farm', 'hacienda', 'field', 'productive_unit', 'agricultural_center', 'zone', 'sector',
];

export const EATP_INPUT_CATEGORIES = [
  'seeds', 'fertilizers', 'agrochemicals', 'fuels', 'plant_material', 'tools',
];

export const EATP_MODULE_SLOTS = [
  'ftip', 'fmdt', 'prm', 'eims', 'cpep', 'hcm', 'efm', 'escm', 'emfg', 'epscm', 'eam', 'eint', 'ebiap', 'eiamp',
];

export function mapLaborToFmdt(laborType: string): string {
  const found = EATP_LABOR_TYPES.find((l) => l.code === laborType);
  const code = found?.fmdtCode ?? laborType;
  return (FIELD_OPERATION_TYPES as readonly string[]).includes(code) ? code : 'agroinput_application';
}

export function aggregateEatpIndicators(data: {
  activeFarms: number;
  activeLots: number;
  activeCampaigns: number;
  pendingTasks: number;
  completedTasks30d: number;
  hectares: number;
}) {
  const completionRate = data.completedTasks30d + data.pendingTasks > 0
    ? Math.round((data.completedTasks30d / (data.completedTasks30d + data.pendingTasks)) * 100)
    : 100;
  return {
    activeFarms: data.activeFarms,
    activeLots: data.activeLots,
    activeCampaigns: data.activeCampaigns,
    pendingTasks: data.pendingTasks,
    hectares: Math.round(data.hectares * 100) / 100,
    completionRate,
  };
}

export function mapTaskStatus(done: boolean): EatpRunStatus {
  return done ? 'completed' : 'pending';
}
