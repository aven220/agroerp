import { Injectable } from '@nestjs/common';
import { EappAuditAction } from '@agroerp/prisma-eapp-client';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';

@Injectable()
export class EappAuditService {
  constructor(private readonly prisma: EappPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EappAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eappAuditLog.create({
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

  logMapEdit(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EappAuditAction,
    userId: string | undefined,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    return this.prisma.eappMapEditLog.create({
      data: {
        organizationId,
        entityType,
        entityKey,
        action,
        userId,
        before: before as object,
        after: after as object,
      },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eappAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findMapEdits(organizationId: string, limit = 200) {
    return this.prisma.eappMapEditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
