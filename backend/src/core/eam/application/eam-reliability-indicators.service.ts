import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EamReliabilityIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const [reliability, energy, analytics, alerts] = await Promise.all([
      this.prisma.eamReliabilitySnapshot.findFirst({ where: { organizationId, snapshotKey: 'org-summary' } }),
      this.prisma.eamEnergySnapshot.findFirst({ where: { organizationId, snapshotKey: 'energy-summary' } }),
      this.prisma.eamAnalyticsSnapshot.findFirst({ where: { organizationId, snapshotKey: 'analytics-summary' } }),
      this.prisma.eamRelAlert.count({ where: { organizationId, isRead: false } }),
    ]);
    return {
      reliability: reliability?.indicators ?? {},
      energy: energy?.indicators ?? {},
      analytics: analytics?.analytics ?? {},
      unreadAlerts: alerts,
      computedAt: reliability?.computedAt ?? null,
    };
  }

  listAlerts(organizationId: string, unreadOnly = false) {
    return this.prisma.eamRelAlert.findMany({
      where: { organizationId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { raisedAt: 'desc' },
      take: 100,
    });
  }

  async markAlertRead(organizationId: string, alertKey: string) {
    return this.prisma.eamRelAlert.update({
      where: { organizationId_alertKey: { organizationId, alertKey } },
      data: { isRead: true },
    });
  }
}
