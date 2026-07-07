import { Test, TestingModule } from '@nestjs/testing';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { FarmTwinService } from '@/core/ftip/application/farm-twin.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { LotTwinService } from '@/core/fmdt/application/lot-twin.service';
import { EventService } from '@/core/events/application/event.service';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import { RecordExplorerAggregatorService } from './record-explorer-aggregator.service';

describe('RecordExplorerAggregatorService', () => {
  let service: RecordExplorerAggregatorService;

  const producers = {
    findOne: jest.fn(),
    get360: jest.fn(),
    getTimeline: jest.fn(),
    getIndicators: jest.fn(),
  };
  const farms = { findOne: jest.fn(), getTimeline: jest.fn() };
  const farmTwin = { getTwin: jest.fn() };
  const lots = { findOne: jest.fn(), getTimeline: jest.fn() };
  const lotTwin = { getTwin: jest.fn() };
  const events = { getByAggregate: jest.fn() };
  const submissions = { findAll: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordExplorerAggregatorService,
        { provide: ProducersService, useValue: producers },
        { provide: FarmsService, useValue: farms },
        { provide: FarmTwinService, useValue: farmTwin },
        { provide: LotsService, useValue: lots },
        { provide: LotTwinService, useValue: lotTwin },
        { provide: EventService, useValue: events },
        { provide: FormSubmissionsService, useValue: submissions },
      ],
    }).compile();

    service = module.get(RecordExplorerAggregatorService);
  });

  it('aggregates producer record explorer payload', async () => {
    producers.findOne.mockResolvedValue({
      id: 'p1',
      legalName: 'Juan Pérez',
      documentNumber: '123',
      lifecycleStatus: 'active',
      documents: [],
      territoryLinks: [],
    });
    producers.get360.mockResolvedValue({
      scores: { risk: 2, quality: 4 },
      purchases: [],
    });
    producers.getTimeline.mockResolvedValue({
      items: [{ id: 't1', type: 'note', occurredAt: '2026-01-01', title: 'Nota' }],
    });
    producers.getIndicators.mockResolvedValue({
      current: { riskScore: 2, qualityScore: 4 },
    });
    events.getByAggregate.mockResolvedValue([]);
    submissions.findAll.mockResolvedValue([]);

    const result = await service.explore('org-1', 'Producer', 'p1');

    expect(result.summary.title).toBe('Juan Pérez');
    expect(result.summary.entityType).toBe('Producer');
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    expect(result.quickActions.length).toBeGreaterThan(0);
  });
});
