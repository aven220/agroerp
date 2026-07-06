import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { latencyToHealth } from '../domain/health.engine';

@Injectable()
export class ObsSyntheticService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId?: string) {
    return this.prisma.eopSyntheticCheck.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { name: 'asc' },
    });
  }

  register(organizationId: string | undefined, data: {
    checkKey: string; name: string; targetUrl: string; method?: string; expectedStatus?: number;
  }) {
    return this.prisma.eopSyntheticCheck.upsert({
      where: {
        organizationId_checkKey: {
          organizationId: organizationId as string,
          checkKey: data.checkKey,
        },
      },
      update: {
        name: data.name,
        targetUrl: data.targetUrl,
        method: data.method ?? 'GET',
        expectedStatus: data.expectedStatus ?? 200,
        isActive: true,
      },
      create: {
        organizationId,
        checkKey: data.checkKey,
        name: data.name,
        targetUrl: data.targetUrl,
        method: data.method ?? 'GET',
        expectedStatus: data.expectedStatus ?? 200,
      },
    });
  }

  async runCheck(id: string) {
    const check = await this.prisma.eopSyntheticCheck.findUnique({ where: { id } });
    if (!check || !check.isActive) return null;

    const start = Date.now();
    try {
      const res = await fetch(check.targetUrl, {
        method: check.method,
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      const status = res.status === check.expectedStatus ? latencyToHealth(latencyMs) : 'unhealthy';
      return this.prisma.eopSyntheticCheck.update({
        where: { id },
        data: { status: status as 'healthy', latencyMs, lastRunAt: new Date() },
      });
    } catch {
      return this.prisma.eopSyntheticCheck.update({
        where: { id },
        data: { status: 'unhealthy', latencyMs: Date.now() - start, lastRunAt: new Date() },
      });
    }
  }

  async runAll(organizationId?: string) {
    const checks = await this.prisma.eopSyntheticCheck.findMany({
      where: { isActive: true, ...(organizationId ? { organizationId } : {}) },
    });
    return Promise.all(checks.map((c) => this.runCheck(c.id)));
  }
}
