import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { CreateSubstitutionDto } from '../presentation/identity.dto';

@Injectable()
export class SubstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.substitution.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        substitute: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateSubstitutionDto, actorId: string) {
    const substitution = await this.prisma.substitution.create({
      data: {
        organizationId,
        userId: dto.userId,
        substituteId: dto.substituteId,
        roleSlugs: (dto.roleSlugs ?? []) as object,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      dto.substituteId,
      EVENT_TYPES.SUBSTITUTION_CREATED,
      { substitutionId: substitution.id, userId: dto.userId },
      { ctx: { userId: actorId, organizationId } },
    );

    return substitution;
  }

  async revoke(organizationId: string, id: string, actorId: string) {
    const substitution = await this.prisma.substitution.findFirst({
      where: { id, organizationId },
    });
    if (!substitution) throw new NotFoundException('Substitution not found');

    await this.prisma.substitution.update({
      where: { id },
      data: { active: false },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      substitution.substituteId,
      EVENT_TYPES.SUBSTITUTION_REVOKED,
      { substitutionId: id },
      { ctx: { userId: actorId, organizationId } },
    );

    return { success: true };
  }
}
