import { Injectable } from '@nestjs/common';
import { EphpAuditAction } from '@agroerp/prisma-ephp-client';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';

@Injectable()
export class EphpAuditService {
  constructor(private readonly prisma: EphpPrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: EphpAuditAction,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.ephpAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.ephpAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
