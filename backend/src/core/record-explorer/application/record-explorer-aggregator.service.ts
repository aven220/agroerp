import { Injectable } from '@nestjs/common';
import type {
  UreAnalyticsMetric,
  UreDocument,
  UreFormLink,
  UrePhoto,
  UreQuickAction,
  UreRecordExplorerResponse,
  UreRecordSummary,
  UreRelationship,
  UreTimelineItem,
} from '@agroerp/shared';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { FarmTwinService } from '@/core/ftip/application/farm-twin.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { LotTwinService } from '@/core/fmdt/application/lot-twin.service';
import { EventService } from '@/core/events/application/event.service';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import { resolveUreEntity } from './record-explorer-entity.registry';

@Injectable()
export class RecordExplorerAggregatorService {
  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly farmTwin: FarmTwinService,
    private readonly lots: LotsService,
    private readonly lotTwin: LotTwinService,
    private readonly events: EventService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  async explore(
    organizationId: string,
    entityParam: string,
    recordId: string,
  ): Promise<UreRecordExplorerResponse> {
    const binding = resolveUreEntity(entityParam);

    switch (binding.entityType) {
      case 'Producer':
        return this.exploreProducer(organizationId, recordId, binding.aggregateType);
      case 'Farm':
        return this.exploreFarm(organizationId, recordId, binding.aggregateType);
      case 'Lot':
        return this.exploreLot(organizationId, recordId, binding.aggregateType);
      default:
        return this.emptyResponse(binding.entityType, recordId);
    }
  }

  private async exploreProducer(
    organizationId: string,
    id: string,
    aggregateType: string,
  ): Promise<UreRecordExplorerResponse> {
    const [profile, view360, timeline, indicators, domainEvents, forms] =
      await Promise.all([
        this.producers.findOne(organizationId, id),
        this.producers.get360(organizationId, id),
        this.producers.getTimeline(organizationId, id),
        this.producers.getIndicators(organizationId, id),
        this.events.getByAggregate(aggregateType, id, organizationId),
        this.loadRelatedForms(organizationId, id),
      ]);

    const entity = profile as unknown as Record<string, unknown>;
    const documents = this.mapDocuments((profile as { documents?: unknown[] }).documents);
    const photos = this.extractPhotos(documents);

    const relationships: UreRelationship[] = [
      ...((profile as { territoryLinks?: Array<{ farmUnit?: { id: string; farmName?: string } }> })
        .territoryLinks ?? []).map((link) => ({
        id: link.farmUnit?.id ?? '',
        entityType: 'Farm',
        label: link.farmUnit?.farmName ?? 'Finca',
        href: `/record-explorer/Farm/${link.farmUnit?.id}`,
      })),
    ];

    const summary: UreRecordSummary = {
      entityType: 'Producer',
      recordId: id,
      title: String(profile.legalName ?? profile.producerNumber ?? id),
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
        {
          label: 'Fincas',
          value: relationships.length,
        },
      ],
    };

    const analytics: UreAnalyticsMetric[] = [
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

    const events = this.mergeTimeline(
      this.normalizeTimelineItems(timeline),
      domainEvents,
    );

    return {
      summary,
      entity,
      forms,
      relationships,
      documents,
      photos,
      analytics,
      events,
      quickActions: this.producerQuickActions(id),
    };
  }

