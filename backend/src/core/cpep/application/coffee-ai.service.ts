import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { avg, percent as pct, startOfDay, sum } from '../domain/analytics.engine';

@Injectable()
export class CoffeeAiService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(organizationId: string) {
    const suggestions: Array<Record<string, unknown>> = [];
    const since30d = new Date(Date.now() - 30 * 86_400_000);
    const since7d = new Date(Date.now() - 7 * 86_400_000);
    const start = startOfDay();

    const [qualities, settlements, tickets, tickets7d, ticketsPrev7d] = await Promise.all([
      this.prisma.cpepQualityAssessment.findMany({
        where: { organizationId, assessedAt: { gte: since30d } },
        include: { ticket: true },
        take: 200,
      }),
      this.prisma.cpepSettlement.findMany({
        where: { organizationId, createdAt: { gte: since30d }, voided: false },
        take: 200,
      }),
      this.prisma.cpepReceptionTicket.findMany({
        where: { organizationId, createdAt: { gte: since30d } },
        select: { netWeightKg: true, createdAt: true, status: true },
      }),
      this.prisma.cpepReceptionTicket.findMany({
        where: { organizationId, createdAt: { gte: since7d } },
        select: { netWeightKg: true },
      }),
      this.prisma.cpepReceptionTicket.findMany({
        where: {
          organizationId,
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000), lt: since7d },
        },
        select: { netWeightKg: true },
      }),
    ]);

    const humidity = qualities.map((q) => q.humidityPct).filter((v): v is number => v != null);
    const avgHumidity = avg(humidity);
    if (avgHumidity > 12) {
      suggestions.push({
        type: 'quality_prediction',
        recommendation: `Humedad promedio ${avgHumidity.toFixed(1)}% — riesgo de castigo por humedad`,
        predictedHumidity: Number((avgHumidity * 1.01).toFixed(2)),
      });
    }

    const prices = settlements.map((s) => s.appliedPricePerKg ?? s.basePricePerKg);
    const avgPrice = avg(prices);
    if (avgPrice > 0) {
      const recent = settlements.slice(0, 20).map((s) => s.appliedPricePerKg ?? s.basePricePerKg);
      const older = settlements.slice(20, 40).map((s) => s.appliedPricePerKg ?? s.basePricePerKg);
      const trend = avg(recent) - avg(older.length ? older : recent);
      suggestions.push({
        type: 'price_prediction',
        recommendation: `Precio base promedio reciente ${avgPrice.toFixed(0)} COP/kg`,
        predictedPrice: Number((avgPrice + trend).toFixed(2)),
        trend,
      });
    }

    const kg7 = sum(tickets7d.map((t) => t.netWeightKg ?? 0));
    const kgPrev7 = sum(ticketsPrev7d.map((t) => t.netWeightKg ?? 0));
    suggestions.push({
      type: 'purchase_prediction',
      recommendation: `Volumen 7d ${kg7.toFixed(0)} kg vs previo ${kgPrev7.toFixed(0)} kg`,
      predictedKgNext7d: Number((kg7 + (kg7 - kgPrev7) * 0.5).toFixed(0)),
    });

    const rejects = qualities.filter((q) => q.grade === 'reject' || q.decision === 'rejected' || (q.defectsPct ?? 0) > 10);
    for (const r of rejects.slice(0, 5)) {
      suggestions.push({
        type: 'anomaly_detection',
        ticketKey: r.ticket.ticketKey,
        recommendation: 'Anomalía de calidad detectada — revisar muestra y cadena de custodia',
      });
    }

    const openQueue = await this.prisma.cpepReceptionTicket.count({
      where: { organizationId, status: { in: ['queued', 'receiving'] } },
    });
    if (openQueue > 5) {
      suggestions.push({
        type: 'operational_recommendation',
        recommendation: `Cola alta (${openQueue}) — priorizar turnos y pesaje IoT`,
      });
    }

    const premium = qualities.filter((q) => q.grade === 'excelso' || q.grade === 'premium').length;
    if (qualities.length) {
      suggestions.push({
        type: 'trend_detection',
        recommendation: `${pct(premium, qualities.length)}% de lotes premium/excelso en 30 días`,
        premiumRate: pct(premium, qualities.length),
      });
    }

    const todayTickets = tickets.filter((t) => t.createdAt >= start).length;
    const avgDaily = tickets.length / 30;
    if (todayTickets > avgDaily * 1.5 && avgDaily > 0) {
      suggestions.push({
        type: 'anomaly_detection',
        recommendation: `Compras del día (${todayTickets}) por encima del promedio diario (${avgDaily.toFixed(1)})`,
      });
    }

    if (settlements.length) {
      const bonuses = sum(settlements.map((s) => s.bonusesTotal));
      const penalties = sum(settlements.map((s) => s.penaltiesTotal));
      suggestions.push({
        type: 'operational_recommendation',
        recommendation: `Bonificaciones ${bonuses.toLocaleString()} vs castigos ${penalties.toLocaleString()} en 30 días`,
      });
    }

    return suggestions.slice(0, 30);
  }
}
