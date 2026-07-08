import { EntityResolutionService } from './entity-resolution.service';
import { EntityResolverRegistry } from './entity-resolution-registry';
import type { EntityResolver } from '../interfaces/entity-resolver.interface';
import { unresolvedResult, resolvedResult } from '../domain/entity-resolution.types';

describe('EntityResolutionService', () => {
  it('returns unresolved when no resolver supports entity type', async () => {
    const registry = new EntityResolverRegistry([]);
    const service = new EntityResolutionService(registry);

    const result = await service.resolve({
      entityType: 'Unknown',
      organizationId: 'org-1',
      payload: {},
    });

    expect(result.resolved).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('delegates to matching resolver', async () => {
    const resolver: EntityResolver = {
      key: 'producer',
      supports: (request) => request.entityType === 'Producer',
      resolve: async () =>
        resolvedResult({
          entityType: 'Producer',
          entityId: 'p-1',
          confidence: 1,
          matchedBy: 'document',
          matchedValue: '123',
        }),
    };

    const registry = new EntityResolverRegistry([resolver]);
    const service = new EntityResolutionService(registry);

    const result = await service.resolve({
      entityType: 'Producer',
      organizationId: 'org-1',
      payload: { documentNumber: '123' },
    });

    expect(result.resolved).toBe(true);
    expect(result.entityId).toBe('p-1');
  });

  it('registry auto-registers resolvers', () => {
    const resolver: EntityResolver = {
      key: 'farm',
      supports: () => true,
      resolve: async () => unresolvedResult('Farm'),
    };
    const registry = new EntityResolverRegistry([resolver]);
    expect(registry.exists('farm')).toBe(true);
    expect(registry.getAll()).toHaveLength(1);
  });
});