  private async exploreFarm(
    organizationId: string,
    id: string,
    aggregateType: string,
  ): Promise<UreRecordExplorerResponse> {
    const [profile, timeline, twin, domainEvents, forms] = await Promise.all([
      this.farms.findOne(organizationId, id),
      this.farms.getTimeline(organizationId, id),
      this.farmTwin.getTwin(organizationId, id).catch(() => null),
      this.events.getByAggregate(aggregateType, id, organizationId),
      this.loadRelatedForms(organizationId, id),
    ]);

    const entity = profile as unknown as Record<string, unknown>;
    const documents = this.mapDocuments((profile as { documents?: unknown[] }).documents);
    const photos = this.extractPhotos(documents);

    const relationships: UreRelationship[] = [
      ...((profile as { producerLinks?: Array<{ producer?: { id: string; legalName?: string } }> })
        .producerLinks ?? []).map((link) => ({
        id: link.producer?.id ?? '',
        entityType: 'Producer',
        label: link.producer?.legalName ?? 'Productor',
        href: `/record-explorer/Producer/${link.producer?.id}`,
      })),
      ...((profile as { lots?: Array<{ id: string; lotName?: string; lotCode?: string }> }).lots ??
        []).map((lot) => ({
        id: lot.id,
        entityType: 'Lot',
        label: lot.lotName ?? lot.lotCode ?? 'Lote',
        href: `/record-explorer/Lot/${lot.id}`,
      })),
    ];

    const summary: UreRecordSummary = {
      entityType: 'Farm',
      recordId: id,
      title: String(profile.farmName ?? profile.farmCode ?? id),
      subtitle: profile.municipalityCode ? `Municipio ${profile.municipalityCode}` : undefined,
      status: String(profile.status ?? ''),
      kpis: [
        { label: 'Área (ha)', value: Number(profile.totalAreaHa ?? 0) },
        { label: 'Lotes', value: ((profile as { lots?: unknown[] }).lots ?? []).length },
      ],
    };

    const twinKpis = (twin as { twin?: { kpis?: Record<string, unknown> } } | null)?.twin?.kpis;
    const analytics: UreAnalyticsMetric[] = twinKpis
      ? Object.entries(twinKpis).map(([key, value]) => ({
          key,
          label: key,
          value: typeof value === 'number' ? value : String(value ?? ''),
        }))
      : [{ key: 'area', label: 'Área total (ha)', value: Number(profile.totalAreaHa ?? 0) }];

    return {
      summary,
      entity,
      forms,
      relationships,
      documents,
      photos,
      analytics,
      events: this.mergeTimeline(
        this.normalizeTimelineItems(timeline),
        domainEvents,
      ),
      quickActions: this.farmQuickActions(id),
    };
  }

  private async exploreLot(
    organizationId: string,
    id: string,
    aggregateType: string,
  ): Promise<UreRecordExplorerResponse> {
    const [profile, timeline, twin, domainEvents, forms] = await Promise.all([
      this.lots.findOne(organizationId, id),
      this.lots.getTimeline(organizationId, id),
      this.lotTwin.getTwin(organizationId, id).catch(() => null),
      this.events.getByAggregate(aggregateType, id, organizationId),
      this.loadRelatedForms(organizationId, id),
    ]);

    const entity = profile as unknown as Record<string, unknown>;
    const documents = this.mapDocuments((profile as { documents?: unknown[] }).documents);
    const photos = this.extractPhotos(documents);

    const farmUnit = (profile as { farmUnit?: { id: string; farmName?: string } }).farmUnit;
    const producer = (profile as {
      responsibleProducer?: { id: string; legalName?: string };
    }).responsibleProducer;

    const relationships: UreRelationship[] = [
      ...(farmUnit
        ? [{
            id: farmUnit.id,
            entityType: 'Farm',
            label: farmUnit.farmName ?? 'Finca',
            href: `/record-explorer/Farm/${farmUnit.id}`,
          }]
        : []),
      ...(producer
        ? [{
            id: producer.id,
            entityType: 'Producer',
            label: producer.legalName ?? 'Productor',
            href: `/record-explorer/Producer/${producer.id}`,
          }]
        : []),
    ];

    const ftipLot = (profile as { ftipLot?: { lotName?: string; areaHa?: unknown } }).ftipLot;
    const summary: UreRecordSummary = {
      entityType: 'Lot',
      recordId: id,
      title: String(ftipLot?.lotName ?? profile.lotCode ?? id),
      subtitle: farmUnit?.farmName,
      status: String(profile.status ?? ''),
      kpis: [{ label: 'Área (ha)', value: Number(ftipLot?.areaHa ?? 0) }],
    };

    const analytics: UreAnalyticsMetric[] = [
      {
        key: 'operations',
        label: 'Operaciones recientes',
        value: ((profile as { operations?: unknown[] }).operations ?? []).length,
      },
    ];

    return {
      summary,
      entity,
      forms,
      relationships,
      documents,
      photos,
      analytics,
      events: this.mergeTimeline(
        this.normalizeTimelineItems(timeline),
        domainEvents,
      ),
      quickActions: this.lotQuickActions(id),
    };
  }

