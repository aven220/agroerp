import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateWmsDashboard, computeOccupancyPct } from '../domain/epscm-wms.engine';

@Injectable()
export class EpscmWmsIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const [
      locationCount,
      blockedLocations,
      openPickTasks,
      openTransfers,
      pendingReceipts,
      pendingDispatches,
      crossDockPending,
      locations,
    ] = await Promise.all([
      this.prisma.epscmWmsLocation.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmWmsLocation.count({ where: { organizationId, status: 'blocked' } }),
      this.prisma.epscmWmsPickTask.count({ where: { organizationId, status: { in: ['pending', 'in_progress'] } } }),
      this.prisma.epscmWmsTransfer.count({ where: { organizationId, status: { in: ['pending_approval', 'approved', 'in_transit'] } } }),
      this.prisma.epscmWmsReceipt.count({ where: { organizationId, status: { in: ['scheduled', 'receiving', 'partial'] } } }),
      this.prisma.epscmWmsDispatch.count({ where: { organizationId, status: { in: ['draft', 'preparing', 'loading', 'partial'] } } }),
      this.prisma.epscmWmsCrossDock.count({ where: { organizationId, status: { in: ['pending', 'assigned'] } } }),
      this.prisma.epscmWmsLocation.findMany({
        where: { organizationId, isActive: true },
        select: { occupiedQty: true, capacityQty: true },
        take: 5000,
      }),
    ]);

    const occupancyAvgPct = locations.length
      ? locations.reduce((s, l) => s + computeOccupancyPct(l.occupiedQty, l.capacityQty), 0) / locations.length
      : 0;

    return aggregateWmsDashboard({
      locationCount,
      blockedLocations,
      openPickTasks,
      openTransfers,
      pendingReceipts,
      pendingDispatches,
      crossDockPending,
      occupancyAvgPct: Math.round(occupancyAvgPct * 100) / 100,
    });
  }

  auditTrail(organizationId: string, limit = 100) {
    return this.prisma.epscmAuditLog.findMany({
      where: {
        organizationId,
        action: { in: ['wms_received', 'wms_dispatched', 'wms_picked', 'wms_packed', 'wms_transferred', 'wms_location_blocked'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
