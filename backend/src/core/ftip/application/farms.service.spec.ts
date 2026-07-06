import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FarmTwinService } from './farm-twin.service';

describe('FarmsService', () => {
  let service: FarmsService;
  let prisma: {
    farmUnit: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    producerTerritoryLink: { create: jest.Mock };
    farmLifecycleEvent: { create: jest.Mock };
    auditLog: { findMany: jest.Mock };
    event: { findMany: jest.Mock };
    geometryRevision: { findMany: jest.Mock };
  };
  let core: {
    emitFarmCreated: jest.Mock;
    emitFarmUpdated: jest.Mock;
    emitFarmDeleted: jest.Mock;
  };
  let twin: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      farmUnit: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { totalAreaHa: 0 }, _sum: { agriculturalAreaHa: 0 } }),
      },
      producerTerritoryLink: { create: jest.fn().mockResolvedValue({}) },
      farmLifecycleEvent: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      event: { findMany: jest.fn().mockResolvedValue([]) },
      geometryRevision: { findMany: jest.fn().mockResolvedValue([]) },
    };
    core = {
      emitFarmCreated: jest.fn().mockResolvedValue({}),
      emitFarmUpdated: jest.fn().mockResolvedValue({}),
      emitFarmDeleted: jest.fn().mockResolvedValue({}),
    };
    twin = { refresh: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoreEngineService, useValue: core },
        { provide: FarmTwinService, useValue: twin },
      ],
    }).compile();

    service = module.get(FarmsService);
  });

  it('lists farms with pagination', async () => {
    prisma.farmUnit.findMany.mockResolvedValue([{ id: '1', farmCode: 'FTIP-000001' }]);
    prisma.farmUnit.count.mockResolvedValue(1);

    const result = await service.findAll('org-1', { page: 1, limit: 25 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('throws when farm not found', async () => {
    prisma.farmUnit.findFirst.mockResolvedValue(null);
    await expect(service.findOne('org-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates farm and emits event', async () => {
    prisma.farmUnit.findFirst.mockResolvedValue(null);
    prisma.farmUnit.create.mockResolvedValue({
      id: 'farm-1',
      farmCode: 'FTIP-000001',
      farmName: 'Test Farm',
    });

    const result = await service.create('org-1', 'user-1', {
      farmName: 'Test Farm',
      farmTypeCode: 'coffee_estate',
    });

    expect(result.farmCode).toBe('FTIP-000001');
    expect(core.emitFarmCreated).toHaveBeenCalled();
    expect(twin.refresh).toHaveBeenCalledWith('org-1', 'farm-1');
  });

  it('rejects version conflict on update', async () => {
    prisma.farmUnit.findFirst.mockResolvedValue({ id: 'farm-1', version: 2, farmCode: 'FTIP-000001' });

    await expect(
      service.update('org-1', 'farm-1', 'user-1', { farmName: 'Updated', version: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes farm', async () => {
    prisma.farmUnit.findFirst.mockResolvedValue({
      id: 'farm-1',
      status: 'active',
      farmCode: 'FTIP-000001',
    });
    prisma.farmUnit.update.mockResolvedValue({ id: 'farm-1', status: 'inactive' });

    await service.remove('org-1', 'farm-1', 'user-1');

    expect(prisma.farmUnit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date), status: 'inactive' }),
      }),
    );
    expect(core.emitFarmDeleted).toHaveBeenCalled();
  });
});
