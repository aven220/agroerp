import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreAiService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestRules(organizationId: string) {
    const executions = await this.prisma.breRuleExecution.groupBy({
      by: ['ruleKey'],
      where: { organizationId, executedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      _count: { id: true },
      _avg: { durationMs: true },
    });

    const rules = await this.prisma.breBusinessRule.findMany({
      where: { organizationId, deletedAt: null },
      select: { ruleKey: true, eventTypes: true, status: true },
    });

    const suggestions: Array<Record<string, unknown>> = [];

    for (const ex of executions) {
      if ((ex._avg.durationMs ?? 0) > 500) {
        suggestions.push({
          type: 'optimize_performance',
          ruleKey: ex.ruleKey,
          avgDurationMs: ex._avg.durationMs,
          recommendation: 'Simplificar condiciones o dividir acciones',
        });
      }
    }

    const publishedKeys = new Set(rules.filter((r) => r.status === 'published').map((r) => r.ruleKey));
    const eventMap = new Map<string, string[]>();
    for (const r of rules) {
      for (const et of r.eventTypes) {
        const list = eventMap.get(et) ?? [];
        list.push(r.ruleKey);
        eventMap.set(et, list);
      }
    }
    for (const [eventType, keys] of eventMap) {
      if (keys.length > 3) {
        suggestions.push({
          type: 'redundant_rules',
          eventType,
          ruleKeys: keys,
          recommendation: 'Consolidar reglas con condiciones similares',
        });
      }
    }

    const inactive = rules.filter((r) => r.status !== 'published' && publishedKeys.has(r.ruleKey));
    if (inactive.length) {
      suggestions.push({
        type: 'publish_drafts',
        count: inactive.length,
        recommendation: 'Revisar borradores pendientes de publicación',
      });
    }

    return suggestions;
  }

  explainDecision(
    ruleKey: string,
    matched: boolean,
    computed: Record<string, unknown>,
  ) {
    return {
      ruleKey,
      matched,
      summary: matched
        ? `La regla ${ruleKey} coincidió con el contexto evaluado`
        : `La regla ${ruleKey} no aplicó al contexto`,
      computed,
      explainability: {
        factors: Object.entries(computed).map(([k, v]) => ({ key: k, value: v })),
      },
    };
  }
}
