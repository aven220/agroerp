import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class DeviceSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateDeviceToken(): string {
    return `eiesdp_${randomBytes(32).toString('hex')}`;
  }

  async issueCredentials(deviceId: string, credentialType = 'api_token') {
    const token = this.generateDeviceToken();
    const secretHash = this.hashToken(token);
    await this.prisma.eiesdpDeviceCredential.updateMany({
      where: { deviceId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });
    await this.prisma.eiesdpDeviceCredential.create({
      data: {
        deviceId,
        credentialType,
        secretHash,
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      },
    });
    await this.prisma.eiesdpDevice.update({
      where: { id: deviceId },
      data: { authTokenHash: secretHash },
    });
    return { token, expiresAt: new Date(Date.now() + 365 * 86_400_000) };
  }

  async verifyDeviceToken(deviceId: string, token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const cred = await this.prisma.eiesdpDeviceCredential.findFirst({
      where: { deviceId, isActive: true, secretHash: hash },
    });
    if (!cred) return false;
    if (cred.expiresAt && cred.expiresAt < new Date()) return false;
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(cred.secretHash ?? ''));
    } catch {
      return false;
    }
  }

  async rotateCredentials(deviceId: string) {
    return this.issueCredentials(deviceId, 'rotated_token');
  }

  async revokeDevice(organizationId: string, deviceId: string) {
    await this.prisma.eiesdpDeviceCredential.updateMany({
      where: { deviceId },
      data: { isActive: false, rotatedAt: new Date() },
    });
    return this.prisma.eiesdpDevice.update({
      where: { id: deviceId, organizationId },
      data: { status: 'revoked', revokedAt: new Date(), authTokenHash: null },
    });
  }
}
