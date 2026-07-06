import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class CoffeeAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(organizationId: string, entityType: string, entityKey: string, action: string, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.cpepAuditLog.create({
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
    return this.prisma.cpepAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
