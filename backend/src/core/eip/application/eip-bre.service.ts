import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipStatus } from '@agroerp/prisma-eip-client';
import { BreExecutorService } from '@/core/ebre/application/bre-executor.service';
import { BreRulesService } from '@/core/ebre/application/bre-rules.service';
import { BreMetricsService } from '@/core/ebre/application/bre-metrics.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { generateEipKey, simulateRuleLocally } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipBreService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly breRules: BreRulesService,
    private readonly breExecutor: BreExecutorService,
    private readonly breMetrics: BreMetricsService,
    private readonly audit: EipAuditService,
  ) {}

  async listBindings(organizationId: string, moduleRef?: string) {
    return this.prisma.eipRuleBinding.findMany({
      where: { organizationId, ...(moduleRef ? { moduleRef } : {}) },
      orderBy: [{ priority: 'asc' }, { bindingKey: 'asc' }],
    });
  }

  async createBinding(
    organizationId: string,
    userId: string,
    bindingKey: string,
    ruleKey: string,
    moduleRef: string,
    scope: string,
    priority: number,
  ) {
    const existing = await this.prisma.eipRuleBinding.findFirst({ where: { organizationId, bindingKey } });
    if (existing) throw new BadRequestException(`Binding ${bindingKey} ya existe`);
    const binding = await this.prisma.eipRuleBinding.create({
      data: {
        organizationId,
        bindingKey,
        ruleKey,
        moduleRef,
        scope,
        priority,
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EipRuleBinding', bindingKey, 'rule_binding_created', userId, { ruleKey, moduleRef });
    return binding;
  }

  async setBindingStatus(organizationId: string, userId: string, bindingKey: string, status: EipStatus) {
    const binding = await this.prisma.eipRuleBinding.findFirst({ where: { organizationId, bindingKey } });
    if (!binding) throw new NotFoundException('Binding no encontrado');
    const updated = await this.prisma.eipRuleBinding.update({
      where: { id: binding.id },
      data: { status, updatedBy: userId, version: binding.version + (status === 'active' ? 1 : 0) },
    });
    await this.audit.log(organizationId, 'EipRuleBinding', bindingKey, 'rule_binding_updated', userId, { status });
    return updated;
  }

  async listBreRules(organizationId: string, status?: string, groupKey?: string) {
    return this.breRules.findAll(organizationId, status, groupKey);
  }

  async simulateRule(organizationId: string, userId: string, ruleId: string, payload: Record<string, unknown>) {
    const rule = await this.breRules.findOne(organizationId, ruleId);
    const result = await this.breExecutor.executeRule(
      {
        id: rule.id,
        organizationId: rule.organizationId,
        ruleKey: rule.ruleKey,
        version: rule.version,
        conditions: rule.conditions,
        expressions: rule.expressions,
        actions: rule.actions,
        decisionTable: rule.decisionTable,
      },
      { payload, actorId: userId, dryRun: true },
    );
    await this.audit.log(organizationId, 'BreBusinessRule', rule.ruleKey, 'rule_simulated', userId, { matched: result.matched });
    return result;
  }

  async simulateBinding(organizationId: string, userId: string, bindingKey: string, context: Record<string, unknown>) {
    const binding = await this.prisma.eipRuleBinding.findFirst({ where: { organizationId, bindingKey } });
    if (!binding) throw new NotFoundException('Binding no encontrado');
    const rules = await this.breRules.findAll(organizationId, 'published');
    const rule = rules.find((r) => r.ruleKey === binding.ruleKey);
    if (rule) {
      return this.simulateRule(organizationId, userId, rule.id, context);
    }
    return simulateRuleLocally(
      binding.conditions as Record<string, unknown>,
      [],
      [],
      context,
    );
  }

  async metrics(organizationId: string) {
    return this.breMetrics.dashboard(organizationId);
  }

  async createBindingVersion(organizationId: string, userId: string, bindingKey: string) {
    const binding = await this.prisma.eipRuleBinding.findFirst({ where: { organizationId, bindingKey } });
    if (!binding) throw new NotFoundException('Binding no encontrado');
    const seq = await this.prisma.eipRuleBinding.count({ where: { organizationId } });
    const newKey = `${bindingKey}-v${binding.version + 1}`;
    return this.createBinding(organizationId, userId, newKey, binding.ruleKey, binding.moduleRef, binding.scope, binding.priority);
  }

  globalBindings(organizationId: string) {
    return this.prisma.eipRuleBinding.findMany({
      where: { organizationId, scope: 'global', status: 'active' },
      orderBy: { priority: 'asc' },
    });
  }

  moduleBindings(organizationId: string, moduleRef: string) {
    return this.prisma.eipRuleBinding.findMany({
      where: { organizationId, moduleRef, status: 'active' },
      orderBy: { priority: 'asc' },
    });
  }

  async testRule(organizationId: string, userId: string, ruleId: string, cases: Array<Record<string, unknown>>) {
    const results = [];
    for (const c of cases) {
      results.push(await this.simulateRule(organizationId, userId, ruleId, c));
    }
    return { total: cases.length, passed: results.filter((r) => r.matched).length, results };
  }
}
