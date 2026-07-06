import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LotsService } from './lots.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { LotTwinService } from './lot-twin.service';

describe('LotsService', () => {
  let service: LotsService;
  let prisma: {
    fieldLotProfile: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
    };
    farmLot: { findFirst: jest.Mock };
    lotAgronomicState: { create: jest.Mock };
    fieldLotLifecycleEvent: { create: jest.Mock };
    lotDigitalTwin: { aggregate: jest.Mock };
    auditLog: { findMany: jest.Mock };
    event: { findMany: jest.Mock };
    fieldOperation: { findMany: jest.Mock };
    harvestRecord: { findMany: jest.Mock };
    lotGeometryRevision: { findMany: jest.Mock };
  };
  let core: { emitFieldLotRegistered: jest.Mock; emitFieldLotUpdated: jest.Mock; emitFieldLotDeleted: jest.Mock };
  let twin: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      fieldLotProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      farmLot: { findFirst: jest.fn() },
      lotAgronomicState: { create: jest.fn().mockResolvedValue({}) },
      fieldLotLifecycleEvent: { create: jest.fn().mockResolvedValue({}) },
      lotDigitalTwin: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { avgYieldKgHa: 0, qualityAvgScore: 0, costPerHa: 0 },
          _sum: { productionYtdKg: 0, totalCostYtd: 0 },
        }),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      event: { findMany: jest.fn().mockResolvedValue([]) },
      fieldOperation: { findMany: jest.fn().mockResolvedValue([]) },
      harvestRecord: { findMany: jest.fn().mockResolvedValue([]) },
      lotGeometryRevision: { findMany: jest.fn().mockResolvedValue([]) },
    };
    core = {
      emitFieldLotRegistered: jest.fn().mockResolvedValue({}),
      emitFieldLotUpdated: jest.fn().mockResolvedValue({}),
      emitFieldLotDeleted: jest.fn().mockResolvedValue({}),
    };
    twin = { refresh: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoreEngineService, useValue: core },
        { provide: LotTwinService, useValue: twin },
      ],
    }).compile();

    service = module.get(LotsService);
  });

  it('lists field lots with pagination', async () => {
    prisma.fieldLotProfile.findMany.mockResolvedValue([{ id: '1', lotCode: 'L-001' }]);
    prisma.fieldLotProfile.count.mockResolvedValue(1);

    const result = await service.findAll('org-1', { page: 1, limit: 25 });
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('throws when lot not found', async () => {
    prisma.fieldLotProfile.findFirst.mockResolvedValue(null);
    await expect(service.findOne('org-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates field lot from FTIP lot', async () => {
    prisma.farmLot.findFirst.mockResolvedValue({
      id: 'ftip-lot-1',
      farmUnitId: 'farm-1',
      lotCode: 'L-001',
      lotName: 'Lote 1',
      areaHa: 2.5,
      parcelId: null,
      farmUnit: { status: 'active', totalAreaHa: 10, centroidLatitude: 6.1, centroidLongitude: -75.5 },
      cropStands: [],
    });
    prisma.fieldLotProfile.findFirst.mockResolvedValue(null);
    prisma.fieldLotProfile.create.mockResolvedValue({
      id: 'fl-1',
      lotCode: 'L-001',
      ftipLotUnitId: 'ftip-lot-1',
    });

    const result = await service.create('org-1', 'user-1', {
      ftipLotUnitId: 'ftip-lot-1',
      lotName: 'Lote 1',
    });

    expect(result.lotCode).toBe('L-001');
    expect(core.emitFieldLotRegistered).toHaveBeenCalled();
    expect(twin.refresh).toHaveBeenCalled();
  });

  it('rejects duplicate FTIP lot profile', async () => {
    prisma.farmLot.findFirst.mockResolvedValue({
      id: 'ftip-lot-1',
      farmUnit: { status: 'active' },
      cropStands: [],
    });
    prisma.fieldLotProfile.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('org-1', 'user-1', { ftipLotUnitId: 'ftip-lot-1', lotName: 'X' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes field lot', async () => {
    prisma.fieldLotProfile.findFirst.mockResolvedValue({
      id: 'fl-1',
      status: 'active',
      lotCode: 'L-001',
      version: 1,
    });
    prisma.fieldLotProfile.update.mockResolvedValue({ id: 'fl-1', status: 'inactive' });

    await service.remove('org-1', 'fl-1', 'user-1');
    expect(core.emitFieldLotDeleted).toHaveBeenCalled();
  });
});
