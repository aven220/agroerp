import { Injectable } from '@nestjs/common';
import { AccessContext, AuthorizationService } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PolicyEngineService } from './policy-engine.service';

export interface EffectivePermissions {
  permissions: string[];
  roles: string[];
  delegatedPermissions: string[];
  scopes: { scopeType: string; scopeId: string }[];
}

@Injectable()
export class AccessControlService implements AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  async resolveUserAccess(userId: string, organizationId: string): Promise<EffectivePermissions> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        userGroups: {
          include: {
            group: {
              include: {
                roleGroups: {
                  include: {
                    role: {
                      include: {
                        rolePermissions: { include: { permission: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        userScopes: true,
        delegationsTo: {
          where: {
            active: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        },
        substitutionsAs: {
          where: {
            active: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        },
      },
    });

    if (!user) {
      return { permissions: [], roles: [], delegatedPermissions: [], scopes: [] };
    }

    const now = new Date();
    const temporaryRoles = await this.prisma.iamTemporaryRole.findMany({
      where: {
        userId,
        organizationId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    const rolePerms = [
      ...user.userRoles.flatMap((ur) => {
        if (ur.role.organizationId !== organizationId) return [];
        return ur.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        );
      }),
      ...temporaryRoles.flatMap((tr) =>
        tr.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      ),
    ];

    const groupPerms = user.userGroups.flatMap((ug) =>
      ug.group.roleGroups.flatMap((rg) =>
        rg.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      ),
    );

    const delegatedPerms = user.delegationsTo.flatMap((d) =>
      (d.permissions as string[]) ?? [],
    );

    const roles = [
      ...new Set([
        ...user.userRoles
          .filter((ur) => ur.role.organizationId === organizationId)
          .map((ur) => ur.role.slug),
        ...temporaryRoles.map((tr) => tr.role.slug),
        ...user.substitutionsAs.flatMap((s) => (s.roleSlugs as string[]) ?? []),
      ]),
    ];

    let permissions = [...new Set([...rolePerms, ...groupPerms, ...delegatedPerms])];

    if (roles.includes('admin')) {
      permissions = ['*:*', ...permissions];
    }

    return {
      permissions,
      roles,
      delegatedPermissions: delegatedPerms,
      scopes: user.userScopes.map((s) => ({
        scopeType: s.scopeType,
        scopeId: s.scopeId,
      })),
    };
  }

  hasPermission(permissions: string[], required: string): boolean {
    if (permissions.includes('*:*')) return true;
    if (permissions.includes(required)) return true;
    const [resource, action] = required.split(':');
    if (permissions.includes(`${resource}:*`)) return true;
    if (permissions.includes(`*:${action}`)) return true;
    return false;
  }

  async authorize(context: AccessContext, required: string[]): Promise<boolean> {
    const rbacOk = required.every((perm) =>
      this.hasPermission(context.permissions, perm),
    );
    if (!rbacOk) return false;

    for (const perm of required) {
      const [resource, action] = perm.split(':');
      const policyResult = await this.policyEngine.evaluate(
        context.organizationId,
        { ...context, resource, action },
      );

      if (!policyResult.allowed && policyResult.matchedPolicies.length > 0) {
        return false;
      }
    }

    return true;
  }
}
