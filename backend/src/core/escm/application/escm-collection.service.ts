import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  ESCALATION_LEVELS,
  generateActivityKey,
  generateCampaignKey,
  generateEscalationKey,
} from '../domain/escm-ar.engine';

@Injectable()
export class EscmCollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  listCampaigns(organizationId: string, status?: string) {
    return this.prisma.escmCollectionCampaign.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: { _count: { select: { activities: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createCampaign(
    organizationId: string,
    userId: string,
    input: {
      name: string;
      channel?: string;
      startDate?: string;
      endDate?: string;
      targetCriteria?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.escmCollectionCampaign.count({ where: { organizationId } });
    const campaignKey = generateCampaignKey(count + 1);

    const row = await this.prisma.escmCollectionCampaign.create({
      data: {
        organizationId,
        campaignKey,
        name: input.name,
        channel: input.channel ?? 'mixed',
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        targetCriteria: (input.targetCriteria ?? {}) as object,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'CollectionCampaign', campaignKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmCollectionCampaign', row.id, EVENT_TYPES.ESCM_COLLECTION_CAMPAIGN_CREATED, {
      campaignKey,
    });
    return row;
  }

  async activateCampaign(organizationId: string, userId: string, campaignKey: string) {
    const campaign = await this.prisma.escmCollectionCampaign.findFirst({
      where: { organizationId, campaignKey },
    });
    if (!campaign) throw new NotFoundException(`Campaña ${campaignKey} no encontrada`);

    const criteria = (campaign.targetCriteria ?? {}) as {
      minDaysPastDue?: number;
      riskClass?: string;
    };

    const receivables = await this.prisma.escmReceivable.findMany({
      where: {
        organizationId,
        status: { in: ['open', 'partial', 'overdue'] },
        ...(criteria.minDaysPastDue != null ? { daysPastDue: { gte: criteria.minDaysPastDue } } : {}),
        ...(criteria.riskClass ? { riskClass: criteria.riskClass as never } : {}),
      },
      take: 500,
    });

    const actCount = await this.prisma.escmCollectionActivity.count({ where: { organizationId } });
    let seq = actCount + 1;

    for (const r of receivables) {
      const activityKey = generateActivityKey(seq++);
      await this.prisma.escmCollectionActivity.create({
        data: {
          organizationId,
          activityKey,
          activityType: campaign.channel === 'email' ? 'email' : campaign.channel === 'call' ? 'call' : 'reminder',
          status: 'scheduled',
          campaignId: campaign.id,
          customerKey: r.customerKey,
          receivableId: r.id,
          channel: campaign.channel,
          subject: `Recordatorio de pago — ${r.invoiceKey}`,
          body: `Factura ${r.invoiceKey} con saldo ${r.balanceAmount} vence ${r.dueDate.toISOString().slice(0, 10)}`,
          scheduledAt: new Date(),
          createdBy: userId,
        },
      });
    }

    const updated = await this.prisma.escmCollectionCampaign.update({
      where: { id: campaign.id },
      data: { status: 'active', startDate: campaign.startDate ?? new Date() },
    });

    await this.audit.log(organizationId, 'CollectionCampaign', campaignKey, 'activated', userId, {
      activitiesCreated: receivables.length,
    });
    return { campaign: updated, activitiesCreated: receivables.length };
  }

  listActivities(organizationId: string, filters?: { status?: string; customerKey?: string; campaignKey?: string }) {
    return this.prisma.escmCollectionActivity.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.campaignKey ? { campaign: { campaignKey: filters.campaignKey } } : {}),
      },
      include: { campaign: true, receivable: true },
      orderBy: { scheduledAt: 'desc' },
      take: 500,
    });
  }

  async logCall(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      receivableKey?: string;
      outcome: string;
      notes?: string;
    },
  ) {
    let receivableId: string | undefined;
    if (input.receivableKey) {
      const r = await this.prisma.escmReceivable.findFirst({
        where: { organizationId, receivableKey: input.receivableKey },
      });
      receivableId = r?.id;
    }

    const count = await this.prisma.escmCollectionActivity.count({ where: { organizationId } });
    const row = await this.prisma.escmCollectionActivity.create({
      data: {
        organizationId,
        activityKey: generateActivityKey(count + 1),
        activityType: 'call',
        status: 'completed',
        customerKey: input.customerKey,
        receivableId,
        channel: 'call',
        completedAt: new Date(),
        outcome: input.outcome,
        notes: input.notes,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'CollectionActivity', row.activityKey, 'call_logged', userId);
    return row;
  }

  async sendReminder(
    organizationId: string,
    userId: string,
    receivableKey: string,
    channel: 'email' | 'reminder' = 'email',
  ) {
    const receivable = await this.prisma.escmReceivable.findFirst({
      where: { organizationId, receivableKey },
    });
    if (!receivable) throw new NotFoundException(`Cartera ${receivableKey} no encontrada`);

    const count = await this.prisma.escmCollectionActivity.count({ where: { organizationId } });
    const row = await this.prisma.escmCollectionActivity.create({
      data: {
        organizationId,
        activityKey: generateActivityKey(count + 1),
        activityType: channel === 'email' ? 'email' : 'reminder',
        status: 'sent',
        customerKey: receivable.customerKey,
        receivableId: receivable.id,
        channel,
        subject: `Recordatorio — ${receivable.invoiceKey}`,
        body: `Saldo pendiente: ${receivable.balanceAmount}`,
        scheduledAt: new Date(),
        completedAt: new Date(),
        createdBy: userId,
      },
    });

    await this.core.emitUserAction(organizationId, 'EscmCollectionActivity', row.id, EVENT_TYPES.ESCM_COLLECTION_REMINDER_SENT, {
      receivableKey,
      channel,
    });
    return row;
  }

  async escalate(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      receivableKey?: string;
      toLevel: number;
      reason: string;
    },
  ) {
    let receivableId: string | undefined;
    let fromLevel = 1;
    if (input.receivableKey) {
      const r = await this.prisma.escmReceivable.findFirst({
        where: { organizationId, receivableKey: input.receivableKey },
        include: { escalations: { orderBy: { escalatedAt: 'desc' }, take: 1 } },
      });
      if (!r) throw new NotFoundException(`Cartera ${input.receivableKey} no encontrada`);
      receivableId = r.id;
      fromLevel = r.escalations[0]?.toLevel ?? 1;
    }

    const levelDef = ESCALATION_LEVELS.find((l) => l.level === input.toLevel);
    if (!levelDef) throw new BadRequestException('Nivel de escalamiento inválido');

    const count = await this.prisma.escmCollectionEscalation.count({ where: { organizationId } });
    const escalationKey = generateEscalationKey(count + 1);

    const row = await this.prisma.escmCollectionEscalation.create({
      data: {
        organizationId,
        escalationKey,
        customerKey: input.customerKey,
        receivableId,
        fromLevel,
        toLevel: input.toLevel,
        reason: input.reason,
        escalatedBy: userId,
      },
    });

    const actCount = await this.prisma.escmCollectionActivity.count({ where: { organizationId } });
    await this.prisma.escmCollectionActivity.create({
      data: {
        organizationId,
        activityKey: generateActivityKey(actCount + 1),
        activityType: 'escalation',
        status: 'completed',
        customerKey: input.customerKey,
        receivableId,
        channel: 'internal',
        outcome: `Escalado a nivel ${input.toLevel}`,
        notes: input.reason,
        completedAt: new Date(),
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'CollectionEscalation', escalationKey, 'escalated', userId, {
      toLevel: input.toLevel,
    });
    await this.core.emitUserAction(organizationId, 'EscmCollectionEscalation', row.id, EVENT_TYPES.ESCM_COLLECTION_ESCALATED, {
      escalationKey,
      toLevel: input.toLevel,
    });
    return row;
  }

  async runAutoReminders(organizationId: string, userId: string) {
    const overdue = await this.prisma.escmReceivable.findMany({
      where: { organizationId, status: 'overdue', daysPastDue: { gte: 1 } },
      take: 200,
    });

    let sent = 0;
    for (const r of overdue) {
      const recent = await this.prisma.escmCollectionActivity.findFirst({
        where: {
          organizationId,
          receivableId: r.id,
          activityType: { in: ['email', 'reminder'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (recent) continue;
      await this.sendReminder(organizationId, userId, r.receivableKey, 'email');
      sent += 1;
    }
    return { sent };
  }
}
