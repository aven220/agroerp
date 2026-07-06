import { Injectable } from '@nestjs/common';
import { AiProviderAdapter } from '../domain/ai-provider.port';
import {
  AnthropicProvider,
  CustomAiProvider,
  GoogleAiProvider,
  OllamaProvider,
  OpenAiProvider,
} from './providers/ai-providers';
import { EnterpriseFallbackProvider } from './providers/enterprise-fallback.provider';

@Injectable()
export class AiProviderRegistryService {
  private readonly adapters: Map<string, AiProviderAdapter>;

  constructor(
    openai: OpenAiProvider,
    google: GoogleAiProvider,
    anthropic: AnthropicProvider,
    ollama: OllamaProvider,
    custom: CustomAiProvider,
    enterprise: EnterpriseFallbackProvider,
  ) {
    this.adapters = new Map<string, AiProviderAdapter>([
      ['openai', openai],
      ['google', google],
      ['anthropic', anthropic],
      ['meta', custom],
      ['mistral', custom],
      ['deepseek', custom],
      ['ollama', ollama],
      ['custom', custom],
      ['enterprise', enterprise],
    ]);
  }

  get(providerType: string): AiProviderAdapter {
    return this.adapters.get(providerType) ?? this.adapters.get('enterprise')!;
  }

  listTypes(): string[] {
    return [...this.adapters.keys()];
  }
}
