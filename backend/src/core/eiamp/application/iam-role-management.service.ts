import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { RolesService } from '@/core/identity/application/roles.service';
import { IAM_AUTH_PORT, IamAuthPort } from '../domain/iam-auth.port';
import { Inject, Optional } from '@nestjs/common';

@Injectable()
export class IamRoleManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    @Optional() @Inject(IAM_AUTH_PORT) private readonly iam?: IamAuthPort,
  ) {}

  async cloneRole(organizationId: string, roleId: string, newSlug: string, newName: string, userId: string) {
    const source = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!source) throw new NotFoundException('Rol no encontrado');

    const perms = source.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
    return this.roles.create(organizationId, {
      name: newName,
      slug: newSlug,
      description: `Clonado de ${source.slug}`,
      permissionKeys: perms,
    }, userId);
  }

  async versionRole(organizationId: string, roleId: string, userId: string, changelog?: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const last = await this.prisma.iamRoleVersion.findFirst({
      where: { roleId },
      orderBy: { version: 'desc' },
    });
    const version = (last?.version ?? 0) + 1;
    const permissions = role.rolePermissions.map((rp) => ({
      resource: rp.permission.resource,
      action: rp.permission.action,
    }));

    return this.prisma.iamRoleVersion.create({
      data: {
        organizationId,
        roleId,
        version,
        permissions: permissions as object,
        changelog,
        createdBy: userId,
      },
    });
  }

  async exportRole(organizationId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return {
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
        scope: rp.permission.scope,
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  async importRole(organizationId: string, data: {
    name: string;
    slug: string;
    description?: string;
    permissions: Array<{ resource: string; action: string }>;
  }) {
    return this.roles.create(organizationId, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      permissionKeys: data.permissions.map((p) => `${p.resource}:${p.action}`),
    }, 'system');
  }

  async grantTemporaryRole(
    organizationId: string,
    userId: string,
    roleId: string,
    grantedBy: string,
    startsAt: Date,
    endsAt: Date,
    reason?: string,
  ) {
    return this.prisma.iamTemporaryRole.create({
      data: { organizationId, userId, roleId, grantedBy, startsAt, endsAt, reason },
    });
  }

  async listVersions(organizationId: string, roleId: string) {
    return this.prisma.iamRoleVersion.findMany({
      where: { organizationId, roleId },
      orderBy: { version: 'desc' },
    });
  }
}
