import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { SessionsService } from './sessions.service';
import {
  CreateUserDto,
  LockUserDto,
  UpdateUserDto,
  UpdateUserProfileDto,
} from './dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly sessions: SessionsService,
  ) {}

  private readonly userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    userType: true,
    status: true,
    phone: true,
    locale: true,
    timezone: true,
    avatarFileId: true,
    signatureFileId: true,
    preferences: true,
    profile: true,
    lastLoginAt: true,
    lockedAt: true,
    lockedReason: true,
    expiresAt: true,
    version: true,
    createdAt: true,
    updatedAt: true,
  };

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        ...this.userSelect,
        userRoles: {
          include: { role: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        ...this.userSelect,
        metadata: true,
        userRoles: { include: { role: true } },
        userGroups: {
          include: { group: { select: { id: true, name: true, slug: true } } },
        },
        userScopes: true,
        teamMembers: {
          include: { team: { select: { id: true, name: true, slug: true } } },
        },
        _count: {
          select: {
            sessions: { where: { status: 'active' } },
            devices: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getActivity(organizationId: string, id: string, limit = 50) {
    await this.findOne(organizationId, id);

    const [sessions, auditLogs, events] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.auditLog.findMany({
        where: { userId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.event.findMany({
        where: { organizationId, userId: id },
        orderBy: { occurredAt: 'desc' },
        take: limit,
      }),
    ]);

    return { sessions, auditLogs, events };
  }

  async create(
    organizationId: string,
    dto: CreateUserDto,
    createdBy: string,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email already exists in organization');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        userType: dto.userType ?? 'internal',
        phone: dto.phone,
        locale: dto.locale,
        timezone: dto.timezone,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        profile: dto.documentNumber?.trim()
          ? { documentNumber: dto.documentNumber.trim() }
          : {},
      },
    });

    if (dto.roleSlugs?.length) {
      const roles = await this.prisma.role.findMany({
        where: { organizationId, slug: { in: dto.roleSlugs } },
      });
      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
      });
    }

    await this.core.emitUserCreated(
      organizationId,
      user.id,
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdBy,
      },
      { ctx: { userId: createdBy, organizationId } },
    );

    return this.findOne(organizationId, user.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateUserDto,
    updatedBy: string,
  ) {
    const existing = await this.findOne(organizationId, id);

    const data: {
      firstName?: string;
      lastName?: string;
      status?: UpdateUserDto['status'];
      userType?: UpdateUserDto['userType'];
      phone?: string;
      locale?: string;
      timezone?: string;
      expiresAt?: Date;
      profile?: object;
      passwordHash?: string;
      passwordChangedAt?: Date;
      lockedAt?: null;
      lockedReason?: null;
      failedLoginAttempts?: number;
    } = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      status: dto.status,
      userType: dto.userType,
      phone: dto.phone,
      locale: dto.locale,
      timezone: dto.timezone,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };

    const nextStatus = dto.status ?? existing.status;
    if (nextStatus === 'active') {
      data.lockedAt = null;
      data.lockedReason = null;
      data.failedLoginAttempts = 0;
    }

    if (dto.documentNumber !== undefined) {
      const currentProfile =
        typeof existing.profile === 'object' && existing.profile !== null
          ? (existing.profile as Record<string, unknown>)
          : {};
      data.profile = {
        ...currentProfile,
        documentNumber: dto.documentNumber.trim() || null,
      };
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.passwordChangedAt = new Date();
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (dto.roleSlugs) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      const roles = await this.prisma.role.findMany({
        where: { organizationId, slug: { in: dto.roleSlugs } },
      });
      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    await this.core.emitUserAction(
      organizationId,
      'User',
      id,
      'UserUpdated',
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status,
        userType: dto.userType,
        phone: dto.phone,
        locale: dto.locale,
        timezone: dto.timezone,
        expiresAt: dto.expiresAt,
        roleSlugs: dto.roleSlugs,
        documentNumber: dto.documentNumber,
        passwordChanged: Boolean(dto.password),
        updatedBy,
      },
      { ctx: { userId: updatedBy, organizationId } },
    );

    return this.findOne(organizationId, user.id);
  }

  async updateProfile(
    organizationId: string,
    id: string,
    dto: UpdateUserProfileDto,
    updatedBy: string,
  ) {
    await this.findOne(organizationId, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        phone: dto.phone,
        locale: dto.locale,
        timezone: dto.timezone,
        avatarFileId: dto.avatarFileId,
        signatureFileId: dto.signatureFileId,
        preferences: dto.preferences as object | undefined,
        profile: dto.profile as object | undefined,
        metadata: dto.metadata as object | undefined,
        version: { increment: 1 },
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      id,
      EVENT_TYPES.USER_UPDATED,
      { updatedBy, version: user.version },
      { ctx: { userId: updatedBy, organizationId } },
    );

    return this.findOne(organizationId, user.id);
  }

  async lock(
    organizationId: string,
    id: string,
    dto: LockUserDto,
    lockedBy: string,
  ) {
    await this.findOne(organizationId, id);

    await this.prisma.user.update({
      where: { id },
      data: {
        status: 'locked',
        lockedAt: new Date(),
        lockedReason: dto.reason,
      },
    });

    await this.sessions.revokeAllForUser(
      organizationId,
      id,
      'user_locked',
      lockedBy,
    );

    await this.core.emitUserAction(
      organizationId,
      'User',
      id,
      EVENT_TYPES.USER_LOCKED,
      { reason: dto.reason, lockedBy },
      { ctx: { userId: lockedBy, organizationId } },
    );

    return this.findOne(organizationId, id);
  }

  async unlock(organizationId: string, id: string, unlockedBy: string) {
    await this.findOne(organizationId, id);

    await this.prisma.user.update({
      where: { id },
      data: {
        status: 'active',
        lockedAt: null,
        lockedReason: null,
        failedLoginAttempts: 0,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      id,
      EVENT_TYPES.USER_UNLOCKED,
      { unlockedBy },
      { ctx: { userId: unlockedBy, organizationId } },
    );

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, deletedBy: string) {
    await this.findOne(organizationId, id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      id,
      'UserDeleted',
      { deletedBy },
      { ctx: { userId: deletedBy, organizationId } },
    );

    return { success: true };
  }
}
