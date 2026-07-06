import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class JobAiService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestOptimizations(organizationId: string) {
    const since7d = new Date(Date.now() - 7 * 86_400_000);
    const suggestions: Array<Record<string, unknown>> = [];

    const runsByJob = await this.prisma.esdjeJobRun.groupBy({
      by: ['jobKey'],
      where: { organizationId, createdAt: { gte: since7d } },
      _count: { id: true },
      _avg: { durationMs: true },
    });

    for (const row of runsByJob) {
      if ((row._avg.durationMs ?? 0) > 5000) {
        suggestions.push({
          type: 'bottleneck',
          jobKey: row.jobKey,
          avgDurationMs: row._avg.durationMs,
          runs: row._count.id,
          recommendation: 'Redistribuir carga o dividir la tarea en sub-jobs paralelos',
        });
      }
      if (row._count.id > 10_000) {
        suggestions.push({
          type: 'high_volume',
          jobKey: row.jobKey,
          runs: row._count.id,
          recommendation: 'Considerar ventana de mantenimiento o cola dedicada de alta prioridad',
        });
      }
    }

    const workers = await this.prisma.esdjeWorker.findMany({
      where: { organizationId },
      select: { workerKey: true, currentLoad: true, capacity: true, status: true },
    });
    const overloaded = workers.filter((w) => w.currentLoad >= w.capacity * 0.9);
    if (overloaded.length) {
      suggestions.push({
        type: 'worker_overload',
        workers: overloaded.map((w) => w.workerKey),
        recommendation: 'Escalar workers o rebalancear colas por módulo',
      });
    }

    const failures = await this.prisma.esdjeJobRun.groupBy({
      by: ['jobKey'],
      where: { organizationId, createdAt: { gte: since7d }, status: 'failed' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    for (const f of failures) {
      if (f._count.id >= 3) {
        suggestions.push({
          type: 'failure_prediction',
          jobKey: f.jobKey,
          failures: f._count.id,
          recommendation: 'Revisar payload, dependencias y estrategia de reintentos',
        });
      }
    }

    const dueSoon = await this.prisma.esdjeJob.count({
      where: {
        organizationId,
        deletedAt: null,
        status: 'pending',
        nextRunAt: { lte: new Date(Date.now() + 3_600_000) },
      },
    });
    if (dueSoon > 50) {
      suggestions.push({
        type: 'schedule_cluster',
        dueWithinHour: dueSoon,
        recommendation: 'Espaciar horarios de ejecución para evitar picos de CPU',
      });
    }

    return suggestions;
  }
}
