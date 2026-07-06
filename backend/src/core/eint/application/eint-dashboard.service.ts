import { Injectable } from '@nestjs/common';
import { EintStatus } from '@agroerp/prisma-eint-client';
import { HedDashboardService } from '@/core/hed/application/hed-dashboard.service';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { EINT_DASHBOARD_CATALOG } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintDashboardService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly hed: HedDashboardService,
    private readonly audit: EintAuditService,
  ) {}

  catalog() {
    return EINT_DASHBOARD_CATALOG;
  }

  list(organizationId: string, category?: string) {
    return this.prisma.eintDashboardBinding.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: { dashboardKey: 'asc' },
    });
  }

  async bootstrap(organizationId: string) {
    for (const d of EINT_DASHBOARD_CATALOG) {
      const exists = await this.prisma.eintDashboardBinding.findFirst({ where: { organizationId, dashboardKey: d.dashboardKey } });
      if (!exists) {
        await this.prisma.eintDashboardBinding.create({
          data: {
            organizationId,
            dashboardKey: d.dashboardKey,
            name: d.name,
            category: d.category,
            layout: { columns: 12, rows: 8 },
            widgets: [],
            isCustom: d.dashboardKey === 'DB-CUSTOM',
            status: 'active',
          },
        });
      }
    }
    return this.list(organizationId);
  }

  async getDashboard(organizationId: string, userId: string, dashboardKey: string) {
    const binding = await this.prisma.eintDashboardBinding.findFirst({
      where: { organizationId, dashboardKey, status: 'active' },
    });
    if (!binding) return null;
    await this.audit.log(organizationId, 'EintDashboard', dashboardKey, 'dashboard_viewed', userId);
    let hedData: unknown = null;
    if (binding.category === 'hr') {
      hedData = await this.hed.dashboard(organizationId, userId).catch(() => null);
    }
    return { binding, hedData, widgets: binding.widgets };
  }

  async updateLayout(organizationId: string, dashboardKey: string, layout: Record<string, unknown>, widgets: unknown[]) {
    const binding = await this.prisma.eintDashboardBinding.findFirst({ where: { organizationId, dashboardKey } });
    if (!binding) return null;
    return this.prisma.eintDashboardBinding.update({
      where: { id: binding.id },
      data: { layout: layout as object, widgets: widgets as object, isCustom: true },
    });
  }
}
