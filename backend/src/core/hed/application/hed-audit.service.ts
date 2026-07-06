import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateHedKey } from '../domain/hed-dashboard.engine';
import type { HedAuditAction } from '@prisma/client';

@Injectable()
export class HedAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId: string;
    action: HedAuditAction;
    resource: string;
    userId?: string;
    filters?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.hedAuditLog.create({
      data: {
        organizationId: input.organizationId,
        auditKey: generateHedKey('AUD', Date.now() % 100000000),
        action: input.action,
        resource: input.resource,
        userId: input.userId,
        filters: (input.filters ?? {}) as object,
        details: (input.details ?? {}) as object,
      },
    });
  }

  list(organizationId: string, limit = 200) {
    return this.prisma.hedAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
