import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationRuleDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EneacRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.notificationRule.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const rule = await this.prisma.notificationRule.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    return rule;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: NotificationRuleDefinition,
  ) {
    const existing = await this.prisma.notificationRule.findFirst({
      where: { organizationId, ruleKey: dto.ruleKey, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(`Regla ${dto.ruleKey} ya existe`);
    }

    return this.prisma.notificationRule.create({
      data: {
        organizationId,
        ruleKey: dto.ruleKey,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 100,
        eventTypes: dto.eventTypes,
        eventCategory: dto.eventCategory ?? 'business',
        alertSeverity: dto.alertSeverity ?? 'info',
        conditions: (dto.conditions ?? {}) as object,
        channels: (dto.channels ?? []) as object,
        recipients: (dto.recipients ?? []) as object,
        schedule: (dto.schedule ?? {}) as object,
        escalation: (dto.escalation ?? {}) as object,
        suppression: (dto.suppression ?? {}) as object,
        expiresInHours: dto.expiresInHours,
        maxRetries: dto.maxRetries ?? 3,
        groupingKey: dto.groupingKey,
        aiReadiness: (dto.aiReadiness ?? {}) as object,
        createdBy: userId,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: Partial<NotificationRuleDefinition>,
  ) {
    await this.findOne(organizationId, id);
    return this.prisma.notificationRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        eventTypes: dto.eventTypes,
        eventCategory: dto.eventCategory,
        alertSeverity: dto.alertSeverity,
        conditions: dto.conditions as object,
        channels: dto.channels as object,
        recipients: dto.recipients as object,
        schedule: dto.schedule as object,
        escalation: dto.escalation as object,
        suppression: dto.suppression as object,
        expiresInHours: dto.expiresInHours,
        maxRetries: dto.maxRetries,
        groupingKey: dto.groupingKey,
        aiReadiness: dto.aiReadiness as object,
      },
    });
  }

  async activate(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.notificationRule.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  async deactivate(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.notificationRule.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}
