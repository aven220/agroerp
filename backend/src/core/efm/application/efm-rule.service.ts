import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_ACCOUNTING_RULES } from '../domain/efm.catalogs';
import { evaluateConditions, generateRuleKey, type RuleCondition } from '../domain/efm-accounting.engine';

@Injectable()
export class EfmRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string, filters?: { sourceModule?: string; status?: string }) {
    return this.prisma.efmAccountingRule.findMany({
      where: {
        organizationId,
        ...(filters?.sourceModule ? { sourceModule: filters.sourceModule } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      orderBy: [{ priority: 'asc' }, { ruleKey: 'asc' }],
    });
  }

  getOne(organizationId: string, ruleKey: string) {
    return this.prisma.efmAccountingRule.findFirst({ where: { organizationId, ruleKey } });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      ruleKey?: string;
      name: string;
      sourceModule: string;
      eventType: string;
      debitAccountKey: string;
      creditAccountKey: string;
      conditions?: RuleCondition[];
      priority?: number;
      exceptions?: Record<string, unknown>[];
      validations?: Record<string, unknown>;
      companyKey?: string;
      countryCode?: string;
      coaVersionKey?: string;
      status?: string;
    },
  ) {
    const ruleKey = input.ruleKey ?? generateRuleKey(
      (await this.prisma.efmAccountingRule.count({ where: { organizationId } })) + 1,
    );
    const existing = await this.getOne(organizationId, ruleKey);

    const row = await this.prisma.efmAccountingRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey } },
      update: {
        name: input.name,
        sourceModule: input.sourceModule,
        eventType: input.eventType,
        debitAccountKey: input.debitAccountKey,
        creditAccountKey: input.creditAccountKey,
        conditions: (input.conditions ?? []) as object,
        priority: input.priority ?? 100,
        exceptions: (input.exceptions ?? []) as object,
        validations: (input.validations ?? {}) as object,
        companyKey: input.companyKey,
        countryCode: input.countryCode,
        coaVersionKey: input.coaVersionKey,
        status: (input.status ?? existing?.status ?? 'draft') as never,
        versionNumber: (existing?.versionNumber ?? 0) + 1,
        updatedBy: userId,
      },
      create: {
        organizationId,
        ruleKey,
        name: input.name,
        sourceModule: input.sourceModule,
        eventType: input.eventType,
        debitAccountKey: input.debitAccountKey,
        creditAccountKey: input.creditAccountKey,
        conditions: (input.conditions ?? []) as object,
        priority: input.priority ?? 100,
        exceptions: (input.exceptions ?? []) as object,
        validations: (input.validations ?? {}) as object,
        companyKey: input.companyKey,
        countryCode: input.countryCode,
        coaVersionKey: input.coaVersionKey,
        status: (input.status ?? 'draft') as never,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmAccountingRule', ruleKey, 'upserted', userId, { name: input.name }, row.versionNumber);
    await this.core.emitUserAction(organizationId, 'EfmAccountingRule', ruleKey, EVENT_TYPES.EFM_RULE_UPDATED, { name: input.name });
    return row;
  }

  async activate(organizationId: string, ruleKey: string, userId: string) {
    const rule = await this.getOne(organizationId, ruleKey);
    if (!rule) throw new NotFoundException(`Regla ${ruleKey} no encontrada`);
    const updated = await this.prisma.efmAccountingRule.update({
      where: { id: rule.id },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EfmAccountingRule', ruleKey, 'activated', userId);
    return updated;
  }

  async findMatchingRules(
    organizationId: string,
    eventType: string,
    context: Record<string, unknown>,
  ) {
    const rules = await this.prisma.efmAccountingRule.findMany({
      where: { organizationId, eventType, status: 'active' },
      orderBy: { priority: 'asc' },
    });
    return rules.filter((r) => {
      const conditions = (r.conditions ?? []) as RuleCondition[];
      const exceptions = (r.exceptions ?? []) as RuleCondition[];
      if (exceptions.length && evaluateConditions(exceptions, context)) return false;
      return evaluateConditions(conditions, context);
    });
  }

  validateRule(input: {
    debitAccountKey: string;
    creditAccountKey: string;
    conditions?: RuleCondition[];
  }) {
    const errors: string[] = [];
    if (!input.debitAccountKey) errors.push('Cuenta débito requerida');
    if (!input.creditAccountKey) errors.push('Cuenta crédito requerida');
    if (input.debitAccountKey === input.creditAccountKey) errors.push('Débito y crédito no pueden ser la misma cuenta');
    return errors;
  }

  async seed(organizationId: string, userId: string) {
    for (const r of DEFAULT_ACCOUNTING_RULES) {
      await this.upsert(organizationId, userId, { ...r, status: 'active' });
    }
    return this.list(organizationId);
  }
}
