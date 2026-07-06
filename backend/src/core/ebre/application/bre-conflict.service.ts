import { Injectable } from '@nestjs/common';
import { WorkflowRuleGroup } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreConflictService {
  constructor(private readonly prisma: PrismaService) {}

  async detectConflicts(
    organizationId: string,
    ruleId: string,
    eventTypes: string[],
    priority: number,
  ) {
    const others = await this.prisma.breBusinessRule.findMany({
      where: {
        organizationId,
        status: 'published',
        deletedAt: null,
        id: { not: ruleId },
        eventTypes: { hasSome: eventTypes },
      },
    });

    const conflicts: Array<{ ruleKey: string; reason: string; severity: string }> = [];

    for (const other of others) {
      if (other.priority === priority) {
        conflicts.push({
          ruleKey: other.ruleKey,
          reason: 'same_priority_same_event',
          severity: 'medium',
        });
      }
      const deps = (other.dependencies as string[]) ?? [];
      if (deps.includes(ruleId)) {
        conflicts.push({
          ruleKey: other.ruleKey,
          reason: 'circular_dependency_risk',
          severity: 'high',
        });
      }
    }

    return conflicts;
  }

  detectConditionOverlap(
    a: WorkflowRuleGroup | undefined,
    b: WorkflowRuleGroup | undefined,
  ): boolean {
    const fieldsA = this.extractFields(a);
    const fieldsB = this.extractFields(b);
    return fieldsA.some((f) => fieldsB.includes(f));
  }

  private extractFields(group?: WorkflowRuleGroup): string[] {
    if (!group) return [];
    const fields: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'condition' && typeof n.field === 'string') {
        fields.push(n.field);
      }
      for (const key of ['all', 'any', 'then', 'else']) {
        const val = n[key];
        if (Array.isArray(val)) val.forEach(walk);
        else if (val) walk(val);
      }
      if (n.if) walk(n.if);
    };
    walk(group);
    return fields;
  }
}
