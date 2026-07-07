import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  FORM_CAMPAIGN_REPOSITORY,
  FORM_SUBMISSION_REPOSITORY,
  type FormCampaignRepository,
  type FormSubmissionRepository,
} from '../domain/interfaces';
import { FormsService } from './forms.service';

export type FormCampaignMetadata = {
  zones?: string[];
  municipalities?: string[];
  farms?: string[];
  assigneeUserIds?: string[];
};

@Injectable()
export class FormCampaignsService {
  constructor(
    @Inject(FORM_CAMPAIGN_REPOSITORY)
    private readonly campaignRepository: FormCampaignRepository,
    @Inject(FORM_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: FormSubmissionRepository,
    private readonly core: CoreEngineService,
    private readonly forms: FormsService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { status?: string; formId?: string; search?: string },
  ) {
    return this.campaignRepository.findMany({
      organizationId,
      status: filters?.status,
      formId: filters?.formId,
      search: filters?.search,
    });
  }

  async findOne(organizationId: string, id: string) {
    const campaign = await this.campaignRepository.findFirstByOrgAndId(
      organizationId,
      id,
    );
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      formId: string;
      startsAt?: string;
      endsAt?: string;
      expectedCount?: number;
      metadata?: FormCampaignMetadata;
    },
    ctx?: RequestContext,
  ) {
    const existing = await this.campaignRepository.findByCode(
      organizationId,
      data.code,
    );
    if (existing) {
      throw new ConflictException(`Campaign code "${data.code}" already exists`);
    }

    const form = await this.forms.findOne(organizationId, data.formId);
    if (form.status !== 'published') {
      throw new UnprocessableEntityException(
        'El formulario debe estar publicado para asociarlo a una campaña',
      );
    }

    const campaign = await this.campaignRepository.create({
      organizationId,
      code: data.code,
      name: data.name,
      description: data.description,
      formId: data.formId,
      status: 'draft',
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      expectedCount: data.expectedCount,
      metadata: (data.metadata ?? {}) as object,
      createdBy: userId,
    });

    await this.core.emitUserAction(
      organizationId,
      'FormCampaign',
      campaign.id,
      'FORM_CAMPAIGN_CREATED',
      { code: campaign.code, formId: data.formId },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return campaign;
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      startsAt?: string;
      endsAt?: string;
      expectedCount?: number;
      metadata?: FormCampaignMetadata;
    },
  ) {
    const campaign = await this.findOne(organizationId, id);
    if (campaign.status === 'archived') {
      throw new UnprocessableEntityException('No se puede editar una campaña archivada');
    }
    return this.campaignRepository.update(id, {
      name: data.name,
      description: data.description,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      expectedCount: data.expectedCount,
      ...(data.metadata ? { metadata: data.metadata as object } : {}),
    });
  }

  async activate(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const campaign = await this.findOne(organizationId, id);
    if (campaign.form?.status !== 'published') {
      throw new UnprocessableEntityException('Publique el formulario antes de activar la campaña');
    }
    const updated = await this.campaignRepository.updateStatus(id, 'active');
    await this.core.emitUserAction(
      organizationId,
      'FormCampaign',
      id,
      'FORM_CAMPAIGN_ACTIVATED',
      { code: campaign.code },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async close(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    await this.findOne(organizationId, id);
    const updated = await this.campaignRepository.updateStatus(id, 'closed');
    await this.core.emitUserAction(
      organizationId,
      'FormCampaign',
      id,
      'FORM_CAMPAIGN_CLOSED',
      {},
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async archive(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    await this.findOne(organizationId, id);
    const updated = await this.campaignRepository.updateStatus(id, 'archived');
    await this.core.emitUserAction(
      organizationId,
      'FormCampaign',
      id,
      'FORM_CAMPAIGN_ARCHIVED',
      {},
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async getStats(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);
    const submissions = await this.submissionRepository.findStatsRowsByFormId(
      organizationId,
      campaign.formId,
    );

    const forCampaign = submissions.filter((s) => {
      const ctx = s.context as Record<string, unknown> | null;
      return ctx?.campaignId === id || ctx?.campaignCode === campaign.code;
    });

    const synced = forCampaign.filter((s) => s.syncStatus === 'synced').length;
    const pending = forCampaign.filter((s) => s.syncStatus === 'pending').length;
    const failed = forCampaign.filter((s) => s.syncStatus === 'conflict').length;
    const withGps = forCampaign.filter((s) => s.gpsLocation != null).length;

    return {
      campaignId: id,
      code: campaign.code,
      expectedCount: campaign.expectedCount ?? 0,
      collected: forCampaign.length,
      synced,
      pending,
      failed,
      withGps,
      progressPct:
        campaign.expectedCount && campaign.expectedCount > 0
          ? Math.round((forCampaign.length / campaign.expectedCount) * 100)
          : null,
    };
  }
}