  private async loadRelatedForms(
    organizationId: string,
    recordId: string,
  ): Promise<UreFormLink[]> {
    const all = await this.submissions.findAll(organizationId);
    return all
      .filter((s) => {
        const data = (s.data ?? {}) as Record<string, unknown>;
        const ctx = (s.context ?? {}) as Record<string, unknown>;
        return (
          data.producerId === recordId ||
          data.producer_id === recordId ||
          data.farmId === recordId ||
          data.farm_id === recordId ||
          data.lotId === recordId ||
          data.lot_id === recordId ||
          ctx.entityId === recordId ||
          ctx.contextId === recordId
        );
      })
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        formId: s.formId,
        formKey: (s as { form?: { formKey?: string } }).form?.formKey,
        name: (s as { form?: { name?: string } }).form?.name,
        status: s.status,
        submittedAt: s.createdAt?.toISOString?.() ?? String(s.createdAt),
      }));
  }

  private mapDocuments(raw: unknown): UreDocument[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((doc) => {
      const d = doc as Record<string, unknown>;
      return {
        id: String(d.id ?? ''),
        title: (d.title as string) ?? null,
        documentTypeCode: (d.documentTypeCode as string) ?? null,
        mediaType: (d.mediaType as string) ?? null,
        contentId: (d.contentId as string) ?? null,
        createdAt: d.createdAt
          ? new Date(d.createdAt as string | Date).toISOString()
          : undefined,
      };
    });
  }

  private extractPhotos(documents: UreDocument[]): UrePhoto[] {
    return documents
      .filter((d) => {
        const mt = (d.mediaType ?? '').toLowerCase();
        const dt = (d.documentTypeCode ?? '').toLowerCase();
        return mt.includes('image') || mt.includes('photo') || dt.includes('photo');
      })
      .map((d) => ({
        id: d.id,
        title: d.title,
        contentId: d.contentId,
        capturedAt: d.createdAt,
      }));
  }

  private normalizeTimelineItems(timeline: unknown): UreTimelineItem[] {
    const items = (timeline as { items?: Array<Record<string, unknown>> }).items ?? [];
    return items.map((item) => ({
      id: String(item.id ?? ''),
      type: String(item.type ?? 'event'),
      occurredAt:
        item.occurredAt instanceof Date
          ? item.occurredAt.toISOString()
          : String(item.occurredAt ?? ''),
      title: String(item.title ?? ''),
      detail: (item.detail as string | null | undefined) ?? null,
      actorId: (item.actorId as string | null | undefined) ?? null,
    }));
  }

  private mergeTimeline(
    items: UreTimelineItem[],
    domainEvents: Array<{
      id?: string;
      eventType: string;
      occurredAt?: Date;
      userId?: string | null;
    }>,
  ): UreTimelineItem[] {
    const fromEvents: UreTimelineItem[] = domainEvents
      .filter((e) => e.occurredAt instanceof Date)
      .map((e) => ({
        id: e.id ?? `event-${e.eventType}-${e.occurredAt!.getTime()}`,
        type: 'domain_event',
        occurredAt: e.occurredAt!.toISOString(),
        title: e.eventType,
        detail: null,
        actorId: e.userId ?? null,
      }));
    const merged = [...items, ...fromEvents];
    const seen = new Set<string>();
    return merged
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, 80);
  }

  private producerQuickActions(id: string): UreQuickAction[] {
    return [
      { id: 'edit', label: 'Editar productor', action: 'navigate', href: `/productores/${id}/editar` },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/productores/${id}` },
      { id: 'forms', label: 'Formularios', action: 'scroll', href: '#ure-forms' },
    ];
  }

  private farmQuickActions(id: string): UreQuickAction[] {
    return [
      { id: 'edit', label: 'Editar finca', action: 'navigate', href: `/fincas/${id}/editar`, variant: 'primary' },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/fincas/${id}` },
      { id: 'twin', label: 'Gemelo digital', action: 'navigate', href: `/fincas/${id}?tab=twin` },
    ];
  }

  private lotQuickActions(id: string): UreQuickAction[] {
    return [
      { id: 'edit', label: 'Editar lote', action: 'navigate', href: `/lotes/${id}/editar`, variant: 'primary' },
      { id: 'legacy', label: 'Vista clásica', action: 'navigate', href: `/lotes/${id}` },
    ];
  }

  private emptyResponse(entityType: string, recordId: string): UreRecordExplorerResponse {
    return {
      summary: { entityType, recordId, title: recordId },
      entity: {},
      forms: [],
      relationships: [],
      documents: [],
      photos: [],
      analytics: [],
      events: [],
      quickActions: [],
    };
  }
}
