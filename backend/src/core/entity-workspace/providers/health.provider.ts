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
  levelFromScore,
  mapDocuments,
  mapRelatedForms,
} from '../application/workspace-entity.helpers';

interface HealthCheck {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
  score: number;
}

@Injectable()
export class HealthProvider implements WorkspaceProvider {
  readonly key = 'health';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly farmTwin: FarmTwinService,
    private readonly lots: LotsService,
    private readonly lotTwin: LotTwinService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const health = await this.evaluateHealth(context);

    return {
      section: { id: 'health', title: 'Salud del registro', priority: 5 },
      widgets: [
        {
          id: 'health:main',
          type: 'health',
          title: 'Estado de salud',
          priority: 1,
          data: health,
        },
      ],
    };
  }

  private async evaluateHealth(context: WorkspaceQueryContext) {
    const [documents, forms, twinSignals] = await Promise.all([
      this.loadDocuments(context),
      this.loadForms(context),
      this.loadTwinSignals(context),
    ]);

    const photos = extractPhotos(documents);
    const checks: HealthCheck[] = [
      this.buildCheck('documents', 'Documentos', documents.length > 0, 10),
      this.buildCheck('photos', 'Fotos', photos.length > 0, 10),
      this.buildCheck('forms', 'Formularios', forms.length > 0, 15),
      this.buildCheck('recent-forms', 'Formularios recientes', this.hasRecentForms(forms), 10),
      this.buildCheck(
        'completeness',
        'Completitud documental',
        (twinSignals.documentCompletenessPct ?? 0) >= 60,
        15,
      ),
      this.buildCheck(
        'risk',
        'Sin alertas de riesgo',
        !(twinSignals.riskFlags?.length ?? 0),
        20,
      ),
      this.buildCheck('profile', 'Perfil activo', twinSignals.profileActive, 20),
    ];

    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const score = Math.round(
      checks.reduce((sum, check) => sum + check.score, 0) / Math.max(totalWeight, 1) * 100,
    );
    const completed = checks.filter((check) => check.passed).length;

    return {
      score,
      level: levelFromScore(score),
      completed,
      total: checks.length,
      checks,
    };
  }

  private buildCheck(
    id: string,
    title: string,
    passed: boolean,
    weight: number,
  ): HealthCheck {
    return {
      id,
      title,
      description: passed ? `${title}: cumple.` : `${title}: requiere atención.`,
      passed,
      weight,
      score: passed ? weight : 0,
    };
  }

  private hasRecentForms(
    forms: Array<{ submittedAt?: string }>,
  ): boolean {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return forms.some((form) => {
      if (!form.submittedAt) return false;
      return new Date(form.submittedAt).getTime() >= cutoff;
    });
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

  private async loadTwinSignals(context: WorkspaceQueryContext) {
    switch (context.entityType) {
      case 'Producer': {
        const profile = await this.producers.findOne(context.organizationId, context.entityId);
        return {
          documentCompletenessPct: null as number | null,
          riskFlags: [] as string[],
          profileActive: String(profile.lifecycleStatus ?? '').toLowerCase() !== 'inactive',
        };
      }
      case 'Farm': {
        const [profile, twin] = await Promise.all([
          this.farms.findOne(context.organizationId, context.entityId),
          this.farmTwin.getTwin(context.organizationId, context.entityId).catch(() => null),
        ]);
        const twinData = (twin as { twin?: { documentCompletenessPct?: number; riskFlags?: string[] } } | null)?.twin;
        return {
          documentCompletenessPct: twinData?.documentCompletenessPct ?? null,
          riskFlags: twinData?.riskFlags ?? [],
          profileActive: String(profile.status ?? '').toLowerCase() !== 'inactive',
        };
      }
      case 'Lot': {
        const [profile, twin] = await Promise.all([
          this.lots.findOne(context.organizationId, context.entityId),
          this.lotTwin.getTwin(context.organizationId, context.entityId).catch(() => null),
        ]);
        const twinData = (twin as { twin?: { documentCompletenessPct?: number; riskFlags?: string[] } } | null)?.twin;
        return {
          documentCompletenessPct: twinData?.documentCompletenessPct ?? null,
          riskFlags: twinData?.riskFlags ?? [],
          profileActive: String(profile.status ?? '').toLowerCase() !== 'inactive',
        };
      }
      default:
        return {
          documentCompletenessPct: null,
          riskFlags: [],
          profileActive: true,
        };
    }
  }
}
