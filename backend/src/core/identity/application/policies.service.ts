import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { CreatePolicyDto, UpdatePolicyDto } from '../presentation/identity.dto';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.policy.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { id, organizationId },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async create(organizationId: string, dto: CreatePolicyDto, userId: string) {
    const policy = await this.prisma.policy.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        effect: dto.effect,
        resource: dto.resource,
        action: dto.action,
        subject: (dto.subject ?? {}) as object,
        conditions: (dto.conditions ?? {}) as object,
        priority: dto.priority ?? 0,
        active: dto.active !== false,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'Policy',
      policy.id,
      EVENT_TYPES.POLICY_CREATED,
      { name: policy.name, effect: policy.effect },
      { ctx: { userId, organizationId } },
    );

    return policy;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePolicyDto,
    userId: string,
  ) {
    await this.findOne(organizationId, id);
    const policy = await this.prisma.policy.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        effect: dto.effect,
        resource: dto.resource,
        action: dto.action,
        subject: dto.subject as object | undefined,
        conditions: dto.conditions as object | undefined,
        priority: dto.priority,
        active: dto.active,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'Policy',
      id,
      EVENT_TYPES.POLICY_UPDATED,
      { name: policy.name },
      { ctx: { userId, organizationId } },
    );

    return policy;
  }
}
