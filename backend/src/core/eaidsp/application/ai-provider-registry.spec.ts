import { AiProviderRegistryService } from './ai-provider-registry.service';

describe('AiProviderRegistryService', () => {
  it('resolves enterprise fallback', () => {
    const enterprise = { providerType: 'enterprise', isConfigured: () => true, complete: jest.fn() };
    const registry = new AiProviderRegistryService(
      { providerType: 'openai' } as never,
      { providerType: 'google' } as never,
      { providerType: 'anthropic' } as never,
      { providerType: 'ollama' } as never,
      { providerType: 'custom' } as never,
      enterprise as never,
    );
    expect(registry.get('unknown').providerType).toBe('enterprise');
  });
});
