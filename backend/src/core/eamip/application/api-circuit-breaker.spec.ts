import { ServiceUnavailableException } from '@nestjs/common';
import { ApiCircuitBreakerService } from './api-circuit-breaker.service';

describe('ApiCircuitBreakerService', () => {
  const prisma = {
    apiCircuitBreakerState: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: ApiCircuitBreakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApiCircuitBreakerService(prisma as never);
  });

  it('opens circuit after threshold failures', async () => {
    prisma.apiCircuitBreakerState.findFirst.mockResolvedValue({
      id: 'cb1',
      state: 'closed',
      failureCount: 4,
      openedAt: null,
    });
    prisma.apiCircuitBreakerState.update.mockResolvedValue({});

    await service.onFailure('org-1', 'route-1', 'get-producers');

    expect(prisma.apiCircuitBreakerState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'open', failureCount: 5 }),
      }),
    );
  });

  it('blocks when circuit is open', async () => {
    prisma.apiCircuitBreakerState.findFirst.mockResolvedValue({
      id: 'cb1',
      state: 'open',
      failureCount: 5,
      openedAt: new Date(),
    });

    await expect(
      service.beforeRequest('org-1', 'route-1', 'get-producers'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
