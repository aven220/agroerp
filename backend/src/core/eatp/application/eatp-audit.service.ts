import { Injectable } from '@nestjs/common';
import { EatpAuditAction } from '@agroerp/prisma-eatp-client';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';

@Injectable()
export class EatpAuditService {
  constructor(private readonly prisma: EatpPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EatpAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eatpAuditLog.create({
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
    return this.prisma.eatpAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
