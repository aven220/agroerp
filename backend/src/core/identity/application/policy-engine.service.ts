import { Injectable } from '@nestjs/common';
import { AccessContext, PolicyCondition, PolicyDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface PolicyEvaluationResult {
  allowed: boolean;
  matchedPolicies: string[];
  denyReason?: string;
}

@Injectable()
export class PolicyEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    organizationId: string,
    context: AccessContext,
  ): Promise<PolicyEvaluationResult> {
    const policies = await this.prisma.policy.findMany({
      where: { organizationId, active: true },
      orderBy: { priority: 'desc' },
    });

    const matched: string[] = [];
    let explicitAllow = false;

    for (const policy of policies) {
      const def = this.toDefinition(policy);
      if (!this.matchesSubject(def, context)) continue;
      if (!this.matchesResourceAction(def, context)) continue;
      if (!this.evaluateConditions(def, context)) continue;

      matched.push(policy.id);

      if (def.effect === 'deny') {
        return {
          allowed: false,
          matchedPolicies: matched,
          denyReason: policy.name,
        };
      }
      explicitAllow = true;
    }

    return { allowed: explicitAllow, matchedPolicies: matched };
  }

  private toDefinition(policy: {
    effect: string;
    resource: string | null;
    action: string | null;
    subject: unknown;
    conditions: unknown;
  }): PolicyDefinition {
    return {
      effect: policy.effect as 'allow' | 'deny',
      resource: policy.resource ?? undefined,
      action: policy.action ?? undefined,
      subject: (policy.subject as PolicyDefinition['subject']) ?? {},
      conditions: policy.conditions as PolicyDefinition['conditions'],
    };
  }

  private matchesSubject(def: PolicyDefinition, ctx: AccessContext): boolean {
    const subject = def.subject ?? {};
    if (subject.userIds?.length && !subject.userIds.includes(ctx.userId)) {
      return false;
    }
    if (subject.roles?.length && !subject.roles.some((r) => ctx.roles.includes(r))) {
      return false;
    }
    if (subject.userTypes?.length && ctx.userType && !subject.userTypes.includes(ctx.userType)) {
      return false;
    }
    return true;
  }

  private matchesResourceAction(def: PolicyDefinition, ctx: AccessContext): boolean {
    if (def.resource && def.resource !== '*') {
      if (!ctx.resource || def.resource !== ctx.resource) return false;
    }
    if (def.action && def.action !== '*') {
      if (!ctx.action || def.action !== ctx.action) return false;
    }
    return true;
  }

  private evaluateConditions(def: PolicyDefinition, ctx: AccessContext): boolean {
    const raw = def.conditions;
    if (!raw) return true;

    if (Array.isArray(raw)) {
      return raw.every((c) => this.evaluateCondition(c, ctx));
    }

    const group = raw as { all?: PolicyCondition[]; any?: PolicyCondition[] };
    if (group.all?.length) {
      return group.all.every((c) => this.evaluateCondition(c, ctx));
    }
    if (group.any?.length) {
      return group.any.some((c) => this.evaluateCondition(c, ctx));
    }
    return true;
  }

  private evaluateCondition(condition: PolicyCondition, ctx: AccessContext): boolean {
    switch (condition.type) {
      case 'time_before': {
        const now = new Date();
        const [h, m] = String(condition.value).split(':').map(Number);
        const limit = new Date(now);
        limit.setHours(h, m ?? 0, 0, 0);
        return now <= limit;
      }
      case 'time_after': {
        const now = new Date();
        const [h, m] = String(condition.value).split(':').map(Number);
        const limit = new Date(now);
        limit.setHours(h, m ?? 0, 0, 0);
        return now >= limit;
      }
      case 'hours_since_create': {
        const createdAt = ctx.metadata?.resourceCreatedAt as string | undefined;
        if (!createdAt) return true;
        const hours =
          (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
        return hours <= Number(condition.value);
      }
      case 'device_trusted': {
        return ctx.metadata?.deviceTrusted === true;
      }
      case 'device_registered': {
        return !!ctx.deviceId;
      }
      case 'scope_municipality': {
        const allowed = condition.value as string[] | string;
        const current = ctx.scope?.municipality;
        if (!current) return false;
        const list = Array.isArray(allowed) ? allowed : [allowed];
        return list.includes(current);
      }
      case 'scope_org_unit': {
        const allowed = condition.value as string[] | string;
        const current = ctx.scope?.org_unit;
        if (!current) return false;
        const list = Array.isArray(allowed) ? allowed : [allowed];
        return list.includes(current);
      }
      case 'ip_in_range':
        return true;
      case 'action_eq':
        return ctx.action === condition.value;
      default:
        return true;
    }
  }
}
