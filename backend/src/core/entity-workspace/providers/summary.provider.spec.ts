import { SummaryProvider } from '../providers/summary.provider';

describe('SummaryProvider', () => {
  const producers = {
    findOne: jest.fn(),
    get360: jest.fn(),
    getIndicators: jest.fn(),
  };
  const farms = { findOne: jest.fn() };
  const lots = { findOne: jest.fn() };

  let provider: SummaryProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SummaryProvider(producers as never, farms as never, lots as never);
  });

  it('maps producer profile into summary widget and workspace meta', async () => {
    producers.findOne.mockResolvedValue({
      id: 'p-1',
      legalName: 'Productor Demo',
      documentNumber: '123',
      lifecycleStatus: 'active',
      producerTypeCode: 'SMALL',
      territoryLinks: [{ farmUnit: { id: 'f-1', farmName: 'Finca Norte' } }],
    });
    producers.get360.mockResolvedValue({
      scores: { risk: 20, quality: 80 },
      purchases: [{ id: 'purchase-1' }],
    });
    producers.getIndicators.mockResolvedValue({
      current: { riskScore: 20, qualityScore: 80 },
    });

    const result = await provider.fetch({
      organizationId: 'org-1',
      entityType: 'Producer',
      entityId: 'p-1',
      aggregateType: 'Producer',
      entityParam: 'producer',
    });

    expect(result.section.id).toBe('summary');
    expect(result.workspaceMeta?.title).toBe('Productor Demo');
    expect(result.workspaceMeta?.subtitle).toBe('Doc. 123');
    expect(result.widgets[0].type).toBe('summary');
    expect(result.widgets[0].data.summary).toMatchObject({
      entityType: 'Producer',
      recordId: 'p-1',
      title: 'Productor Demo',
    });
    expect((result.actions ?? []).length).toBeGreaterThan(0);
  });
});
