import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { IamSecurityEventType } from '@agroerp/shared';

@Injectable()
export class IamAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    eventType: IamSecurityEventType,
    data: {
      userId?: string;
      actorId?: string;
      targetType?: string;
      targetId?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, unknown>;
    },
  ) {
    return this.prisma.iamSecurityEvent.create({
      data: {
        organizationId,
        userId: data.userId,
        eventType: eventType as never,
        actorId: data.actorId,
        targetType: data.targetType,
        targetId: data.targetId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: (data.details ?? {}) as object,
      },
    });
  }

  async findAll(organizationId: string, filters?: { eventType?: string; userId?: string; limit?: number }) {
    return this.prisma.iamSecurityEvent.findMany({
      where: {
        organizationId,
        ...(filters?.eventType ? { eventType: filters.eventType as never } : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 200,
    });
  }

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 3600000);
    const events = await this.prisma.iamSecurityEvent.findMany({
      where: { organizationId, createdAt: { gte: since24h } },
    });
    const failures = events.filter((e) => e.eventType === 'login_failure').length;
    const successes = events.filter((e) => e.eventType === 'login_success').length;
    const denied = events.filter((e) => e.eventType === 'access_denied').length;
    const anomalies = await this.prisma.iamAnomalyAlert.count({
      where: { organizationId, isResolved: false },
    });
    return {
      events24h: events.length,
      loginSuccess24h: successes,
      loginFailure24h: failures,
      accessDenied24h: denied,
      openAnomalies: anomalies,
    };
  }
}
