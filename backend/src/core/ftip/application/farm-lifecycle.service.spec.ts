import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { FarmLifecycleService } from './farm-lifecycle.service';
import { FarmsService } from './farms.service';
import { FarmTwinService } from './farm-twin.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

describe('FarmLifecycleService', () => {
  let service: FarmLifecycleService;
  let prisma: {
    farmUnit: { update: jest.Mock };
    farmLifecycleEvent: { create: jest.Mock };
  };
  let farms: { findOne: jest.Mock };
  let twin: { refresh: jest.Mock };
  let core: { emitFarmLifecycleChanged: jest.Mock };

  beforeEach(async () => {
    prisma = {
      farmUnit: { update: jest.fn().mockResolvedValue({ id: 'farm-1', status: 'active' }) },
      farmLifecycleEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    farms = {
      findOne: jest.fn().mockResolvedValue({
        id: 'farm-1',
        status: 'under_validation',
        boundaryGeo: { type: 'Polygon', coordinates: [] },
        activatedAt: null,
      }),
    };
    twin = { refresh: jest.fn().mockResolvedValue({}) };
    core = { emitFarmLifecycleChanged: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: FarmsService, useValue: farms },
        { provide: FarmTwinService, useValue: twin },
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(FarmLifecycleService);
  });

  it('allows valid transition under_validation → active', async () => {
    const result = await service.transition('org-1', 'farm-1', 'user-1', {
      toStatus: 'active',
      reasonNotes: 'Aprobada',
    });

    expect(result.status).toBe('active');
    expect(prisma.farmLifecycleEvent.create).toHaveBeenCalled();
    expect(core.emitFarmLifecycleChanged).toHaveBeenCalled();
  });

  it('rejects invalid transition draft → active', async () => {
    farms.findOne.mockResolvedValue({
      id: 'farm-1',
      status: 'draft',
      boundaryGeo: { type: 'Polygon' },
    });

    await expect(
      service.transition('org-1', 'farm-1', 'user-1', { toStatus: 'active' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('requires polygon to activate', async () => {
    farms.findOne.mockResolvedValue({
      id: 'farm-1',
      status: 'under_validation',
      boundaryGeo: null,
    });

    await expect(
      service.transition('org-1', 'farm-1', 'user-1', { toStatus: 'active' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
