import { Injectable } from '@nestjs/common';
import { AccessContext } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamAbacService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: AccessContext, resource: string, action: string, attributes?: Record<string, unknown>) {
    const policies = await this.prisma.policy.findMany({
      where: {
        organizationId: context.organizationId,
        resource,
        action,
        effect: 'deny',
        active: true,
      },
      orderBy: { priority: 'desc' },
    });

    for (const policy of policies) {
      if (this.matchSubject(policy.subject as Record<string, unknown>, context)) {
        if (this.matchConditions(policy.conditions as Record<string, unknown>, context, attributes)) {
          return { allowed: false, policyId: policy.id };
        }
      }
    }
    return { allowed: true };
  }

  private matchSubject(subject: Record<string, unknown>, ctx: AccessContext): boolean {
    const roles = subject.roles as string[] | undefined;
    if (roles?.length && !roles.some((r) => ctx.roles.includes(r))) return false;
    const perms = subject.permissions as string[] | undefined;
    if (perms?.length && !perms.some((p) => ctx.permissions.includes(p))) return false;
    return true;
  }

  private matchConditions(
    conditions: Record<string, unknown>,
    ctx: AccessContext,
    attrs?: Record<string, unknown>,
  ): boolean {
    if (conditions.timeRange) {
      const tr = conditions.timeRange as { start: string; end: string };
      const h = new Date().getHours();
      const start = parseInt(tr.start, 10);
      const end = parseInt(tr.end, 10);
      if (h < start || h >= end) return false;
    }
    if (conditions.scopeType && conditions.scopeId) {
      const scopeVal = ctx.scope?.[String(conditions.scopeType)];
      if (scopeVal !== conditions.scopeId) return false;
    }
    if (conditions.attributeEq && attrs) {
      const { key, value } = conditions.attributeEq as { key: string; value: unknown };
      if (attrs[key] !== value) return false;
    }
    return true;
  }
}
