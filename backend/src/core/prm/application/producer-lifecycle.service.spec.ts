import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { ProducerLifecycleService } from '../application/producer-lifecycle.service';
import { ProducersService } from '../application/producers.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

describe('ProducerLifecycleService', () => {
  let service: ProducerLifecycleService;
  let prisma: {
    producer: { update: jest.Mock };
    producerLifecycleEvent: { create: jest.Mock };
  };
  let producers: { findOne: jest.Mock };
  let core: { emitProducerLifecycleChanged: jest.Mock };

  beforeEach(async () => {
    prisma = {
      producer: { update: jest.fn().mockResolvedValue({ id: 'p1', lifecycleStatus: 'active' }) },
      producerLifecycleEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
    };
    producers = {
      findOne: jest.fn().mockResolvedValue({
        id: 'p1',
        lifecycleStatus: 'pending_approval',
        activatedAt: null,
        producerNumber: 'PRM-000001',
      }),
    };
    core = { emitProducerLifecycleChanged: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProducerLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProducersService, useValue: producers },
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(ProducerLifecycleService);
  });

  it('allows valid transition pending_approval → active', async () => {
    const result = await service.transition('org-1', 'p1', 'user-1', {
      toStatus: 'active',
    });
    expect(result.lifecycleStatus).toBe('active');
    expect(core.emitProducerLifecycleChanged).toHaveBeenCalled();
  });

  it('rejects invalid transition active → draft', async () => {
    producers.findOne.mockResolvedValue({
      id: 'p1',
      lifecycleStatus: 'active',
      producerNumber: 'PRM-000001',
    });

    await expect(
      service.transition('org-1', 'p1', 'user-1', { toStatus: 'draft' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
