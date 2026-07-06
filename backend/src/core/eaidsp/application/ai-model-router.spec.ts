import { NotFoundException } from '@nestjs/common';
import { AiModelRouterService } from './ai-model-router.service';
import { AiProviderRegistryService } from './ai-provider-registry.service';

describe('AiModelRouterService — provider switch & resilience', () => {
  const enterpriseAdapter = {
    providerType: 'enterprise',
    isConfigured: () => true,
    complete: jest.fn().mockResolvedValue({
      content: 'fallback response',
      tokensIn: 10,
      tokensOut: 20,
      modelUsed: 'agroerp-enterprise',
      providerType: 'enterprise',
    }),
  };

  const openaiAdapter = {
    providerType: 'openai',
    isConfigured: () => false,
    complete: jest.fn(),
  };

  const registry = {
    get: jest.fn((type: string) => (type === 'openai' ? openaiAdapter : enterpriseAdapter)),
  } as unknown as AiProviderRegistryService;

  const prisma = {
    aiModelDefinition: {
      findFirst: jest.fn(),
    },
  };

  let router: AiModelRouterService;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new AiModelRouterService(prisma as never, registry);
  });

  it('falls back to enterprise when provider not configured', async () => {
    prisma.aiModelDefinition.findFirst.mockResolvedValue({
      modelKey: 'gpt-4',
      costPer1kIn: 0.01,
      costPer1kOut: 0.02,
      provider: { id: 'p1', providerType: 'openai', settings: {}, baseUrl: null, apiKeyRef: null },
    });

    const result = await router.route('org-1', {
      prompt: 'test',
      modelKey: 'gpt-4',
      serviceType: 'chat',
    });

    expect(enterpriseAdapter.complete).toHaveBeenCalled();
    expect(openaiAdapter.complete).not.toHaveBeenCalled();
    expect(result.providerType).toBe('enterprise');
  });

  it('uses configured provider when available', async () => {
    const configuredOpenai = {
      providerType: 'openai',
      isConfigured: () => true,
      complete: jest.fn().mockResolvedValue({
        content: 'openai response',
        tokensIn: 5,
        tokensOut: 8,
        modelUsed: 'gpt-4',
        providerType: 'openai',
      }),
    };
    (registry.get as jest.Mock).mockImplementation((type: string) =>
      type === 'openai' ? configuredOpenai : enterpriseAdapter,
    );

    prisma.aiModelDefinition.findFirst.mockResolvedValue({
      modelKey: 'gpt-4',
      costPer1kIn: 0.01,
      costPer1kOut: 0.02,
      provider: { id: 'p1', providerType: 'openai', settings: { apiKey: 'x' }, baseUrl: 'https://api.openai.com', apiKeyRef: 'OPENAI_KEY' },
    });

    const result = await router.route('org-1', {
      prompt: 'hola',
      modelKey: 'gpt-4',
      serviceType: 'chat',
    });

    expect(configuredOpenai.complete).toHaveBeenCalled();
    expect(result.content).toBe('openai response');
  });

  it('throws when no models exist', async () => {
    prisma.aiModelDefinition.findFirst.mockResolvedValue(null);
    await expect(
      router.route('org-1', { prompt: 'x', modelKey: 'missing', serviceType: 'chat' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
