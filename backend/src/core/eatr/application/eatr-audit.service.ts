import { Injectable } from '@nestjs/common';
import { EatrAuditAction } from '@agroerp/prisma-eatr-client';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';

@Injectable()
export class EatrAuditService {
  constructor(private readonly prisma: EatrPrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: EatrAuditAction, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.eatrAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eatrAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
