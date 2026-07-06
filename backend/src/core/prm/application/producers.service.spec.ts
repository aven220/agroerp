import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ProducersService } from '../application/producers.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

describe('ProducersService', () => {
  let service: ProducersService;
  let prisma: {
    producer: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    producerLifecycleEvent: { create: jest.Mock };
    producerCertification: { count: jest.Mock };
    auditLog: { findMany: jest.Mock };
    event: { findMany: jest.Mock };
    producerCommunication: { findMany: jest.Mock };
    producerNote: { findMany: jest.Mock };
    producerAssignment: { findMany: jest.Mock };
    producerIndicatorSnapshot: { findMany: jest.Mock };
    resource: { findMany: jest.Mock };
  };
  let core: { emitProducerCreated: jest.Mock; emitProducerUpdated: jest.Mock; emitProducerDeleted: jest.Mock };

  beforeEach(async () => {
    prisma = {
      producer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { qualityScore: 0, riskScore: 0 } }),
      },
      producerLifecycleEvent: { create: jest.fn().mockResolvedValue({}) },
      producerCertification: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      event: { findMany: jest.fn().mockResolvedValue([]) },
      producerCommunication: { findMany: jest.fn().mockResolvedValue([]) },
      producerNote: { findMany: jest.fn().mockResolvedValue([]) },
      producerAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      producerIndicatorSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      resource: { findMany: jest.fn().mockResolvedValue([]) },
    };
    core = {
      emitProducerCreated: jest.fn().mockResolvedValue({}),
      emitProducerUpdated: jest.fn().mockResolvedValue({}),
      emitProducerDeleted: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProducersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(ProducersService);
  });

  it('lists producers with pagination', async () => {
    prisma.producer.findMany.mockResolvedValue([{ id: '1', producerNumber: 'PRM-000001' }]);
    prisma.producer.count.mockResolvedValue(1);

    const result = await service.findAll('org-1', { page: 1, limit: 25 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('rejects duplicate document on create', async () => {
    prisma.producer.findFirst.mockResolvedValue({
      id: 'existing',
      producerNumber: 'PRM-000099',
    });

    await expect(
      service.create('org-1', 'user-1', {
        producerTypeCode: 'natural',
        legalName: 'Test',
        documentTypeCode: 'CC',
        documentNumber: '123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates producer and emits event', async () => {
    prisma.producer.findFirst.mockResolvedValue(null);
    prisma.producer.count.mockResolvedValue(0);
    prisma.producer.create.mockResolvedValue({
      id: 'new-id',
      producerNumber: 'PRM-000001',
      documentNumber: '123',
    });

    const result = await service.create('org-1', 'user-1', {
      producerTypeCode: 'natural',
      legalName: 'Juan Pérez',
      documentTypeCode: 'CC',
      documentNumber: '80123456',
    });

    expect(result.id).toBe('new-id');
    expect(core.emitProducerCreated).toHaveBeenCalled();
    expect(prisma.producerLifecycleEvent.create).toHaveBeenCalled();
  });
});
