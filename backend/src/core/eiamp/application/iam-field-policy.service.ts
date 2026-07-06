import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamFieldPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, resourceType?: string) {
    return this.prisma.iamFieldPolicy.findMany({
      where: { organizationId, ...(resourceType ? { resourceType } : {}), isActive: true },
    });
  }

  async create(organizationId: string, data: {
    resourceType: string;
    fieldPath: string;
    effect?: string;
    roles?: string[];
    permissions?: string[];
    conditions?: Record<string, unknown>;
  }) {
    return this.prisma.iamFieldPolicy.create({
      data: {
        organizationId,
        resourceType: data.resourceType,
        fieldPath: data.fieldPath,
        effect: data.effect ?? 'deny',
        roles: data.roles ?? [],
        permissions: data.permissions ?? [],
        conditions: (data.conditions ?? {}) as object,
      },
    });
  }

  applyFieldSecurity<T extends Record<string, unknown>>(
    record: T,
    policies: Array<{ fieldPath: string; effect: string; roles: string[]; permissions: string[] }>,
    userRoles: string[],
    userPermissions: string[],
  ): T {
    const result = { ...record };
    for (const p of policies) {
      const roleMatch = !p.roles.length || p.roles.some((r) => userRoles.includes(r));
      const permMatch = !p.permissions.length || p.permissions.some((perm) => userPermissions.includes(perm));
      if (p.effect === 'deny' && (roleMatch || permMatch)) {
        this.maskField(result, p.fieldPath);
      }
    }
    return result;
  }

  private maskField(obj: Record<string, unknown>, path: string) {
    const parts = path.split('.');
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = cur[parts[i]];
      if (!next || typeof next !== 'object') return;
      cur = next as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = '[REDACTED]';
  }
}
