import { Injectable } from '@nestjs/common';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { FarmTwinService } from '@/core/ftip/application/farm-twin.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { LotTwinService } from '@/core/fmdt/application/lot-twin.service';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import {
  extractPhotos,
  mapDocuments,
  mapRelatedForms,
} from '../application/workspace-entity.helpers';

interface Insight {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
}

@Injectable()
export class InsightsProvider implements WorkspaceProvider {
  readonly key = 'insights';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly farmTwin: FarmTwinService,
    private readonly lots: LotsService,
    private readonly lotTwin: LotTwinService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const insights = await this.generateInsights(context);

    return {
      section: { id: 'insights', title: 'Insights', priority: 10 },
      widgets: [
        {
          id: 'insights:main',
          type: 'insights',
          title: 'Recomendaciones',
          priority: 1,
          data: { insights, total: insights.length },
        },
      ],
    };
  }

  private async generateInsights(context: WorkspaceQueryContext): Promise<Insight[]> {
    const [documents, forms, twinInsights] = await Promise.all([
      this.loadDocuments(context),
      this.loadForms(context),
      this.loadTwinInsights(context),
    ]);

    const photos = extractPhotos(documents);
    const insights: Insight[] = [];

    if (documents.length === 0) {
      insights.push({
        id: 'missing-documents',
        severity: 'warning',
        title: 'Documentos',
        description: 'No existen documentos asociados.',
        actionLabel: 'Ir a documentos',
        actionRoute: '#uew-documents',
      });
    }

    if (photos.length === 0) {
      insights.push({
        id: 'missing-photos',
        severity: 'info',
        title: 'Fotos',
        description: 'No hay fotos registradas para este registro.',
        actionLabel: 'Ir a galería',
        actionRoute: '#uew-gallery',
      });
    }

    const pendingForms = forms.filter(
      (form) => !String(form.status ?? '').toLowerCase().includes('approved'),
    );
    if (pendingForms.length > 0) {
      insights.push({
        id: 'pending-forms',
        severity: 'warning',
        title: 'Formularios pendientes',
        description: `${pendingForms.length} formulario(s) sin aprobar.`,
        actionLabel: 'Ver formularios',
        actionRoute: '#uew-forms',
      });
    }

    if (forms.length === 0) {
      insights.push({
        id: 'inactive-record',
        severity: 'info',
        title: 'Actividad',
        description: 'No hay formularios recientes asociados a este registro.',
        actionLabel: 'Ver formularios',
        actionRoute: '#uew-forms',
      });
    }

    insights.push(...twinInsights);

    return insights.sort(
      (a, b) => this.severityOrder(a.severity) - this.severityOrder(b.severity),
    );
  }

  private severityOrder(severity: Insight['severity']): number {
    switch (severity) {
      case 'error':
        return 0;
      case 'warning':
        return 1;
      default:
        return 2;
    }
  }

  private async loadDocuments(context: WorkspaceQueryContext) {
    switch (context.entityType) {
      case 'Producer': {
        const profile = await this.producers.findOne(context.organizationId, context.entityId);
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      case 'Farm': {
        const profile = await this.farms.findOne(context.organizationId, context.entityId);
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      case 'Lot': {
        const profile = await this.lots.findOne(context.organizationId, context.entityId);
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      default:
        return [];
    }
  }

  private async loadForms(context: WorkspaceQueryContext) {
    const all = await this.submissions.findAll(context.organizationId);
    return mapRelatedForms(all, context.entityId);
  }

  private async loadTwinInsights(context: WorkspaceQueryContext): Promise<Insight[]> {
    switch (context.entityType) {
      case 'Farm': {
        const twin = await this.farmTwin.getTwin(context.organizationId, context.entityId).catch(() => null);
        const aiInsights =
          (twin as { profile?: { aiInsights?: Array<{ id?: string; title?: string; summary?: string }> } } | null)
            ?.profile?.aiInsights ?? [];
        return aiInsights.map((item, index) => ({
          id: item.id ?? `farm-ai-${index}`,
          severity: 'info' as const,
          title: item.title ?? 'Insight del gemelo',
          description: item.summary ?? 'Recomendación del gemelo digital.',
        }));
      }
      case 'Lot': {
        const twin = await this.lotTwin.getTwin(context.organizationId, context.entityId).catch(() => null);
        const recommendations =
          (twin as { profile?: { recommendations?: Array<{ id?: string; title?: string; detail?: string }> } } | null)
            ?.profile?.recommendations ?? [];
        return recommendations.map((item, index) => ({
          id: item.id ?? `lot-rec-${index}`,
          severity: 'info' as const,
          title: item.title ?? 'Recomendación',
          description: item.detail ?? 'Recomendación operativa del lote.',
        }));
      }
      default:
        return [];
    }
  }
}
