import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamRowPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, resourceType?: string) {
    return this.prisma.iamRowPolicy.findMany({
      where: { organizationId, ...(resourceType ? { resourceType } : {}), isActive: true },
    });
  }

  async create(organizationId: string, data: {
    resourceType: string;
    policyKey: string;
    effect?: string;
    attribute: string;
    operator: string;
    value: string;
    roles?: string[];
  }) {
    return this.prisma.iamRowPolicy.create({
      data: {
        organizationId,
        resourceType: data.resourceType,
        policyKey: data.policyKey,
        effect: data.effect ?? 'allow',
        attribute: data.attribute,
        operator: data.operator,
        value: data.value,
        roles: data.roles ?? [],
      },
    });
  }

  filterRows<T extends Record<string, unknown>>(
    rows: T[],
    policies: Array<{ effect: string; attribute: string; operator: string; value: string; roles: string[] }>,
    userRoles: string[],
    userScopes: Record<string, string>,
  ): T[] {
    const applicable = policies.filter((p) => !p.roles.length || p.roles.some((r) => userRoles.includes(r)));
    if (!applicable.length) return rows;

    return rows.filter((row) => {
      for (const p of applicable) {
        const attrVal = String(row[p.attribute] ?? userScopes[p.attribute] ?? '');
        const match = this.evalOperator(attrVal, p.operator, p.value);
        if (p.effect === 'deny' && match) return false;
        if (p.effect === 'allow' && !match) return false;
      }
      return true;
    });
  }

  private evalOperator(left: string, op: string, right: string): boolean {
    switch (op) {
      case 'eq': return left === right;
      case 'neq': return left !== right;
      case 'in': return right.split(',').map((s) => s.trim()).includes(left);
      case 'contains': return left.includes(right);
      default: return false;
    }
  }
}
