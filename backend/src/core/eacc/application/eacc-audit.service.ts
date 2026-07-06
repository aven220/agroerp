import { Injectable } from '@nestjs/common';
import { EaccAuditAction } from '@agroerp/prisma-eacc-client';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';

@Injectable()
export class EaccAuditService {
  constructor(private readonly prisma: EaccPrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: EaccAuditAction, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.eaccAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eaccAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
