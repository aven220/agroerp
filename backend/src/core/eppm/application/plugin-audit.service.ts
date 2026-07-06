import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PluginAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    organizationId: string,
    pluginKey: string,
    action: string,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.eppmPluginAuditLog.create({
      data: {
        organizationId,
        pluginKey,
        action,
        userId,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, pluginKey?: string) {
    return this.prisma.eppmPluginAuditLog.findMany({
      where: { organizationId, ...(pluginKey ? { pluginKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}
