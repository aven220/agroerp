import { Injectable } from '@nestjs/common';
import { WorkflowParticipantDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface AssignmentResolveContext {
  organizationId: string;
  resource?: { ownerId?: string | null; data?: Record<string, unknown> } | null;
  variables?: Record<string, unknown>;
  startedBy?: string;
}

@Injectable()
export class WorkflowAssignmentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    participants: WorkflowParticipantDefinition[] | undefined,
    ctx: AssignmentResolveContext,
  ): Promise<string[]> {
    if (!participants?.length) return [];

    const userIds = new Set<string>();

    for (const participant of participants) {
      const resolved = await this.resolveOne(participant, ctx);
      resolved.forEach((id) => userIds.add(id));
    }

    return [...userIds];
  }

  private async resolveOne(
    participant: WorkflowParticipantDefinition,
    ctx: AssignmentResolveContext,
  ): Promise<string[]> {
    switch (participant.type) {
      case 'user':
        return participant.ref ? [participant.ref] : [];

      case 'role': {
        if (!participant.ref) return [];
        const role = await this.prisma.role.findFirst({
          where: { organizationId: ctx.organizationId, slug: participant.ref },
          include: { userRoles: true },
        });
        return role?.userRoles.map((ur) => ur.userId) ?? [];
      }

      case 'group': {
        if (!participant.ref) return [];
        const group = await this.prisma.group.findFirst({
          where: { organizationId: ctx.organizationId, slug: participant.ref },
          include: { userGroups: true },
        });
        return group?.userGroups.map((ug) => ug.userId) ?? [];
      }

      case 'team': {
        if (!participant.ref) return [];
        const team = await this.prisma.team.findFirst({
          where: { organizationId: ctx.organizationId, slug: participant.ref },
          include: { members: true },
        });
        return team?.members.map((m) => m.userId) ?? [];
      }

      case 'department':
      case 'org_unit':
      case 'region':
      case 'branch': {
        if (!participant.ref) return [];
        const orgUnit = await this.prisma.orgUnit.findFirst({
          where: { organizationId: ctx.organizationId, code: participant.ref },
        });
        if (!orgUnit) return [];
        const scopes = await this.prisma.userScope.findMany({
          where: { scopeType: participant.type, scopeId: orgUnit.id },
        });
        return scopes.map((s) => s.userId);
      }

      case 'dynamic':
        return this.resolveDynamic(participant.dynamic, ctx);

      default:
        return [];
    }
  }

  private resolveDynamic(
    expression: string | undefined,
    ctx: AssignmentResolveContext,
  ): string[] {
    if (!expression) return [];

    const map: Record<string, string | undefined> = {
      'resource.ownerId': ctx.resource?.ownerId ?? undefined,
      'context.startedBy': ctx.startedBy,
      'variables.assigneeId': ctx.variables?.assigneeId as string | undefined,
    };

    const userId = map[expression] ?? (ctx.variables?.[expression.replace('variables.', '')] as string);
    return userId ? [userId] : [];
  }
}
