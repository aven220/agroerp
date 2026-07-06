import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class DeviceAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(organizationId: string, deviceKey: string, action: string, userId?: string, details?: Record<string, unknown>) {
    return this.prisma.eiesdpDeviceAuditLog.create({
      data: {
        organizationId,
        deviceKey,
        action,
        userId,
        details: (details ?? {}) as object,
      },
    });
  }

  findAll(organizationId: string, deviceKey?: string) {
    return this.prisma.eiesdpDeviceAuditLog.findMany({
      where: { organizationId, ...(deviceKey ? { deviceKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}
