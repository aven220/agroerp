import { Injectable } from '@nestjs/common';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { buildExecutiveIndicators, generateEaceKey } from '../domain/eace.engine';
import { EaceDashboardService } from './eace-dashboard.service';

@Injectable()
export class EaceExecutiveService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly dashboard: EaceDashboardService,
  ) {}

  async panel(organizationId: string) {
    const dash = await this.dashboard.dashboard(organizationId);
    const indicators = dash.indicators as Record<string, unknown>;
    const executive = buildExecutiveIndicators({
      productionTons: Number(indicators.activeContracts ?? 0) * 10,
      yieldPerHa: 4500,
      profitabilityIndex: Number(indicators.contractComplianceAvg ?? 80),
      cropHealthPct: 85,
      phytosanitaryStatus: Number(indicators.criticalAlerts ?? 0) > 0 ? 'attention' : 'stable',
      resourceUsageIndex: 72,
      compliancePct: Number(indicators.contractComplianceAvg ?? 100),
      esgScore: 78,
      criticalAlerts: Number(indicators.criticalAlerts ?? 0),
    });
    const alerts = await this.prisma.eaceAlert.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
    });
    return { executive, dashboard: dash, alerts, generatedAt: new Date().toISOString() };
  }

  async snapshot(organizationId: string) {
    const panel = await this.panel(organizationId);
    const count = await this.prisma.eaceExecutiveSnapshot.count({ where: { organizationId } });
    return this.prisma.eaceExecutiveSnapshot.create({
      data: {
        organizationId,
        snapshotKey: generateEaceKey('EXE', count + 1),
        indicators: panel as object,
      },
    });
  }

  listSnapshots(organizationId: string) {
    return this.prisma.eaceExecutiveSnapshot.findMany({
      where: { organizationId },
      orderBy: { generatedAt: 'desc' },
      take: 30,
    });
  }
}
