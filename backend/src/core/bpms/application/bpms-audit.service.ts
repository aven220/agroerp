import { Injectable } from '@nestjs/common';
import { BpmsAuditAction } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';

@Injectable()
export class BpmsAuditService {
  constructor(private readonly prisma: BpmsPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: BpmsAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.bpmsAuditLog.create({
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
    return this.prisma.bpmsAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
