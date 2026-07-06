import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiRateLimiterService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(
    organizationId: string,
    clientId: string,
    limits: { perMinute: number; perDay: number },
  ) {
    const now = new Date();
    const minuteKey = `m:${now.toISOString().slice(0, 16)}`;
    const dayKey = `d:${now.toISOString().slice(0, 10)}`;

    await this.incrementBucket(organizationId, clientId, minuteKey, limits.perMinute, 60_000);
    await this.incrementBucket(organizationId, clientId, dayKey, limits.perDay, 86_400_000);
  }

  private async incrementBucket(
    organizationId: string,
    clientId: string,
    windowKey: string,
    limit: number,
    windowMs: number,
  ) {
    const resetAt = new Date(Date.now() + windowMs);
    const existing = await this.prisma.apiRateLimitBucket.findFirst({
      where: { organizationId, clientId, windowKey },
    });

    if (!existing) {
      await this.prisma.apiRateLimitBucket.create({
        data: { organizationId, clientId, windowKey, count: 1, resetAt },
      });
      return;
    }

    if (existing.resetAt < new Date()) {
      await this.prisma.apiRateLimitBucket.update({
        where: { id: existing.id },
        data: { count: 1, resetAt },
      });
      return;
    }

    if (existing.count >= limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.prisma.apiRateLimitBucket.update({
      where: { id: existing.id },
      data: { count: existing.count + 1 },
    });
  }
}
