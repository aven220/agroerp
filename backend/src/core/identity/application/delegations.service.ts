import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { CreateDelegationDto } from '../presentation/identity.dto';

@Injectable()
export class DelegationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.delegation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateDelegationDto, userId: string) {
    const delegation = await this.prisma.delegation.create({
      data: {
        organizationId,
        delegatorId: dto.delegatorId ?? userId,
        delegateId: dto.delegateId,
        permissions: (dto.permissions ?? []) as object,
        scopes: (dto.scopes ?? {}) as object,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      dto.delegateId,
      EVENT_TYPES.DELEGATION_CREATED,
      { delegationId: delegation.id, delegatorId: delegation.delegatorId },
      { ctx: { userId, organizationId } },
    );

    return delegation;
  }

  async revoke(organizationId: string, id: string, userId: string) {
    const delegation = await this.prisma.delegation.findFirst({
      where: { id, organizationId },
    });
    if (!delegation) throw new NotFoundException('Delegation not found');

    await this.prisma.delegation.update({
      where: { id },
      data: { active: false },
    });

    await this.core.emitUserAction(
      organizationId,
      'User',
      delegation.delegateId,
      EVENT_TYPES.DELEGATION_REVOKED,
      { delegationId: id },
      { ctx: { userId, organizationId } },
    );

    return { success: true };
  }
}
