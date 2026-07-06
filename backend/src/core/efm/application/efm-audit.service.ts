import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EfmAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: string,
    userId?: string,
    details?: Record<string, unknown>,
    versionNumber?: number,
  ) {
    return this.prisma.efmAuditLog.create({
      data: {
        organizationId,
        entityType,
        entityKey,
        action,
        userId,
        versionNumber,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.efmAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
