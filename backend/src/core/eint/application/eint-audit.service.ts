import { Injectable } from '@nestjs/common';
import { EintAuditAction } from '@agroerp/prisma-eint-client';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';

@Injectable()
export class EintAuditService {
  constructor(private readonly prisma: EintPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EintAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eintAuditLog.create({
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
    return this.prisma.eintAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
