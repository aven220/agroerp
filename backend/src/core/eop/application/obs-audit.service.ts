import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ObsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    action: string,
    entityType: string,
    entityKey: string,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eopAuditEvent.create({
      data: {
        organizationId,
        eventKey: `${action}-${Date.now()}`,
        action,
        entityType,
        entityKey,
        userId,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, limit = 200) {
    return this.prisma.eopAuditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
