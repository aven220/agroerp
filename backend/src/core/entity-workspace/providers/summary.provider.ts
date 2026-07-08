import { Injectable } from '@nestjs/common';
import type { UreRecordSummary } from '@agroerp/shared';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import type { WorkspaceProvider, WorkspaceProviderResult } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import type { WorkspaceAction } from '../domain/workspace-action';
import {
  buildFarmRelationships,
  buildLotRelationships,
  buildProducerRelationships,
} from '../application/workspace-entity.helpers';

@Injectable()
export class SummaryProvider implements WorkspaceProvider {
  readonly key = 'summary';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly lots: LotsService,
  ) {}

  async fetch(context: WorkspaceQueryContext): Promise<WorkspaceProviderResult> {
    switch (context.entityType) {
      case 'Producer':
        return this.fetchProducer(context);
      case 'Farm':
        return this.fetchFarm(context);
      case 'Lot':
        return this.fetchLot(context);
      default:
        return this.emptyResult(context);
    }
  }

  private async fetchProducer(context: WorkspaceQueryContext) {
    const [profile, view360, indicators] = await Promise.all([
      this.producers.findOne(context.organizationId, context.entityId),
      this.producers.get360(context.organizationId, context.entityId),
      this.producers.getIndicators(context.organizationId, context.entityId),
    ]);

    const relationships = buildProducerRelationships(profile);
    const summary: UreRecordSummary = {
      entityType: 'Producer',
      recordId: context.entityId,
      title: String(profile.legalName ?? profile.producerNumber ?? context.entityId),
      subtitle: profile.documentNumber ? `Doc. ${profile.documentNumber}` : undefined,
      status: String(profile.lifecycleStatus ?? ''),
      badges: profile.producerTypeCode ? [String(profile.producerTypeCode)] : [],
      kpis: [
        {
          label: 'Riesgo',
          value: view360.scores?.risk ?? indicators.current?.riskScore ?? '—',
        },
        {
          label: 'Calidad',
          value: view360.scores?.quality ?? indicators.current?.qualityScore ?? '—',
        },
        { label: 'Fincas', value: relationships.length },
      ],
    };

    return {
      section: { id: 'summary', title: 'Resumen', priority: 1 },
      widgets: [
        {
          id: 'summary:main',
          type: 'summary',
          title: 'Resumen del registro',
          priority: 1,
          data: { summary, entity: profile as unknown as Record<string, unknown> },
        },
      ],
      actions: this.producerActions(context.entityId),
      workspaceMeta: {
        title: summary.title,
        subtitle: summary.subtitle ?? null,
      },
    };
  }

  private async fetchFarm(context: WorkspaceQueryContext) {
    const profile = await this.farms.findOne(context.organizationId, context.entityId);
    const relationships = buildFarmRelationships(profile);

    const summary: UreRecordSummary = {
      entityType: 'Farm',
      recordId: context.entityId,
      title: String(profile.farmName ?? profile.farmCode ?? context.entityId),
      subtitle: profile.municipalityCode ? `Municipio ${profile.municipalityCode}` : undefined,
      status: String(profile.status ?? ''),
      kpis: [
        { label: 'Área (ha)', value: Number(profile.totalAreaHa ?? 0) },
        { label: 'Lotes', value: relationships.filter((r) => r.entityType === 'Lot').length },
      ],
    };

    return {
      section: { id: 'summary', title: 'Resumen', priority: 1 },
      widgets: [
        {
          id: 'summary:main',
          type: 'summary',
          title: 'Resumen del registro',
          priority: 1,
          data: { summary, entity: profile as unknown as Record<string, unknown> },
        },
      ],
      actions: this.farmActions(context.entityId),
      workspaceMeta: {
        title: summary.title,
        subtitle: summary.subtitle ?? null,
      },
    };
  }

  private async fetchLot(context: WorkspaceQueryContext) {
    const profile = await this.lots.findOne(context.organizationId, context.entityId);
    const farmUnit = (profile as { farmUnit?: { farmName?: string } }).farmUnit;
    const ftipLot = (profile as { ftipLot?: { lotName?: string; areaHa?: unknown } }).ftipLot;

    const summary: UreRecordSummary = {
      entityType: 'Lot',
      recordId: context.entityId,
      title: String(ftipLot?.lotName ?? profile.lotCode ?? context.entityId),
      subtitle: farmUnit?.farmName,
      status: String(profile.status ?? ''),
      kpis: [{ label: 'Área (ha)', value: Number(ftipLot?.areaHa ?? 0) }],
    };

    return {
      section: { id: 'summary', title: 'Resumen', priority: 1 },
      widgets: [
        {
          id: 'summary:main',
          type: 'summary',
          title: 'Resumen del registro',
          priority: 1,
          data: { summary, entity: profile as unknown as Record<string, unknown> },
        },
      ],
      actions: this.lotActions(context.entityId),
      workspaceMeta: {
        title: summary.title,
        subtitle: summary.subtitle ?? null,
      },
    };
  }

  private emptyResult(context: WorkspaceQueryContext) {
    return {
      section: { id: 'summary', title: 'Resumen', priority: 1 },
      widgets: [
        {
          id: 'summary:main',
          type: 'summary',
          title: 'Resumen del registro',
          priority: 1,
          data: {
            summary: {
              entityType: context.entityType,
              recordId: context.entityId,
              title: context.entityId,
            },
            entity: {},
          },
        },
      ],
      workspaceMeta: { title: context.entityId, subtitle: null },
      actions: [],
    };
  }

  private producerActions(id: string): WorkspaceAction[] {
    return [
      { id: 'edit', label: 'Editar productor', action: 'navigate', href: `/productores/${id}/editar` },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/productores/${id}` },
      { id: 'forms', label: 'Formularios', action: 'scroll', href: '#uew-forms' },
    ];
  }

  private farmActions(id: string): WorkspaceAction[] {
    return [
      {
        id: 'edit',
        label: 'Editar finca',
        action: 'navigate',
        href: `/fincas/${id}/editar`,
        variant: 'primary',
      },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/fincas/${id}` },
      { id: 'twin', label: 'Gemelo digital', action: 'navigate', href: `/fincas/${id}?tab=twin` },
    ];
  }

  private lotActions(id: string): WorkspaceAction[] {
    return [
      {
        id: 'edit',
        label: 'Editar lote',
        action: 'navigate',
        href: `/lotes/${id}/editar`,
        variant: 'primary',
      },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/lotes/${id}` },
    ];
  }
}
