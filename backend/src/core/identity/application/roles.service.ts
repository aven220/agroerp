import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    try {
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
    } catch (err) {
      this.rethrowPrisma(err, 'No se pudo crear el rol');
    }
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRoleDto,
    _userId: string,
  ) {
    const role = await this.findOne(organizationId, id);
    if (role.isSystem && dto.slug && dto.slug !== role.slug) {
      throw new ConflictException('Cannot change system role slug');
    }

    // Solo validar colisión si el slug realmente cambia.
    const nextSlug = dto.slug !== undefined ? dto.slug : role.slug;
    if (nextSlug !== role.slug) {
      const clash = await this.prisma.role.findFirst({
        where: { organizationId, slug: nextSlug, NOT: { id } },
      });
      if (clash) throw new ConflictException('Role slug already exists');
    }

    const data: Prisma.RoleUpdateInput = {};
    if (dto.name !== undefined && dto.name !== role.name) data.name = dto.name;
    if (dto.slug !== undefined && dto.slug !== role.slug) data.slug = dto.slug;
    if (dto.description !== undefined && dto.description !== (role.description ?? undefined)) {
      data.description = dto.description;
    }

    try {
      if (Object.keys(data).length > 0) {
        await this.prisma.role.update({ where: { id }, data });
      }

      if (dto.permissionKeys !== undefined) {
        await this.syncPermissions(id, dto.permissionKeys);
      }

      return this.findOne(organizationId, id);
    } catch (err) {
      this.rethrowPrisma(err, 'No se pudo actualizar el rol');
    }
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
    const uniqueKeys = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];

    const permissions = await this.prisma.permission.findMany();
    const byKey = new Map<string, { id: string }[]>();
    for (const p of permissions) {
      const key = `${p.resource}:${p.action}`;
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }

    const matchedIds = new Set<string>();
    const unknown: string[] = [];
    for (const key of uniqueKeys) {
      const rows = byKey.get(key);
      if (!rows?.length) {
        unknown.push(key);
        continue;
      }
      for (const row of rows) matchedIds.add(row.id);
    }

    if (unknown.length > 0 && matchedIds.size === 0 && uniqueKeys.length > 0) {
      throw new BadRequestException(
        `Ningún permiso es válido. Revise la selección (ej.: ${unknown.slice(0, 3).join(', ')}).`,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (matchedIds.size > 0) {
          await tx.rolePermission.createMany({
            data: [...matchedIds].map((permissionId) => ({ roleId, permissionId })),
            skipDuplicates: true,
          });
        }
      });
    } catch (err) {
      this.rethrowPrisma(err, 'No se pudieron guardar los permisos del rol');
    }
  }

  private rethrowPrisma(err: unknown, fallback: string): never {
    if (err instanceof HttpException) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException('Ya existe un rol con ese identificador.');
      }
      if (err.code === 'P2003') {
        throw new BadRequestException('Hay permisos inválidos o referencias rotas. Intente de nuevo.');
      }
      if (err.code === 'P2025') {
        throw new NotFoundException('El rol ya no existe.');
      }
    }
    throw new InternalServerErrorException(fallback);
  }
}
