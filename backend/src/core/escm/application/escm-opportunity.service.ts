import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmPipelineService } from './escm-pipeline.service';
import {
  computeWeightedValue,
  canMoveToStage,
  pipelineBoard,
  resolveStageProbability,
} from '../domain/escm-pipeline.engine';
import {
  generateOpportunityKey,
  mergeOfflineOpportunityUpdates,
  resolveOpportunityStatus,
  validateOpportunityInput,
} from '../domain/escm-opportunity.engine';

@Injectable()
export class EscmOpportunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly pipeline: EscmPipelineService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      status?: string;
      stageKey?: string;
      assignedUserId?: string;
      customerKey?: string;
      q?: string;
    },
  ) {
    return this.prisma.escmOpportunity.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.stageKey ? { stageKey: filters.stageKey } : {}),
        ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: 'insensitive' } },
                { opportunityKey: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, opportunityKey: string) {
    const row = await this.prisma.escmOpportunity.findFirst({
      where: { organizationId, opportunityKey, deletedAt: null },
      include: {
        stageLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        customer: { select: { customerKey: true, legalName: true } },
        prospect: { select: { prospectKey: true, companyName: true } },
      },
    });
    if (!row) throw new NotFoundException(`Oportunidad ${opportunityKey} no encontrada`);
    return row;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      title: string;
      stageKey?: string;
      customerKey?: string;
      prospectKey?: string;
      contactKey?: string;
      estimatedValue?: number;
      probability?: number;
      expectedCloseDate?: string;
      assignedUserId?: string;
      competitors?: string[];
      description?: string;
    },
  ) {
    const err = validateOpportunityInput(input);
    if (err) throw new BadRequestException(err);
    const stages = await this.pipeline.list(organizationId);
    if (!stages.length) await this.pipeline.seedDefaults(organizationId, userId);
    const stageMap = await this.pipeline.getStageMap(organizationId);
    const stageKey = input.stageKey ?? 'prospect';
    const stage = stageMap.get(stageKey);
    if (!stage) throw new BadRequestException(`Etapa ${stageKey} no válida`);

    const customer = input.customerKey
      ? await this.prisma.escmCustomer.findFirst({ where: { organizationId, customerKey: input.customerKey } })
      : null;
    const prospect = input.prospectKey
      ? await this.prisma.escmProspect.findFirst({ where: { organizationId, prospectKey: input.prospectKey } })
      : null;

    const count = await this.prisma.escmOpportunity.count({ where: { organizationId } });
    const opportunityKey = generateOpportunityKey(count + 1);
    const probability = resolveStageProbability(
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
      stageKey,
      input.probability,
    );
    const estimatedValue = input.estimatedValue ?? 0;
    const weightedValue = computeWeightedValue(estimatedValue, probability);

    const row = await this.prisma.escmOpportunity.create({
      data: {
        organizationId,
        opportunityKey,
        title: input.title,
        stageKey,
        pipelineStageId: stage.id,
        status: resolveOpportunityStatus(stage),
        customerId: customer?.id,
        customerKey: customer?.customerKey,
        prospectId: prospect?.id,
        contactKey: input.contactKey,
        estimatedValue,
        probability,
        weightedValue,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
        assignedUserId: input.assignedUserId ?? userId,
        competitors: input.competitors ?? [],
        description: input.description,
        createdBy: userId,
      },
    });

    await this.prisma.escmOpportunityStageLog.create({
      data: {
        opportunityId: row.id,
        toStageKey: stageKey,
        toProbability: probability,
        changedBy: userId,
        reason: 'Creación',
      },
    });

    await this.audit.log(organizationId, 'Opportunity', opportunityKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmOpportunity', row.id, EVENT_TYPES.ESCM_OPPORTUNITY_CREATED, {
      opportunityKey,
      stageKey,
    });
    return row;
  }

  async changeStage(
    organizationId: string,
    userId: string,
    opportunityKey: string,
    input: {
      stageKey: string;
      probability?: number;
      winReason?: string;
      lossReason?: string;
      reason?: string;
    },
  ) {
    const opp = await this.getOne(organizationId, opportunityKey);
    const stages = await this.pipeline.list(organizationId);
    const stageDefs = stages.map((s) => ({
      stageKey: s.stageKey,
      name: s.name,
      sortOrder: s.sortOrder,
      defaultProbability: s.defaultProbability,
      isClosed: s.isClosed,
      isWon: s.isWon,
      isLost: s.isLost,
      isArchived: s.isArchived,
    }));
    if (!canMoveToStage(stageDefs, opp.stageKey, input.stageKey)) {
      throw new BadRequestException(`Transición ${opp.stageKey} → ${input.stageKey} no permitida`);
    }
    const stageMap = await this.pipeline.getStageMap(organizationId);
    const toStage = stageMap.get(input.stageKey);
    if (!toStage) throw new BadRequestException(`Etapa ${input.stageKey} no encontrada`);

    const probability = resolveStageProbability(stageDefs, input.stageKey, input.probability);
    const status = resolveOpportunityStatus(toStage);
    const weightedValue = computeWeightedValue(opp.estimatedValue, probability);

    const row = await this.prisma.escmOpportunity.update({
      where: { id: opp.id },
      data: {
        stageKey: input.stageKey,
        pipelineStageId: toStage.id,
        status,
        probability,
        weightedValue,
        winReason: toStage.isWon ? input.winReason : opp.winReason,
        lossReason: toStage.isLost ? input.lossReason : opp.lossReason,
        closedAt: toStage.isClosed ? new Date() : null,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.escmOpportunityStageLog.create({
      data: {
        opportunityId: opp.id,
        fromStageKey: opp.stageKey,
        toStageKey: input.stageKey,
        fromProbability: opp.probability,
        toProbability: probability,
        changedBy: userId,
        reason: input.reason,
      },
    });

    await this.audit.log(organizationId, 'Opportunity', opportunityKey, 'stage_changed', userId, {
      from: opp.stageKey,
      to: input.stageKey,
    });
    await this.core.emitUserAction(organizationId, 'EscmOpportunity', opp.id, EVENT_TYPES.ESCM_OPPORTUNITY_STAGE_CHANGED, {
      opportunityKey,
      from: opp.stageKey,
      to: input.stageKey,
    });
    if (status === 'won') {
      await this.core.emitUserAction(organizationId, 'EscmOpportunity', opp.id, EVENT_TYPES.ESCM_OPPORTUNITY_WON, { opportunityKey });
    }
    if (status === 'lost') {
      await this.core.emitUserAction(organizationId, 'EscmOpportunity', opp.id, EVENT_TYPES.ESCM_OPPORTUNITY_LOST, { opportunityKey });
    }
    return row;
  }

  async update(
    organizationId: string,
    userId: string,
    opportunityKey: string,
    input: Record<string, unknown>,
  ) {
    const opp = await this.getOne(organizationId, opportunityKey);
    const estimatedValue = input.estimatedValue != null ? Number(input.estimatedValue) : opp.estimatedValue;
    const probability = input.probability != null ? Number(input.probability) : opp.probability;
    const weightedValue = computeWeightedValue(estimatedValue, probability);
    return this.prisma.escmOpportunity.update({
      where: { id: opp.id },
      data: {
        title: input.title as string | undefined,
        estimatedValue,
        probability,
        weightedValue,
        expectedCloseDate: input.expectedCloseDate ? new Date(String(input.expectedCloseDate)) : undefined,
        assignedUserId: input.assignedUserId as string | undefined,
        competitors: input.competitors as string[] | undefined,
        description: input.description as string | undefined,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
  }

  async pipelineView(organizationId: string) {
    const stages = await this.pipeline.list(organizationId);
    const opportunities = await this.list(organizationId, { status: 'open' });
    return {
      stages,
      board: pipelineBoard(
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
      totals: {
        count: opportunities.length,
        value: opportunities.reduce((s, o) => s + o.estimatedValue, 0),
        weighted: opportunities.reduce((s, o) => s + o.weightedValue, 0),
      },
    };
  }

  syncOfflineOpportunities(
    organizationId: string,
    userId: string,
    updates: Array<{
      opportunityKey: string;
      stageKey?: string;
      probability?: number;
      estimatedValue?: number;
      updatedAt: string;
    }>,
  ) {
    return Promise.all(
      mergeOfflineOpportunityUpdates([], updates).map(async (u) => {
        if (u.stageKey) {
          return this.changeStage(organizationId, userId, u.opportunityKey, {
            stageKey: u.stageKey,
            probability: u.probability,
            reason: 'Sync móvil',
          });
        }
        return this.update(organizationId, userId, u.opportunityKey, {
          estimatedValue: u.estimatedValue,
          probability: u.probability,
        });
      }),
    );
  }
}
