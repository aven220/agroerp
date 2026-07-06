import { AiServiceType } from '@agroerp/shared';

export interface AiProviderRequest {
  prompt: string;
  systemPrompt?: string;
  modelKey: string;
  serviceType: AiServiceType;
  temperature?: number;
  maxTokens?: number;
  messages?: Array<{ role: string; content: string }>;
}

export interface AiProviderResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  modelUsed: string;
  providerType: string;
  raw?: unknown;
}

export interface AiProviderAdapter {
  readonly providerType: string;
  isConfigured(settings: Record<string, unknown>): boolean;
  complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse>;
}
