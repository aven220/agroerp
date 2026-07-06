import { Injectable } from '@nestjs/common';
import { EamAuditAction } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EamAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EamAuditAction,
    userId?: string,
    details?: Record<string, unknown> | object,
  ) {
    return this.prisma.eamAuditLog.create({
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
    return this.prisma.eamAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
