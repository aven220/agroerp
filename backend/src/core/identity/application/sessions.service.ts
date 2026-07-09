import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(params: {
    sessionId: string;
    userId: string;
    organizationId: string;
    refreshToken: string;
    jti: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  }) {
    const session = await this.prisma.session.create({
      data: {
        id: params.sessionId,
        userId: params.userId,
        organizationId: params.organizationId,
        refreshTokenHash: this.hashToken(params.refreshToken),
        jti: params.jti,
        expiresAt: params.expiresAt,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
        status: SessionStatus.active,
      },
    });

    await this.core.emitUserAction(
      params.organizationId,
      'Session',
      session.id,
      EVENT_TYPES.SESSION_CREATED,
      {
        userId: params.userId,
        deviceId: params.deviceId,
        ipAddress: params.ipAddress,
      },
      { ctx: { userId: params.userId, organizationId: params.organizationId } },
    );

    return session;
  }

  async findActiveByUser(organizationId: string, userId: string) {
    return this.prisma.session.findMany({
      where: {
        organizationId,
        userId,
        status: SessionStatus.active,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async findAll(organizationId: string, userId?: string) {
    return this.prisma.session.findMany({
      where: {
        organizationId,
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findActiveByRefreshToken(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    return this.prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        status: SessionStatus.active,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async validateSession(sessionId: string, jti?: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) return false;
    if (session.status !== SessionStatus.active) return false;
    if (session.expiresAt < new Date()) return false;
    if (jti && session.jti && session.jti !== jti) return false;
    return true;
  }

  async touch(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  async revoke(
    organizationId: string,
    sessionId: string,
    reason: string,
    revokedBy: string,
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.revoked,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'Session',
      sessionId,
      EVENT_TYPES.SESSION_REVOKED,
      { reason, revokedBy, userId: session.userId },
      { ctx: { userId: revokedBy, organizationId } },
    );

    return { success: true };
  }

  async revokeAllForUser(
    organizationId: string,
    userId: string,
    reason: string,
    revokedBy: string,
  ) {
    const sessions = await this.findActiveByUser(organizationId, userId);
    for (const s of sessions) {
      await this.revoke(organizationId, s.id, reason, revokedBy);
    }
    return { revoked: sessions.length };
  }

  async revokeByRefreshToken(refreshToken: string, reason: string) {
    const hash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash, status: SessionStatus.active },
    });
    if (!session) return null;
    return this.revoke(session.organizationId, session.id, reason, session.userId);
  }
}
