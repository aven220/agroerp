import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { buildCashFlowProjection, generateTrKey } from '../domain/efm-treasury.engine';

@Injectable()
export class EfmTrCashflowService {
  constructor(private readonly prisma: PrismaService) {}

  async daily(organizationId: string, dateFrom: string, dateTo: string) {
    return this.aggregate(organizationId, dateFrom, dateTo, 'day');
  }

  async weekly(organizationId: string, dateFrom: string, dateTo: string) {
    return this.aggregate(organizationId, dateFrom, dateTo, 'week');
  }

  async monthly(organizationId: string, dateFrom: string, dateTo: string) {
    return this.aggregate(organizationId, dateFrom, dateTo, 'month');
  }

  async projection(organizationId: string, days = 90) {
    const accounts = await this.prisma.efmTrBankAccount.findMany({
      where: { organizationId, isActive: true },
    });
    const cashBoxes = await this.prisma.efmTrCashBox.findMany({
      where: { organizationId, isActive: true },
    });
    const openingBalance = accounts.reduce((s, a) => s + a.currentBalance, 0)
      + cashBoxes.reduce((s, c) => s + c.currentBalance, 0);

    const now = new Date();
    const buckets: Array<{ period: string; inflows: number; outflows: number }> = [];

    const openPayables = await this.prisma.efmApPayable.findMany({
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
    });
    const openReceivables = await this.prisma.escmReceivable.findMany({
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
    }).catch(() => []);

    const scheduled = await this.prisma.efmApPaymentSchedule.findMany({
      where: { organizationId, status: 'scheduled' },
    });

    for (let i = 0; i < Math.ceil(days / 7); i += 1) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const period = `${weekStart.toISOString().slice(0, 10)} / ${weekEnd.toISOString().slice(0, 10)}`;

      const outflows = scheduled
        .filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd)
        .reduce((sum, s) => sum + s.amount, 0)
        + openPayables
          .filter((p) => p.dueDate >= weekStart && p.dueDate <= weekEnd)
          .reduce((sum, p) => sum + p.balanceAmount, 0) / Math.max(Math.ceil(days / 7), 1);

      const inflows = openReceivables
        .filter((r) => r.dueDate >= weekStart && r.dueDate <= weekEnd)
        .reduce((sum, r) => sum + r.balanceAmount, 0) / Math.max(Math.ceil(days / 7), 1);

      buckets.push({ period, inflows, outflows });
    }

    const projection = buildCashFlowProjection(openingBalance, buckets);

    const alerts = [];
    for (const bucket of projection) {
      if (bucket.cumulativeBalance < 0) {
        const alertKey = generateTrKey('LQA', (await this.prisma.efmTrLiquidityAlert.count({ where: { organizationId } })) + 1);
        const existing = await this.prisma.efmTrLiquidityAlert.findFirst({
          where: { organizationId, projectedDate: new Date(bucket.period.split(' / ')[0]), isResolved: false },
        });
        if (!existing) {
          const alert = await this.prisma.efmTrLiquidityAlert.create({
            data: {
              organizationId,
              alertKey,
              alertType: 'deficit',
              severity: 'critical',
              message: `Déficit proyectado de liquidez: ${Math.abs(bucket.cumulativeBalance).toLocaleString()}`,
              projectedDate: new Date(bucket.period.split(' / ')[0]),
              deficitAmount: Math.abs(bucket.cumulativeBalance),
            },
          });
          alerts.push(alert);
        }
      }
    }

    return {
      openingBalance,
      currencyKey: 'COP',
      horizonDays: days,
      buckets: projection,
      alerts,
    };
  }

  private async aggregate(organizationId: string, dateFrom: string, dateTo: string, granularity: 'day' | 'week' | 'month') {
    const movements = await this.prisma.efmTrMovement.findMany({
      where: {
        organizationId,
        status: 'processed',
        movementDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
      orderBy: { movementDate: 'asc' },
    });

    const bucketMap = new Map<string, { inflows: number; outflows: number }>();

    for (const m of movements) {
      const key = this.periodKey(m.movementDate, granularity);
      const bucket = bucketMap.get(key) ?? { inflows: 0, outflows: 0 };
      if (['deposit', 'ar_collection', 'transfer'].includes(m.movementType) && m.toAccountKey) {
        bucket.inflows += m.amount;
      } else if (['withdrawal', 'ap_payment'].includes(m.movementType)) {
        bucket.outflows += m.amount;
      } else if (m.movementType === 'deposit') {
        bucket.inflows += m.amount;
      } else if (m.movementType === 'withdrawal') {
        bucket.outflows += m.amount;
      }
      bucketMap.set(key, bucket);
    }

    const accounts = await this.prisma.efmTrBankAccount.findMany({ where: { organizationId, isActive: true } });
    const cashBoxes = await this.prisma.efmTrCashBox.findMany({ where: { organizationId, isActive: true } });
    const opening = accounts.reduce((s, a) => s + a.currentBalance, 0) + cashBoxes.reduce((s, c) => s + c.currentBalance, 0);

    const buckets = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({ period, ...b }));

    return {
      granularity,
      dateFrom,
      dateTo,
      openingBalance: opening,
      buckets: buildCashFlowProjection(opening, buckets),
      movementCount: movements.length,
    };
  }

  private periodKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
    if (granularity === 'day') return date.toISOString().slice(0, 10);
    if (granularity === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const week = Math.ceil(date.getDate() / 7);
    return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
