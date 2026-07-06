import { Injectable } from '@nestjs/common';
import { SessionsService } from '@/core/identity/application/sessions.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamSessionAdminService {
  constructor(
    private readonly sessions: SessionsService,
    private readonly prisma: PrismaService,
  ) {}

  async listSessions(organizationId: string, userId?: string) {
    const sessions = await this.sessions.findAll(organizationId, userId);
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      status: s.status,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceId: s.deviceId,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      browser: this.parseBrowser(s.userAgent),
      os: this.parseOs(s.userAgent),
    }));
  }

  async revokeSession(organizationId: string, sessionId: string, revokedBy: string) {
    return this.sessions.revoke(organizationId, sessionId, 'admin_revoke', revokedBy);
  }

  async revokeAllUserSessions(organizationId: string, userId: string, revokedBy: string) {
    return this.sessions.revokeAllForUser(organizationId, userId, 'admin_revoke_all', revokedBy);
  }

  async listDevices(organizationId: string, userId?: string) {
    return this.prisma.device.findMany({
      where: { organizationId, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseBrowser(ua?: string | null): string {
    if (!ua) return 'unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'other';
  }

  private parseOs(ua?: string | null): string {
    if (!ua) return 'unknown';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'other';
  }
}
