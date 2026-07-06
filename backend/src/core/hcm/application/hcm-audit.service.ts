import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class HcmAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: string,
    userId?: string,
    details?: Record<string, unknown> | object,
  ) {
    return this.prisma.hcmAuditLog.create({
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
    return this.prisma.hcmAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
