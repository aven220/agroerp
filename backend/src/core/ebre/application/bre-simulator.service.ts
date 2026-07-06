import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BreExecutorService } from './bre-executor.service';
import { BreConflictService } from './bre-conflict.service';
import { BreRulesService } from './bre-rules.service';

@Injectable()
export class BreSimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: BreExecutorService,
    private readonly conflicts: BreConflictService,
    private readonly rules: BreRulesService,
  ) {}

  async simulate(
    organizationId: string,
    ruleId: string,
    userId: string,
    inputContext: {
      eventType?: string;
      payload?: Record<string, unknown>;
      event?: Record<string, unknown>;
      variables?: Record<string, unknown>;
    },
  ) {
    const start = Date.now();
    const rule = await this.rules.findOne(organizationId, ruleId);

    const result = await this.executor.executeRule(rule, {
      eventType: inputContext.eventType ?? rule.eventTypes[0],
      payload: inputContext.payload,
      event: inputContext.event,
      variables: inputContext.variables,
      actorId: userId,
      dryRun: true,
    });

    const conflictList = await this.conflicts.detectConflicts(
      organizationId,
      ruleId,
      rule.eventTypes,
      rule.priority,
    );

    const performanceMs = Date.now() - start;

    const simulation = await this.prisma.breRuleSimulation.create({
      data: {
        organizationId,
        ruleId,
        inputContext: inputContext as object,
        results: [result] as object,
        conflicts: conflictList as object,
        performanceMs,
        createdBy: userId,
      },
    });

    return { ...result, conflicts: conflictList, simulationId: simulation.id, performanceMs };
  }

  async simulateBatch(
    organizationId: string,
    userId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const rules = await this.prisma.breBusinessRule.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: 'published',
        eventTypes: { has: eventType },
      },
      include: { decisionTable: true },
      orderBy: { priority: 'asc' },
    });

    const results = [];
    for (const rule of rules) {
      const r = await this.executor.executeRule(rule, {
        eventType,
        payload,
        dryRun: true,
        actorId: userId,
      });
      results.push({ ruleKey: rule.ruleKey, ...r });
    }

    return { eventType, results, totalRules: rules.length };
  }
}
