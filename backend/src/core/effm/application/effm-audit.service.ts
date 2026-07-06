import { Injectable } from '@nestjs/common';
import { EffmAuditAction } from '@agroerp/prisma-effm-client';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';

@Injectable()
export class EffmAuditService {
  constructor(private readonly prisma: EffmPrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: EffmAuditAction, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.effmAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.effmAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
