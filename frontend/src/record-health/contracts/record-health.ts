export type RecordHealthLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface HealthCheck {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
  score: number;
}

export interface RecordHealth {
  score: number;
  level: RecordHealthLevel;
  completed: number;
  total: number;
  checks: HealthCheck[];
}

export const RECORD_HEALTH_LEVEL_LABELS: Record<RecordHealthLevel, string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  warning: 'Advertencia',
  critical: 'Crítico',
};
