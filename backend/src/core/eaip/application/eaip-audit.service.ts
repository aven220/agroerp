import { Injectable } from '@nestjs/common';
import { EaipAuditAction } from '@agroerp/prisma-eaip-client';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';

@Injectable()
export class EaipAuditService {
  constructor(private readonly prisma: EaipPrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: EaipAuditAction, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.eaipAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eaipAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
