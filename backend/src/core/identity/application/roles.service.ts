import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { CreateRoleDto, UpdateRoleDto } from '../presentation/identity.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(organizationId: string, dto: CreateRoleDto, userId: string) {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, slug: dto.slug },
    });
    if (existing) throw new ConflictException('Role slug already exists');

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    if (dto.permissionKeys?.length) {
      await this.syncPermissions(role.id, dto.permissionKeys);
    }

    return this.findOne(organizationId, role.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRoleDto,
    userId: string,
  ) {
    const role = await this.findOne(organizationId, id);
    if (role.isSystem && dto.slug && dto.slug !== role.slug) {
      throw new ConflictException('Cannot change system role slug');
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    if (dto.permissionKeys) {
      await this.syncPermissions(id, dto.permissionKeys);
    }

    return this.findOne(organizationId, id);
  }

  async assignToUser(
    organizationId: string,
    roleId: string,
    targetUserId: string,
    assignedBy: string,
  ) {
    await this.findOne(organizationId, roleId);
    const member = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('User not found');
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: targetUserId, roleId } },
      update: {},
      create: { userId: targetUserId, roleId },
    });

    await this.core.emitUserAction(
      organizationId,
      'Role',
      roleId,
      EVENT_TYPES.ROLE_ASSIGNED,
      { targetUserId, assignedBy },
      { ctx: { userId: assignedBy, organizationId } },
    );

    return { success: true };
  }

  async revokeFromUser(
    organizationId: string,
    roleId: string,
    targetUserId: string,
    revokedBy: string,
  ) {
    await this.findOne(organizationId, roleId);
    const member = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('User not found');
    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId },
    });

    await this.core.emitUserAction(
      organizationId,
      'Role',
      roleId,
      EVENT_TYPES.ROLE_REVOKED,
      { targetUserId, revokedBy },
      { ctx: { userId: revokedBy, organizationId } },
    );

    return { success: true };
  }

  private async syncPermissions(roleId: string, keys: string[]) {
    const permissions = await this.prisma.permission.findMany();
    const matched = permissions.filter((p) =>
      keys.includes(`${p.resource}:${p.action}`),
    );

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (matched.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: matched.map((p) => ({ roleId, permissionId: p.id })),
      });
    }
  }
}
