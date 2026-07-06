import type { AiCapabilityCode } from './hpa-analytics.engine';

export type HpaAiInsightRequest = {
  organizationId: string;
  capability: AiCapabilityCode;
  employeeKey?: string;
  scopeKey?: string;
  context?: Record<string, unknown>;
};

export type HpaAiInsightResult = {
  capability: AiCapabilityCode;
  employeeKey?: string | null;
  providerName: string;
  status: 'ready_for_external_model' | 'cached' | 'provider_error' | 'provider_success';
  score: number | null;
  payload: Record<string, unknown>;
};

export interface HpaAiPort {
  predict(request: HpaAiInsightRequest): Promise<HpaAiInsightResult>;
  listCapabilities(): AiCapabilityCode[];
}

export const HPA_AI_PORT = Symbol('HPA_AI_PORT');
