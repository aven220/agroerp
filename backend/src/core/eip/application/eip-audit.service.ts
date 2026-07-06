import { Injectable } from '@nestjs/common';
import { EipAuditAction } from '@agroerp/prisma-eip-client';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';

@Injectable()
export class EipAuditService {
  constructor(private readonly prisma: EipPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EipAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eipAuditLog.create({
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
    return this.prisma.eipAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
