import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CreateGroupDto, UpdateGroupDto } from '../presentation/identity.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.group.findMany({
      where: { organizationId },
      include: { _count: { select: { userGroups: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, organizationId },
      include: {
        userGroups: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        roleGroups: { include: { role: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async create(organizationId: string, dto: CreateGroupDto) {
    const existing = await this.prisma.group.findFirst({
      where: { organizationId, slug: dto.slug },
    });
    if (existing) throw new ConflictException('Group slug exists');

    return this.prisma.group.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        type: dto.type ?? 'security',
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateGroupDto) {
    await this.findOne(organizationId, id);
    return this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        active: dto.active,
      },
    });
  }

  async addMember(organizationId: string, groupId: string, userId: string) {
    await this.findOne(organizationId, groupId);
    await this.prisma.userGroup.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: {},
      create: { userId, groupId },
    });
    return { success: true };
  }

  async removeMember(organizationId: string, groupId: string, userId: string) {
    await this.prisma.userGroup.deleteMany({ where: { userId, groupId } });
    return { success: true };
  }

  async linkRole(organizationId: string, groupId: string, roleId: string) {
    await this.findOne(organizationId, groupId);
    await this.prisma.roleGroup.upsert({
      where: { roleId_groupId: { roleId, groupId } },
      update: {},
      create: { roleId, groupId },
    });
    return { success: true };
  }
}
