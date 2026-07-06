import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { v4 as uuidv4 } from 'uuid';

export interface AuditContext {
  organizationId: string;
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  eventId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(ctx: AuditContext) {
    const diff = this.computeDiff(ctx.oldValues, ctx.newValues);

    try {
      return await this.prisma.auditLog.create({
        data: {
          id: uuidv4(),
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          deviceId: ctx.deviceId,
          action: ctx.action,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          oldValues: ctx.oldValues as object | undefined,
          newValues: ctx.newValues as object | undefined,
          diff: diff as object | undefined,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          eventId: ctx.eventId,
        },
      });
    } catch (err) {
      this.logger.error(`Audit record failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async recordFromEvent(event: DomainEvent) {
    const payload = event.payload ?? {};
    const oldValues = (payload.oldValues ?? payload.before) as
      | Record<string, unknown>
      | undefined;
    const newValues = (payload.newValues ??
      payload.after ??
      payload.changes ??
      payload) as Record<string, unknown>;

    return this.record({
      organizationId: event.organizationId,
      userId: event.metadata?.userId,
      deviceId: event.metadata?.deviceId,
      ipAddress: event.metadata?.ipAddress,
      userAgent: event.metadata?.userAgent,
      action: event.eventType,
      entityType: event.aggregateType,
      entityId: event.aggregateId,
      oldValues: oldValues ?? null,
      newValues,
      eventId: event.id,
    });
  }

  async findAll(
    organizationId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      limit?: number;
    },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        userId: filters?.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        event: true,
      },
    });
  }

  computeDiff(
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
  ): Record<string, { from: unknown; to: unknown }> | null {
    if (!before && !after) return null;

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);

    for (const key of keys) {
      const from = before?.[key];
      const to = after?.[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        diff[key] = { from: from ?? null, to: to ?? null };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}
