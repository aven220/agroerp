import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import * as os from 'os';

@Injectable()
export class JobWorkerPoolService implements OnModuleInit {
  private readonly logger = new Logger(JobWorkerPoolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const orgs = await this.prisma.organization.findMany({
        where: { status: 'active' },
        select: { id: true },
        take: 50,
      });
      for (const org of orgs) {
        await this.registerSystemWorker(org.id);
      }
    } catch (err) {
      this.logger.warn(
        `Worker pool startup deferred — database unavailable: ${(err as Error).message}`,
      );
    }
    setInterval(() => this.heartbeatAll().catch(() => undefined), 30_000).unref?.();
  }

  async registerSystemWorker(organizationId: string) {
    const nodeId = this.config.get('ESDJE_NODE_ID', os.hostname());
    const workerKey = `system-${nodeId}`;
    return this.prisma.esdjeWorker.upsert({
      where: { organizationId_workerKey: { organizationId, workerKey } },
      update: { status: 'online', lastHeartbeat: new Date(), hostname: os.hostname() },
      create: {
        organizationId,
        workerKey,
        nodeId,
        hostname: os.hostname(),
        status: 'online',
        capacity: Number(this.config.get('ESDJE_WORKER_CAPACITY', 20)),
        modules: ['core', 'workflow', 'notification', 'ai', 'bre', 'sync'],
      },
    });
  }

  async heartbeat(workerId: string) {
    return this.prisma.esdjeWorker.update({
      where: { id: workerId },
      data: { lastHeartbeat: new Date(), status: 'online' },
    });
  }

  async pickWorker(organizationId: string, moduleKey?: string) {
    const workers = await this.prisma.esdjeWorker.findMany({
      where: {
        organizationId,
        status: { in: ['online', 'busy'] },
        lastHeartbeat: { gte: new Date(Date.now() - 120_000) },
      },
      orderBy: { currentLoad: 'asc' },
    });
    const eligible = workers.filter(
      (w) => !moduleKey || w.modules.length === 0 || w.modules.includes(moduleKey),
    );
    const worker = eligible.find((w) => w.currentLoad < w.capacity) ?? eligible[0];
    return worker ?? null;
  }

  async incrementLoad(workerId: string, delta: number) {
    const worker = await this.prisma.esdjeWorker.findUnique({ where: { id: workerId } });
    if (!worker) return;
    const load = Math.max(0, worker.currentLoad + delta);
    await this.prisma.esdjeWorker.update({
      where: { id: workerId },
      data: {
        currentLoad: load,
        status: load >= worker.capacity ? 'busy' : 'online',
      },
    });
  }

  listWorkers(organizationId: string) {
    return this.prisma.esdjeWorker.findMany({
      where: { organizationId },
      orderBy: { lastHeartbeat: 'desc' },
    });
  }

  private async heartbeatAll() {
    await this.prisma.esdjeWorker.updateMany({
      where: { status: { not: 'offline' } },
      data: { lastHeartbeat: new Date() },
    });
  }
}
