import { Injectable } from '@nestjs/common';
import { EmfgAuditAction } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EmfgAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EmfgAuditAction,
    userId?: string,
    details?: Record<string, unknown> | object,
  ) {
    return this.prisma.emfgAuditLog.create({
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
    return this.prisma.emfgAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
