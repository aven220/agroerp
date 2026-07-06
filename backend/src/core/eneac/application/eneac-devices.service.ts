import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EneacDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerToken(
    organizationId: string,
    userId: string,
    data: { token: string; platform?: string; deviceId?: string },
  ) {
    return this.prisma.notificationDeviceToken.upsert({
      where: {
        organizationId_token: {
          organizationId,
          token: data.token,
        },
      },
      update: {
        active: true,
        lastUsedAt: new Date(),
        platform: data.platform ?? 'android',
        deviceId: data.deviceId,
      },
      create: {
        organizationId,
        userId,
        token: data.token,
        platform: data.platform ?? 'android',
        deviceId: data.deviceId,
        lastUsedAt: new Date(),
      },
    });
  }

  async revokeToken(organizationId: string, userId: string, token: string) {
    return this.prisma.notificationDeviceToken.updateMany({
      where: { organizationId, userId, token },
      data: { active: false },
    });
  }

  getActiveTokens(organizationId: string, userId: string) {
    return this.prisma.notificationDeviceToken.findMany({
      where: { organizationId, userId, active: true },
    });
  }
}
