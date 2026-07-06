import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateQmsIndicators } from '../domain/emfg-qms.engine';

@Injectable()
export class EmfgQmsIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [inspections, releases, ncs] = await Promise.all([
      this.prisma.emfgQmsInspection.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { result: true, supplierKey: true, lineKey: true },
      }),
      this.prisma.emfgQmsLotRelease.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { status: true },
      }),
      this.prisma.emfgQmsNonConformance.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { createdAt: true, closedAt: true, supplierKey: true, severity: true },
      }),
    ]);

    const bySupplier = new Map<string, { total: number; failed: number }>();
    const byLine = new Map<string, { total: number; failed: number }>();

    for (const i of inspections) {
      if (i.supplierKey) {
        const cur = bySupplier.get(i.supplierKey) ?? { total: 0, failed: 0 };
        cur.total++;
        if (i.result === 'fail') cur.failed++;
        bySupplier.set(i.supplierKey, cur);
      }
      if (i.lineKey) {
        const cur = byLine.get(i.lineKey) ?? { total: 0, failed: 0 };
        cur.total++;
        if (i.result === 'fail') cur.failed++;
        byLine.set(i.lineKey, cur);
      }
    }

    const indicators = aggregateQmsIndicators({ inspections, releases, ncs, bySupplier, byLine });

    const pendingReleases = await this.prisma.emfgQmsLotRelease.count({
      where: { organizationId, status: 'pending' },
    });
    const openCapas = await this.prisma.emfgQmsCapaAction.count({
      where: { organizationId, status: { in: ['open', 'in_progress', 'verification'] } },
    });

    return {
      indicators,
      pendingReleases,
      openCapas,
      periodDays,
      generatedAt: new Date().toISOString(),
    };
  }
}
