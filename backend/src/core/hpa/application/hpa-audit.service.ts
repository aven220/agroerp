import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateHpaKey } from '../domain/hpa-analytics.engine';
import type { HpaAuditAction } from '@prisma/client';

@Injectable()
export class HpaAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: {
    organizationId: string;
    action: HpaAuditAction;
    resource: string;
    userId?: string;
    employeeKey?: string;
    filters?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.hpaAuditLog.create({
      data: {
        organizationId: input.organizationId,
        auditKey: generateHpaKey('AUD', Date.now() % 100000000),
        action: input.action,
        resource: input.resource,
        userId: input.userId,
        employeeKey: input.employeeKey,
        filters: (input.filters ?? {}) as object,
        details: (input.details ?? {}) as object,
      },
    });
  }

  list(organizationId: string, limit = 200) {
    return this.prisma.hpaAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
