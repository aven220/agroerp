import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  generateActivityKey,
  generateInteractionKey,
  generateProspectKey,
} from '../domain/escm-opportunity.engine';
import { pipelineBoard } from '../domain/escm-pipeline.engine';
import { EscmPipelineService } from './escm-pipeline.service';

@Injectable()
export class EscmCrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly pipeline: EscmPipelineService,
  ) {}

  async crmDashboard(organizationId: string) {
    const [
      prospects,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pendingActivities,
      quotations,
      approvedQuotations,
      recentInteractions,
      stages,
    ] = await Promise.all([
      this.prisma.escmProspect.count({ where: { organizationId, deletedAt: null, status: { not: 'archived' } } }),
      this.prisma.escmOpportunity.count({ where: { organizationId, deletedAt: null, status: 'open' } }),
      this.prisma.escmOpportunity.count({ where: { organizationId, deletedAt: null, status: 'won' } }),
      this.prisma.escmOpportunity.count({ where: { organizationId, deletedAt: null, status: 'lost' } }),
      this.prisma.escmActivity.count({ where: { organizationId, status: { in: ['pending', 'in_progress'] } } }),
      this.prisma.escmQuotation.count({ where: { organizationId, isCurrent: true } }),
      this.prisma.escmQuotation.count({ where: { organizationId, status: 'approved', isCurrent: true } }),
      this.prisma.escmInteraction.findMany({
        where: { organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
      this.pipeline.list(organizationId),
    ]);

    const opportunities = await this.prisma.escmOpportunity.findMany({
      where: { organizationId, deletedAt: null, status: 'open' },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const pipelineValue = opportunities.reduce((sum, o) => sum + o.estimatedValue, 0);
    const weightedPipeline = opportunities.reduce((sum, o) => sum + o.weightedValue, 0);

    return {
      prospects,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pendingActivities,
      quotations,
      approvedQuotations,
      pipelineValue,
      weightedPipeline,
      recentInteractions,
      pipelineBoard: pipelineBoard(
        stages.map((s) => ({
          stageKey: s.stageKey,
          name: s.name,
          sortOrder: s.sortOrder,
          defaultProbability: s.defaultProbability,
          isClosed: s.isClosed,
          isWon: s.isWon,
          isLost: s.isLost,
          isArchived: s.isArchived,
        })),
        opportunities,
      ),
      stages,
    };
  }

  listProspects(organizationId: string, status?: string) {
    return this.prisma.escmProspect.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async createProspect(
    organizationId: string,
    userId: string,
    input: {
      companyName: string;
      contactName?: string;
      email?: string;
      phone?: string;
      sourceKey?: string;
      assignedUserId?: string;
      notes?: string;
    },
  ) {
    if (!input.companyName?.trim()) throw new BadRequestException('Nombre de empresa requerido');
    const count = await this.prisma.escmProspect.count({ where: { organizationId } });
    const prospectKey = generateProspectKey(count + 1);
    const row = await this.prisma.escmProspect.create({
      data: {
        organizationId,
        prospectKey,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        sourceKey: input.sourceKey,
        assignedUserId: input.assignedUserId,
        notes: input.notes,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Prospect', prospectKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmProspect', row.id, EVENT_TYPES.ESCM_PROSPECT_CREATED, {
      prospectKey,
    });
    return row;
  }

  async convertProspect(organizationId: string, userId: string, prospectKey: string, customerKey: string) {
    const prospect = await this.prisma.escmProspect.findFirst({
      where: { organizationId, prospectKey, deletedAt: null },
    });
    if (!prospect) throw new NotFoundException(`Prospecto ${prospectKey} no encontrado`);
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
    const row = await this.prisma.escmProspect.update({
      where: { id: prospect.id },
      data: {
        status: 'converted',
        customerId: customer.id,
        convertedAt: new Date(),
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Prospect', prospectKey, 'converted', userId, { customerKey });
    return row;
  }

  listInteractions(
    organizationId: string,
    filters?: { customerKey?: string; opportunityKey?: string; prospectKey?: string },
  ) {
    return this.prisma.escmInteraction.findMany({
      where: {
        organizationId,
        ...(filters?.customerKey
          ? { customer: { customerKey: filters.customerKey } }
          : {}),
        ...(filters?.opportunityKey
          ? { opportunity: { opportunityKey: filters.opportunityKey } }
          : {}),
        ...(filters?.prospectKey
          ? { prospect: { prospectKey: filters.prospectKey } }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  async recordInteraction(
    organizationId: string,
    userId: string,
    input: {
      interactionType: string;
      subject?: string;
      body?: string;
      occurredAt?: string;
      durationMinutes?: number;
      customerKey?: string;
      prospectKey?: string;
      opportunityKey?: string;
      contactKey?: string;
    },
  ) {
    const interactionKey = generateInteractionKey(input.interactionType);
    const customer = input.customerKey
      ? await this.prisma.escmCustomer.findFirst({ where: { organizationId, customerKey: input.customerKey } })
      : null;
    const prospect = input.prospectKey
      ? await this.prisma.escmProspect.findFirst({ where: { organizationId, prospectKey: input.prospectKey } })
      : null;
    const opportunity = input.opportunityKey
      ? await this.prisma.escmOpportunity.findFirst({ where: { organizationId, opportunityKey: input.opportunityKey } })
      : null;
    const row = await this.prisma.escmInteraction.create({
      data: {
        organizationId,
        interactionKey,
        interactionType: input.interactionType as never,
        subject: input.subject,
        body: input.body,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        durationMinutes: input.durationMinutes,
        customerId: customer?.id,
        prospectId: prospect?.id,
        opportunityId: opportunity?.id,
        contactKey: input.contactKey,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Interaction', interactionKey, 'created', userId);
    return row;
  }

  listActivities(
    organizationId: string,
    filters?: { status?: string; assignedUserId?: string; from?: string; to?: string },
  ) {
    return this.prisma.escmActivity.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
        ...(filters?.from || filters?.to
          ? {
              dueAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async createActivity(
    organizationId: string,
    userId: string,
    input: {
      activityType: string;
      subject: string;
      description?: string;
      dueAt?: string;
      reminderAt?: string;
      customerKey?: string;
      prospectKey?: string;
      opportunityKey?: string;
      quotationKey?: string;
      assignedUserId?: string;
      priority?: number;
    },
  ) {
    if (!input.subject?.trim()) throw new BadRequestException('Asunto requerido');
    const activityKey = generateActivityKey(input.activityType);
    const customer = input.customerKey
      ? await this.prisma.escmCustomer.findFirst({ where: { organizationId, customerKey: input.customerKey } })
      : null;
    const prospect = input.prospectKey
      ? await this.prisma.escmProspect.findFirst({ where: { organizationId, prospectKey: input.prospectKey } })
      : null;
    const opportunity = input.opportunityKey
      ? await this.prisma.escmOpportunity.findFirst({ where: { organizationId, opportunityKey: input.opportunityKey } })
      : null;
    const quotation = input.quotationKey
      ? await this.prisma.escmQuotation.findFirst({ where: { organizationId, quotationKey: input.quotationKey } })
      : null;
    const row = await this.prisma.escmActivity.create({
      data: {
        organizationId,
        activityKey,
        activityType: input.activityType as never,
        subject: input.subject,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        reminderAt: input.reminderAt ? new Date(input.reminderAt) : undefined,
        customerId: customer?.id,
        prospectId: prospect?.id,
        opportunityId: opportunity?.id,
        quotationId: quotation?.id,
        assignedUserId: input.assignedUserId ?? userId,
        priority: input.priority ?? 50,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Activity', activityKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmActivity', row.id, EVENT_TYPES.ESCM_ACTIVITY_CREATED, {
      activityKey,
    });
    return row;
  }

  async completeActivity(organizationId: string, userId: string, activityKey: string) {
    const row = await this.prisma.escmActivity.findFirst({ where: { organizationId, activityKey } });
    if (!row) throw new NotFoundException(`Actividad ${activityKey} no encontrada`);
    return this.prisma.escmActivity.update({
      where: { id: row.id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async customerTimeline(organizationId: string, customerKey: string) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
    const [interactions, activities, opportunities, quotations, orders, visits] = await Promise.all([
      this.prisma.escmInteraction.findMany({
        where: { customerId: customer.id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      this.prisma.escmActivity.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.escmOpportunity.findMany({
        where: { customerId: customer.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.escmQuotation.findMany({
        where: { customerId: customer.id, isCurrent: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.escmSalesOrder.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.escmCustomerVisit.findMany({
        where: { customerId: customer.id },
        orderBy: { visitedAt: 'desc' },
        take: 50,
      }),
    ]);
    return { customer, interactions, activities, opportunities, quotations, orders, visits };
  }
}
