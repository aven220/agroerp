import { apiRequest } from './client';

export interface AiExplainability {
  confidence: number;
  sources: Array<{ type: string; ref: string; title?: string; dataDate?: string }>;
  modelUsed: string;
  providerType: string;
  latencyMs: number;
  justification?: string;
  ragUsed: boolean;
}

export interface AiChatResponse {
  content: string;
  explainability: AiExplainability;
  conversationId?: string;
  messageId?: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCost?: number;
}

export interface AiCopilot {
  id: string;
  copilotKey: string;
  name: string;
  description?: string | null;
  category: string;
}

export interface AiCenter {
  dashboard: {
    kpis: Record<string, number>;
    byService: Array<{ service: string; count: number }>;
    byModel: Array<{ model: string; count: number }>;
  };
  copilotCount: number;
  providerCount: number;
  promptCount: number;
  providerTypes: string[];
}

export function getAiCenter() {
  return apiRequest<AiCenter>('/eaidsp/center');
}

export function aiChat(data: {
  prompt: string;
  copilotKey?: string;
  conversationId?: string;
  moduleContext?: string;
  useRag?: boolean;
}) {
  return apiRequest<AiChatResponse>('/eaidsp/chat', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function aiInvoke(serviceType: string, prompt: string, moduleContext?: string) {
  return apiRequest<AiChatResponse>('/eaidsp/invoke', {
    method: 'POST',
    body: JSON.stringify({ serviceType, prompt, moduleContext }),
  });
}

export function listAiCopilots() {
  return apiRequest<AiCopilot[]>('/eaidsp/copilots');
}

export function listAiProviders() {
  return apiRequest<unknown[]>('/eaidsp/providers');
}

export function listAiModels() {
  return apiRequest<unknown[]>('/eaidsp/models');
}

export function listAiPrompts() {
  return apiRequest<unknown[]>('/eaidsp/prompts');
}

export function listAiConversations() {
  return apiRequest<Array<{ id: string; title?: string; updatedAt: string }>>('/eaidsp/conversations');
}

export function getAiConversation(id: string) {
  return apiRequest<{ id: string; messages: Array<{ role: string; content: string; explainability?: AiExplainability }> }>(
    `/eaidsp/conversations/${id}`,
  );
}

export function getAiMetrics() {
  return apiRequest<AiCenter['dashboard']>('/eaidsp/metrics');
}

export function syncAiRag() {
  return apiRequest<{ indexed: number }>('/eaidsp/rag/sync-erp', { method: 'POST' });
}

export function createAiProvider(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eaidsp/providers', { method: 'POST', body: JSON.stringify(data) });
}

export function createAiPrompt(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eaidsp/prompts', { method: 'POST', body: JSON.stringify(data) });
}

export function listAiAutomations() {
  return apiRequest<unknown[]>('/eaidsp/automations');
}

export function createAiAutomation(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eaidsp/automations', { method: 'POST', body: JSON.stringify(data) });
}
