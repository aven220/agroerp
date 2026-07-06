import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ApiBreakerState } from '@agroerp/shared';

@Injectable()
export class ApiCircuitBreakerService {
  private readonly failureThreshold = 5;
  private readonly openDurationMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async beforeRequest(organizationId: string, routeId: string, routeKey: string) {
    const state = await this.getOrCreate(organizationId, routeId, routeKey);
    if (state.state === 'open') {
      const openedAt = state.openedAt?.getTime() ?? 0;
      if (Date.now() - openedAt < this.openDurationMs) {
        throw new ServiceUnavailableException('Circuit breaker open');
      }
      await this.prisma.apiCircuitBreakerState.update({
        where: { id: state.id },
        data: { state: 'half_open' },
      });
    }
  }

  async onSuccess(routeId: string) {
    await this.prisma.apiCircuitBreakerState.updateMany({
      where: { routeId },
      data: { state: 'closed', failureCount: 0, openedAt: null, lastFailureAt: null },
    });
  }

  async onFailure(organizationId: string, routeId: string, routeKey: string) {
    const state = await this.getOrCreate(organizationId, routeId, routeKey);
    const failures = state.failureCount + 1;
    const nextState: ApiBreakerState = failures >= this.failureThreshold ? 'open' : state.state;
    await this.prisma.apiCircuitBreakerState.update({
      where: { id: state.id },
      data: {
        failureCount: failures,
        lastFailureAt: new Date(),
        state: nextState,
        openedAt: nextState === 'open' ? new Date() : state.openedAt,
      },
    });
  }

  private async getOrCreate(organizationId: string, routeId: string, routeKey: string) {
    const existing = await this.prisma.apiCircuitBreakerState.findFirst({ where: { routeId } });
    if (existing) return existing;
    return this.prisma.apiCircuitBreakerState.create({
      data: { organizationId, routeId, routeKey, state: 'closed', failureCount: 0 },
    });
  }
}
