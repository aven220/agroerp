import { Injectable } from '@nestjs/common';
import { EopsAuditAction } from '@agroerp/prisma-eops-client';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';

@Injectable()
export class EopsAuditService {
  constructor(private readonly prisma: EopsPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EopsAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eopsAuditLog.create({
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
    return this.prisma.eopsAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
