import { Injectable } from '@nestjs/common';
import { BiVisualQueryDefinition, BiWidgetDefinition, BiWidgetType } from '@agroerp/shared';
import { BiQueryEngineService } from './bi-query-engine.service';
import { BiKpiService } from './bi-kpi.service';
import { BiAggregationService } from './bi-aggregation.service';

@Injectable()
export class BiWidgetService {
  constructor(
    private readonly queryEngine: BiQueryEngineService,
    private readonly kpiService: BiKpiService,
    private readonly aggregation: BiAggregationService,
  ) {}

  async resolveWidget(
    organizationId: string,
    widget: BiWidgetDefinition,
    category?: string,
  ) {
    if (widget.kpiKey) {
      const kpis = await this.kpiService.findAll(organizationId);
      const kpi = kpis.find((k) => k.kpiKey === widget.kpiKey);
      if (kpi) {
        const latest = kpi.history[0];
        return {
          type: widget.type,
          title: widget.title,
          data: {
            value: latest ? Number(latest.value) : null,
            target: kpi.targetValue ? Number(kpi.targetValue) : null,
            variancePct: latest?.variancePct ? Number(latest.variancePct) : null,
            unit: kpi.unit,
            color: kpi.color,
          },
        };
      }
    }

    if (widget.query) {
      const result = await this.queryEngine.execute(organizationId, widget.query);
      return this.formatForWidget(widget.type, widget.title, result.rows, widget.config);
    }

    if (category && (widget.type === 'kpi' || widget.type === 'indicator')) {
      const dash = await this.aggregation.getCategoryDashboard(organizationId, category);
      const kpis = (dash as { kpis?: Record<string, number> }).kpis ?? dash;
      return {
        type: widget.type,
        title: widget.title,
        data: { kpis },
      };
    }

    return { type: widget.type, title: widget.title, data: null };
  }

  async resolveDashboard(
    organizationId: string,
    widgets: BiWidgetDefinition[],
    category?: string,
  ) {
    const resolved = await Promise.all(
      widgets.map((w) => this.resolveWidget(organizationId, w, category)),
    );
    return resolved;
  }

  private formatForWidget(
    type: BiWidgetType,
    title: string,
    rows: Record<string, unknown>[],
    config?: Record<string, unknown>,
  ) {
    const labelKey = (config?.labelField as string) ?? Object.keys(rows[0] ?? {})[0];
    const valueKey = (config?.valueField as string) ?? Object.keys(rows[0] ?? {})[1];

    switch (type) {
      case 'kpi':
      case 'indicator':
      case 'gauge':
      case 'realtime': {
        const val = rows[0]?.[valueKey ?? 'value'] ?? rows[0]?.[Object.keys(rows[0] ?? {})[0]];
        return { type, title, data: { value: val } };
      }
      case 'bar':
      case 'line':
      case 'area':
      case 'pie':
      case 'radar':
      case 'treemap':
      case 'funnel':
        return {
          type,
          title,
          data: {
            series: rows.map((r) => ({
              label: String(r[labelKey] ?? ''),
              value: Number(r[valueKey] ?? 0),
            })),
          },
        };
      case 'heatmap':
        return {
          type,
          title,
          data: { matrix: rows },
        };
      case 'table':
      case 'card':
        return { type, title, data: { rows } };
      case 'calendar':
        return {
          type,
          title,
          data: {
            events: rows.map((r) => ({
              date: r.createdAt ?? r.registeredAt ?? r.occurredAt ?? r.capturedAt,
              label: String(r[labelKey] ?? r.id ?? ''),
            })),
          },
        };
      case 'map':
        return {
          type,
          title,
          data: {
            points: rows
              .filter((r) => r.latitude || r.municipalityCode)
              .map((r) => ({
                id: r.id,
                label: r.lotName ?? r.farmName ?? r.legalName ?? r.id,
                lat: r.latitude,
                lng: r.longitude,
                municipality: r.municipalityCode,
              })),
          },
        };
      case 'timeline':
        return {
          type,
          title,
          data: {
            items: rows.map((r) => ({
              at: r.occurredAt ?? r.createdAt ?? r.startedAt ?? r.capturedAt,
              label: String(r.eventType ?? r.status ?? r.name ?? r.id),
            })),
          },
        };
      default:
        return { type, title, data: { rows } };
    }
  }

  buildDefaultWidgets(category: string): BiWidgetDefinition[] {
    const base = (type: BiWidgetType, title: string, x: number, y: number): BiWidgetDefinition => ({
      id: `${category}-${type}-${x}-${y}`,
      type,
      title,
      x,
      y,
      w: type === 'kpi' || type === 'indicator' ? 3 : 6,
      h: type === 'table' ? 4 : 2,
    });

    const widgets: BiWidgetDefinition[] = [
      { ...base('kpi', 'Total productores', 0, 0), query: { dataSource: 'producers', aggregations: [{ field: 'id', fn: 'count', alias: 'total' }] } },
      { ...base('kpi', 'Total fincas', 3, 0), query: { dataSource: 'farms', aggregations: [{ field: 'id', fn: 'count', alias: 'total' }] } },
      { ...base('kpi', 'Total lotes', 6, 0), query: { dataSource: 'lots', aggregations: [{ field: 'id', fn: 'count', alias: 'total' }] } },
      { ...base('bar', 'Por tipo', 0, 2), query: { dataSource: 'lots', groupBy: ['lotTypeCode'], aggregations: [{ field: 'id', fn: 'count', alias: 'count' }] } },
      { ...base('table', 'Detalle', 6, 2), query: { dataSource: 'producers', limit: 10 } },
    ];

    if (category === 'gis') {
      widgets.push({ ...base('map', 'Mapa operativo', 0, 4), query: { dataSource: 'lots', limit: 50 } });
    }
    if (category === 'ai') {
      widgets.push({ ...base('indicator', 'Recomendaciones IA', 0, 4), kpiKey: 'ai-recommendations' });
    }

    return widgets;
  }
}
