import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IntegrationAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: string,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eihIntegrationAuditLog.create({
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

  findAll(organizationId: string, entityKey?: string, limit = 200) {
    return this.prisma.eihIntegrationAuditLog.findMany({
      where: { organizationId, ...(entityKey ? { entityKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
