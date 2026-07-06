import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from '../presentation/identity.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.team.findMany({
      where: { organizationId },
      include: {
        orgUnit: { select: { id: true, name: true, code: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId },
      include: {
        orgUnit: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(organizationId: string, dto: CreateTeamDto) {
    const existing = await this.prisma.team.findFirst({
      where: { organizationId, slug: dto.slug },
    });
    if (existing) throw new ConflictException('Team slug exists');

    return this.prisma.team.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        orgUnitId: dto.orgUnitId,
        leaderId: dto.leaderId,
        metadata: (dto.metadata ?? {}) as object,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateTeamDto) {
    await this.findOne(organizationId, id);
    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name,
        orgUnitId: dto.orgUnitId,
        leaderId: dto.leaderId,
        metadata: dto.metadata as object | undefined,
        active: dto.active,
      },
    });
  }

  async addMember(
    organizationId: string,
    teamId: string,
    userId: string,
    role = 'member',
  ) {
    await this.findOne(organizationId, teamId);
    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: { role },
      create: { teamId, userId, role },
    });
    return { success: true };
  }

  async removeMember(organizationId: string, teamId: string, userId: string) {
    await this.findOne(organizationId, teamId);
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { success: true };
  }
}
