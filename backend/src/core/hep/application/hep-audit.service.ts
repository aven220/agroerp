import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateHepKey } from '../domain/hep-portal.engine';
import type { HepAuditAction } from '@prisma/client';

@Injectable()
export class HepAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId: string;
    action: HepAuditAction;
    resource: string;
    employeeKey?: string;
    userId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const auditKey = generateHepKey('AUD', Date.now() % 100000000);
    return this.prisma.hepAuditLog.create({
      data: {
        organizationId: input.organizationId,
        auditKey,
        action: input.action,
        resource: input.resource,
        employeeKey: input.employeeKey,
        userId: input.userId,
        details: (input.details ?? {}) as object,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  list(organizationId: string, filters?: { employeeKey?: string; action?: HepAuditAction }, limit = 200) {
    return this.prisma.hepAuditLog.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
