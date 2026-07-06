import { Injectable } from '@nestjs/common';
import { EaceAuditAction } from '@agroerp/prisma-eace-client';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';

@Injectable()
export class EaceAuditService {
  constructor(private readonly prisma: EacePrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: EaceAuditAction, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.eaceAuditLog.create({
      data: { organizationId, entityType, entityKey, action, userId, details: (details ?? {}) as object },
    });
  }

  findAll(organizationId: string, entityType?: string, limit = 200) {
    return this.prisma.eaceAuditLog.findMany({
      where: { organizationId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
