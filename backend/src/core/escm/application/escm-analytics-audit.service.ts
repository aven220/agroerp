import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';

@Injectable()
export class EscmAnalyticsAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  async logAccess(
    organizationId: string,
    accessType: 'query' | 'export' | 'report' | 'filter' | 'access',
    resourceKey: string,
    userId?: string,
    filters?: Record<string, unknown>,
  ) {
    await this.prisma.escmAnalyticsAccessLog.create({
      data: {
        organizationId,
        accessType,
        resourceKey,
        userId,
        filters: (filters ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EscmAnalytics', resourceKey, accessType, userId, filters);
  }

  list(organizationId: string, limit = 200) {
    return this.prisma.escmAnalyticsAccessLog.findMany({
      where: { organizationId },
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });
  }
}
