import { Injectable } from '@nestjs/common';
import { EiwpAuditAction } from '@agroerp/prisma-eiwp-client';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';

@Injectable()
export class EiwpAuditService {
  constructor(private readonly prisma: EiwpPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EiwpAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eiwpAuditLog.create({
      data: {
        organizationId,
        entityType,
        entityKey,
        action,
        userId,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eiwpAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
