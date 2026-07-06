import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    action: string,
    details: Record<string, unknown>,
    ruleId?: string,
    actorId?: string,
  ) {
    return this.prisma.breRuleAuditLog.create({
      data: {
        organizationId,
        ruleId,
        action,
        actorId,
        details: details as object,
      },
    });
  }

  findAll(organizationId: string, ruleId?: string) {
    return this.prisma.breRuleAuditLog.findMany({
      where: { organizationId, ...(ruleId ? { ruleId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
