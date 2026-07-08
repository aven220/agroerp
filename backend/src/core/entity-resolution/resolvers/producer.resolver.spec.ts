import { ProducerResolver } from '../resolvers/producer.resolver';

describe('ProducerResolver', () => {
  const producers = {
    checkDuplicate: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  let resolver: ProducerResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new ProducerResolver(producers as never);
  });

  it('supports Producer entity type', () => {
    expect(resolver.supports({ entityType: 'Producer', organizationId: 'org-1', payload: {} })).toBe(true);
  });

  it('resolves by document number', async () => {
    producers.checkDuplicate.mockResolvedValue({
      duplicate: true,
      existing: { id: 'p-1', producerNumber: 'PRM-1', legalName: 'Juan', lifecycleStatus: 'active' },
    });

    const result = await resolver.resolve({
      entityType: 'Producer',
      organizationId: 'org-1',
      payload: { documentNumber: '123456' },
    });

    expect(result.resolved).toBe(true);
    expect(result.entityId).toBe('p-1');
    expect(result.matchedBy).toBe('document');
  });

  it('returns unresolved when no match exists', async () => {
    producers.checkDuplicate.mockResolvedValue({ duplicate: false, existing: null });
    producers.findAll.mockResolvedValue({ items: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });

    const result = await resolver.resolve({
      entityType: 'Producer',
      organizationId: 'org-1',
      payload: { documentNumber: '999' },
    });

    expect(result.resolved).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
