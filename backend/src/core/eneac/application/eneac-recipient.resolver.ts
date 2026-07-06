import { Injectable } from '@nestjs/common';
import { NotificationRecipientDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface RecipientResolveContext {
  organizationId: string;
  payload?: Record<string, unknown>;
  userId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EneacRecipientResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    recipients: NotificationRecipientDefinition[] | undefined,
    ctx: RecipientResolveContext,
  ): Promise<string[]> {
    if (!recipients?.length) return ctx.userId ? [ctx.userId] : [];

    const userIds = new Set<string>();
    for (const recipient of recipients) {
      const resolved = await this.resolveOne(recipient, ctx);
      resolved.forEach((id) => userIds.add(id));
    }
    return [...userIds];
  }

  private async resolveOne(
    recipient: NotificationRecipientDefinition,
    ctx: RecipientResolveContext,
  ): Promise<string[]> {
    switch (recipient.type) {
      case 'user':
        return recipient.ref ? [recipient.ref] : [];
      case 'role': {
        if (!recipient.ref) return [];
        const role = await this.prisma.role.findFirst({
          where: { organizationId: ctx.organizationId, slug: recipient.ref },
          include: { userRoles: true },
        });
        return role?.userRoles.map((ur) => ur.userId) ?? [];
      }
      case 'group': {
        if (!recipient.ref) return [];
        const group = await this.prisma.group.findFirst({
          where: { organizationId: ctx.organizationId, slug: recipient.ref },
          include: { userGroups: true },
        });
        return group?.userGroups.map((ug) => ug.userId) ?? [];
      }
      case 'team': {
        if (!recipient.ref) return [];
        const team = await this.prisma.team.findFirst({
          where: { organizationId: ctx.organizationId, slug: recipient.ref },
          include: { members: true },
        });
        return team?.members.map((m) => m.userId) ?? [];
      }
      case 'dynamic': {
        if (!recipient.dynamic) return [];
        if (recipient.dynamic === 'event.userId' && ctx.userId) return [ctx.userId];
        const fromPayload = ctx.payload?.[recipient.dynamic.replace('payload.', '')];
        return typeof fromPayload === 'string' ? [fromPayload] : [];
      }
      default:
        return [];
    }
  }
}
