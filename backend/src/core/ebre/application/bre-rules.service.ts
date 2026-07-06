import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessRuleDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BreAuditService } from './bre-audit.service';

@Injectable()
export class BreRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: BreAuditService,
  ) {}

  findAll(organizationId: string, status?: string, groupKey?: string) {
    return this.prisma.breBusinessRule.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status: status as 'draft' } : {}),
        ...(groupKey ? { group: { groupKey } } : {}),
      },
      include: { group: true, decisionTable: { select: { tableKey: true, name: true } } },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const rule = await this.prisma.breBusinessRule.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { group: true, decisionTable: true },
    });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    return rule;
  }

  async create(organizationId: string, userId: string, dto: BusinessRuleDefinition) {
    const existing = await this.prisma.breBusinessRule.findFirst({
      where: { organizationId, ruleKey: dto.ruleKey, deletedAt: null },
    });
    if (existing) throw new BadRequestException(`Regla ${dto.ruleKey} ya existe`);

    let groupId: string | undefined;
    if (dto.groupKey) {
      const group = await this.prisma.breRuleGroup.findFirst({
        where: { organizationId, groupKey: dto.groupKey },
      });
      groupId = group?.id;
    }

    let decisionTableId: string | undefined;
    if (dto.decisionTableKey) {
      const table = await this.prisma.breDecisionTable.findFirst({
        where: { organizationId, tableKey: dto.decisionTableKey },
      });
      decisionTableId = table?.id;
    }

    const rule = await this.prisma.breBusinessRule.create({
      data: {
        organizationId,
        groupId,
        ruleKey: dto.ruleKey,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 100,
        triggerType: dto.triggerType ?? 'event',
        eventTypes: dto.eventTypes ?? [],
        eventCategory: dto.eventCategory ?? 'generic',
        conditions: (dto.conditions ?? {}) as object,
        expressions: (dto.expressions ?? []) as object,
        actions: (dto.actions ?? []) as object,
        dependencies: dto.dependencies ?? [],
        schedule: (dto.schedule ?? {}) as object,
        decisionTableId,
        metadata: (dto.metadata ?? {}) as object,
        aiReadiness: (dto.aiReadiness ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.record(organizationId, 'created', { ruleKey: dto.ruleKey }, rule.id, userId);
    return rule;
  }

  async update(organizationId: string, id: string, userId: string, dto: Partial<BusinessRuleDefinition>) {
    const rule = await this.findOne(organizationId, id);

    let groupId = rule.groupId;
    if (dto.groupKey) {
      const group = await this.prisma.breRuleGroup.findFirst({
        where: { organizationId, groupKey: dto.groupKey },
      });
      groupId = group?.id ?? null;
    }

    let decisionTableId = rule.decisionTableId;
    if (dto.decisionTableKey) {
      const table = await this.prisma.breDecisionTable.findFirst({
        where: { organizationId, tableKey: dto.decisionTableKey },
      });
      decisionTableId = table?.id ?? null;
    }

    const updated = await this.prisma.breBusinessRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        triggerType: dto.triggerType,
        eventTypes: dto.eventTypes,
        eventCategory: dto.eventCategory,
        conditions: dto.conditions as object,
        expressions: dto.expressions as object,
        actions: dto.actions as object,
        dependencies: dto.dependencies,
        schedule: dto.schedule as object,
        groupId,
        decisionTableId,
        metadata: dto.metadata as object,
        aiReadiness: dto.aiReadiness as object,
        updatedBy: userId,
      },
    });

    await this.audit.record(organizationId, 'updated', { ruleKey: rule.ruleKey }, id, userId);
    return updated;
  }

  async clone(organizationId: string, id: string, userId: string, newKey: string, newName: string) {
    const source = await this.findOne(organizationId, id);
    return this.create(organizationId, userId, {
      ruleKey: newKey,
      name: newName,
      description: source.description ?? undefined,
      groupKey: source.group?.groupKey,
      priority: source.priority,
      triggerType: source.triggerType,
      eventTypes: source.eventTypes,
      eventCategory: source.eventCategory,
      conditions: source.conditions as BusinessRuleDefinition['conditions'],
      expressions: source.expressions as unknown as BusinessRuleDefinition['expressions'],
      actions: source.actions as unknown as BusinessRuleDefinition['actions'],
      dependencies: source.dependencies,
      schedule: source.schedule as BusinessRuleDefinition['schedule'],
      metadata: source.metadata as Record<string, unknown>,
      aiReadiness: source.aiReadiness as Record<string, boolean>,
    });
  }

  async version(organizationId: string, id: string, userId: string, changelog?: string) {
    const rule = await this.findOne(organizationId, id);
    const nextVersion = rule.version + 1;

    await this.prisma.breRuleVersion.create({
      data: {
        organizationId,
        ruleId: id,
        version: rule.version,
        snapshot: rule as object,
        changelog,
        createdBy: userId,
      },
    });

    const updated = await this.prisma.breBusinessRule.update({
      where: { id },
      data: { version: nextVersion, updatedBy: userId },
    });

    await this.audit.record(organizationId, 'versioned', { version: nextVersion }, id, userId);
    return updated;
  }

  listVersions(organizationId: string, ruleId: string) {
    return this.prisma.breRuleVersion.findMany({
      where: { organizationId, ruleId },
      orderBy: { version: 'desc' },
    });
  }

  async publish(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    const rule = await this.prisma.breBusinessRule.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.record(organizationId, 'published', { ruleKey: rule.ruleKey }, id, userId);
    return rule;
  }

  async unpublish(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    const rule = await this.prisma.breBusinessRule.update({
      where: { id },
      data: { status: 'inactive', updatedBy: userId },
    });
    await this.audit.record(organizationId, 'unpublished', { ruleKey: rule.ruleKey }, id, userId);
    return rule;
  }

  async softDelete(organizationId: string, id: string, userId: string) {
    const rule = await this.findOne(organizationId, id);
    await this.prisma.breBusinessRule.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'archived', updatedBy: userId },
    });
    await this.audit.record(organizationId, 'deleted', { ruleKey: rule.ruleKey }, id, userId);
    return { success: true };
  }

  async exportRule(organizationId: string, id: string) {
    const rule = await this.findOne(organizationId, id);
    return {
      ruleKey: rule.ruleKey,
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      triggerType: rule.triggerType,
      eventTypes: rule.eventTypes,
      eventCategory: rule.eventCategory,
      conditions: rule.conditions,
      expressions: rule.expressions,
      actions: rule.actions,
      dependencies: rule.dependencies,
      schedule: rule.schedule,
      metadata: rule.metadata,
      aiReadiness: rule.aiReadiness,
      groupKey: rule.group?.groupKey,
      decisionTableKey: rule.decisionTable?.tableKey,
    };
  }

  async importRule(organizationId: string, userId: string, payload: BusinessRuleDefinition) {
    const existing = await this.prisma.breBusinessRule.findFirst({
      where: { organizationId, ruleKey: payload.ruleKey, deletedAt: null },
    });
    if (existing) {
      return this.update(organizationId, existing.id, userId, payload);
    }
    const created = await this.create(organizationId, userId, payload);
    await this.audit.record(organizationId, 'imported', { ruleKey: payload.ruleKey }, created.id, userId);
    return created;
  }

  listExecutions(organizationId: string, ruleId?: string) {
    return this.prisma.breRuleExecution.findMany({
      where: { organizationId, ...(ruleId ? { ruleId } : {}) },
      orderBy: { executedAt: 'desc' },
      take: 200,
    });
  }
}
