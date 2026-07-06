import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { LotLifecycleService } from './lot-lifecycle.service';
import { LotsService } from './lots.service';
import { LotTwinService } from './lot-twin.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

describe('LotLifecycleService', () => {
  let service: LotLifecycleService;
  let prisma: {
    fieldLotProfile: { update: jest.Mock };
    fieldLotLifecycleEvent: { create: jest.Mock };
  };
  let lots: { findOne: jest.Mock };
  let twin: { refresh: jest.Mock };
  let core: { emitFieldLotActivated: jest.Mock; emitFieldLotStatusChanged: jest.Mock };

  beforeEach(async () => {
    prisma = {
      fieldLotProfile: { update: jest.fn().mockResolvedValue({ id: 'fl-1', status: 'active' }) },
      fieldLotLifecycleEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    lots = {
      findOne: jest.fn().mockResolvedValue({
        id: 'fl-1',
        status: 'draft',
        activatedAt: null,
      }),
    };
    twin = { refresh: jest.fn().mockResolvedValue({}) };
    core = {
      emitFieldLotActivated: jest.fn().mockResolvedValue({}),
      emitFieldLotStatusChanged: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: LotsService, useValue: lots },
        { provide: LotTwinService, useValue: twin },
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(LotLifecycleService);
  });

  it('allows draft → active', async () => {
    const result = await service.transition('org-1', 'fl-1', 'user-1', {
      toStatus: 'active',
      reasonNotes: 'Activado',
    });
    expect(result.status).toBe('active');
    expect(core.emitFieldLotActivated).toHaveBeenCalled();
  });

  it('rejects draft → renovation', async () => {
    await expect(
      service.transition('org-1', 'fl-1', 'user-1', { toStatus: 'renovation' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
