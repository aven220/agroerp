import { Injectable } from '@nestjs/common';
import type { UreAnalyticsMetric } from '@agroerp/shared';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { FarmTwinService } from '@/core/ftip/application/farm-twin.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { LotTwinService } from '@/core/fmdt/application/lot-twin.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';

@Injectable()
export class AnalyticsProvider implements WorkspaceProvider {
  readonly key = 'analytics';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly farmTwin: FarmTwinService,
    private readonly lots: LotsService,
    private readonly lotTwin: LotTwinService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const metrics = await this.loadMetrics(context);

    return {
      section: { id: 'analytics', title: 'Analítica', priority: 70, collapsed: true },
      widgets: [
        {
          id: 'analytics:main',
          type: 'analytics',
          title: 'Indicadores y métricas',
          priority: 1,
          data: { metrics, total: metrics.length },
        },
      ],
    };
  }

  private async loadMetrics(context: WorkspaceQueryContext): Promise<UreAnalyticsMetric[]> {
    switch (context.entityType) {
      case 'Producer':
        return this.producerMetrics(context);
      case 'Farm':
        return this.farmMetrics(context);
      case 'Lot':
        return this.lotMetrics(context);
      default:
        return [];
    }
  }

  private async producerMetrics(context: WorkspaceQueryContext): Promise<UreAnalyticsMetric[]> {
    const [view360, indicators] = await Promise.all([
      this.producers.get360(context.organizationId, context.entityId),
      this.producers.getIndicators(context.organizationId, context.entityId),
    ]);

    return [
      {
        key: 'risk',
        label: 'Score de riesgo',
        value: Number(indicators.current?.riskScore ?? 0),
      },
      {
        key: 'quality',
        label: 'Score de calidad',
        value: Number(indicators.current?.qualityScore ?? 0),
      },
      {
        key: 'purchases',
        label: 'Compras registradas',
        value: (view360.purchases as unknown[])?.length ?? 0,
      },
    ];
  }

  private async farmMetrics(context: WorkspaceQueryContext): Promise<UreAnalyticsMetric[]> {
    const profile = await this.farms.findOne(context.organizationId, context.entityId);
    const twin = await this.farmTwin.getTwin(context.organizationId, context.entityId).catch(() => null);
    const twinKpis = (twin as { twin?: { kpis?: Record<string, unknown> } } | null)?.twin?.kpis;

    if (twinKpis) {
      return Object.entries(twinKpis).map(([key, value]) => ({
        key,
        label: key,
        value: typeof value === 'number' ? value : String(value ?? ''),
      }));
    }

    return [{ key: 'area', label: 'Área total (ha)', value: Number(profile.totalAreaHa ?? 0) }];
  }

  private async lotMetrics(context: WorkspaceQueryContext): Promise<UreAnalyticsMetric[]> {
    const profile = await this.lots.findOne(context.organizationId, context.entityId);
    return [
      {
        key: 'operations',
        label: 'Operaciones recientes',
        value: ((profile as { operations?: unknown[] }).operations ?? []).length,
      },
    ];
  }
}
