import { EnterpriseFallbackProvider } from './providers/enterprise-fallback.provider';

describe('EAIDSP Resilience — enterprise fallback', () => {
  const prisma = {
    producer: { count: jest.fn().mockResolvedValue(12) },
    farmUnit: { count: jest.fn().mockResolvedValue(8) },
    fieldLotProfile: { count: jest.fn().mockResolvedValue(45) },
    workflowInstance: { count: jest.fn().mockResolvedValue(3) },
    notificationMessage: { count: jest.fn().mockResolvedValue(2) },
  };

  const provider = new EnterpriseFallbackProvider(prisma as never);

  it('always reports configured', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns chat response when external provider unavailable', async () => {
    const res = await provider.complete(
      {
        prompt: 'Estado de inventario',
        modelKey: 'agroerp-enterprise',
        serviceType: 'chat',
        systemPrompt: 'organizationId: a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
      {},
    );
    expect(res.providerType).toBe('enterprise');
    expect(res.content).toContain('productores');
    expect(res.tokensOut).toBeGreaterThan(0);
  });

  it('handles provider switch service types', async () => {
    const types = ['summarization', 'classification', 'image_analysis', 'prediction'] as const;
    for (const serviceType of types) {
      const res = await provider.complete(
        { prompt: 'test', modelKey: 'agroerp-enterprise', serviceType },
        {},
      );
      expect(res.content.length).toBeGreaterThan(0);
    }
  });
});
