import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateTmsDashboard } from '../domain/epscm-tms-routing.engine';
import { sumCosts } from '../domain/epscm-tms-cost.engine';

@Injectable()
export class EpscmTmsIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async logisticsDashboard(organizationId: string) {
    const [
      vehicleCount,
      driverCount,
      activeTrips,
      pendingDeliveries,
      completedDeliveries,
      openIncidents,
      costs,
    ] = await Promise.all([
      this.prisma.epscmTmsVehicle.count({ where: { organizationId } }),
      this.prisma.epscmTmsDriver.count({ where: { organizationId } }),
      this.prisma.epscmTmsTrip.count({ where: { organizationId, status: { in: ['assigned', 'in_progress', 'incident'] } } }),
      this.prisma.epscmTmsDelivery.count({ where: { organizationId, status: { in: ['pending', 'retry_scheduled', 'partial'] } } }),
      this.prisma.epscmTmsDelivery.count({ where: { organizationId, status: 'completed' } }),
      this.prisma.epscmTmsIncident.count({
        where: { organizationId, trip: { status: { in: ['incident', 'in_progress'] } } },
      }),
      this.prisma.epscmTmsCostEntry.findMany({ where: { organizationId }, select: { amount: true, category: true } }),
    ]);

    const totalCost = sumCosts(costs.map((c) => ({ category: c.category, amount: c.amount })));
    const avgCostPerDelivery = completedDeliveries > 0 ? totalCost / completedDeliveries : 0;

    return aggregateTmsDashboard({
      vehicleCount,
      driverCount,
      activeTrips,
      pendingDeliveries,
      completedDeliveries,
      openIncidents,
      totalCost,
      avgCostPerDelivery: Math.round(avgCostPerDelivery * 100) / 100,
    });
  }

  auditTrail(organizationId: string, limit = 100) {
    return this.prisma.epscmAuditLog.findMany({
      where: {
        organizationId,
        action: {
          in: [
            'tms_trip_started',
            'tms_trip_closed',
            'tms_delivery_completed',
            'tms_delivery_failed',
            'tms_route_changed',
            'tms_incident_recorded',
            'tms_pod_captured',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
