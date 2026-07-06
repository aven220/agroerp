import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PerfAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(organizationId: string | undefined, action: string, entityType: string, entityKey: string, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.epopOptimizationAudit.create({
      data: {
        organizationId,
        action,
        entityType,
        entityKey,
        userId,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, limit = 200) {
    return this.prisma.epopOptimizationAudit.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
