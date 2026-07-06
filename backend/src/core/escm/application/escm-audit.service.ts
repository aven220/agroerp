import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EscmAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    entityType: string,
    entityKey: string,
    action: string,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.escmAuditLog.create({
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

  findAll(organizationId: string, limit = 200) {
    return this.prisma.escmAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
