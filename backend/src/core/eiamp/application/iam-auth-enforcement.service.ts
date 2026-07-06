import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { IAM_AUTH_PORT, IamAuthPort } from '../domain/iam-auth.port';
import { IamSecurityPolicyService } from './iam-security-policy.service';
import { IamAuditService } from './iam-audit.service';
import { IamAnomalyService } from './iam-anomaly.service';

@Injectable()
export class IamAuthEnforcementService implements IamAuthPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: IamSecurityPolicyService,
    private readonly audit: IamAuditService,
    private readonly anomaly: IamAnomalyService,
  ) {}

  async beforeLogin(
    user: {
      id: string;
      organizationId: string;
      email: string;
      mfaEnabled: boolean;
      mustChangePassword: boolean;
      failedLoginAttempts: number;
      lockedAt: Date | null;
      passwordChangedAt: Date | null;
    },
    ctx: { ipAddress?: string; userAgent?: string; deviceId?: string; password: string },
  ) {
    const policy = await this.policies.getOrCreate(user.organizationId);

    if (user.lockedAt) {
      const lockMs = policy.lockoutMinutes * 60_000;
      if (Date.now() - user.lockedAt.getTime() < lockMs) {
        return { proceed: false, reason: 'account_locked' };
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lockedAt: null, lockedReason: null, failedLoginAttempts: 0 },
      });
    }

    if (ctx.ipAddress && policy.blockedIpRanges.some((r) => this.ipInRange(ctx.ipAddress!, r))) {
      return { proceed: false, reason: 'ip_blocked' };
    }

    if (policy.allowedIpRanges.length && ctx.ipAddress) {
      const allowed = policy.allowedIpRanges.some((r) => this.ipInRange(ctx.ipAddress!, r));
      if (!allowed) return { proceed: false, reason: 'ip_not_allowed' };
    }

    if (!this.policies.isWithinAllowedHours(policy)) {
      return { proceed: false, reason: 'outside_allowed_hours' };
    }

    const mfaRequired = policy.mfaRequired || user.mfaEnabled;
    return { proceed: true, mfaRequired };
  }

  async onLoginFailure(
    email: string,
    organizationId: string | null,
    userId: string | null,
    ctx: { ipAddress?: string; userAgent?: string; reason: string },
  ) {
    await this.prisma.iamAuthAttempt.create({
      data: {
        organizationId: organizationId ?? undefined,
        userId: userId ?? undefined,
        email: email.toLowerCase(),
        success: false,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        failureReason: ctx.reason,
      },
    });

    if (userId && organizationId) {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      const policy = await this.policies.getOrCreate(organizationId);
      if (user.failedLoginAttempts >= policy.maxFailedAttempts) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lockedAt: new Date(),
            lockedReason: 'max_failed_attempts',
            status: 'locked',
          },
        });
        await this.audit.record(organizationId, 'user_locked', { userId, actorId: userId });
      }
      await this.anomaly.analyzeLogin(organizationId, userId, ctx.ipAddress, false);
    }

    if (organizationId) {
      await this.audit.record(organizationId, 'login_failure', {
        userId: userId ?? undefined,
        details: { email, reason: ctx.reason },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }
  }

  async onLoginSuccess(
    userId: string,
    organizationId: string,
    ctx: { ipAddress?: string; userAgent?: string; deviceId?: string },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
    });

    await this.prisma.iamAuthAttempt.create({
      data: {
        organizationId,
        userId,
        email: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email ?? '',
        success: true,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    if (ctx.deviceId) {
      const existing = await this.prisma.device.findFirst({
        where: { organizationId, deviceFingerprint: ctx.deviceId },
      });
      if (!existing) {
        await this.prisma.device.create({
          data: {
            userId,
            organizationId,
            deviceFingerprint: ctx.deviceId,
            platform: this.parsePlatform(ctx.userAgent),
            trusted: false,
          },
        }).catch(() => undefined);
      }
    }

    await this.audit.record(organizationId, 'login_success', { userId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    await this.anomaly.analyzeLogin(organizationId, userId, ctx.ipAddress, true);
  }

  async validatePassword(organizationId: string, userId: string | null, password: string) {
    const policy = await this.policies.getOrCreate(organizationId);
    const errors: string[] = [];
    if (password.length < policy.minPasswordLength) errors.push('too_short');
    if (policy.requireUppercase && !/[A-Z]/.test(password)) errors.push('no_uppercase');
    if (policy.requireLowercase && !/[a-z]/.test(password)) errors.push('no_lowercase');
    if (policy.requireNumbers && !/[0-9]/.test(password)) errors.push('no_number');
    if (policy.requireSymbols && !/[^A-Za-z0-9]/.test(password)) errors.push('no_symbol');
    if (errors.length) throw new ForbiddenException(`Password policy: ${errors.join(', ')}`);

    if (userId) {
      const history = await this.prisma.iamPasswordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: policy.passwordHistoryCount,
      });
      const bcrypt = await import('bcrypt');
      for (const h of history) {
        if (await bcrypt.compare(password, h.passwordHash)) {
          throw new ForbiddenException('Password was used recently');
        }
      }
    }
  }

  async recordPasswordChange(organizationId: string, userId: string, passwordHash: string) {
    await this.prisma.iamPasswordHistory.create({
      data: { organizationId, userId, passwordHash },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date(), mustChangePassword: false },
    });
    await this.audit.record(organizationId, 'password_change', { userId, actorId: userId });
  }

  private ipInRange(ip: string, range: string): boolean {
    if (!range.includes('/')) return ip === range;
    const [base, bits] = range.split('/');
    const mask = ~(2 ** (32 - Number(bits)) - 1);
    const ipNum = this.ipv4ToInt(ip);
    const baseNum = this.ipv4ToInt(base);
    if (ipNum === null || baseNum === null) return false;
    return (ipNum & mask) === (baseNum & mask);
  }

  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  private parsePlatform(ua?: string): string {
    if (!ua) return 'unknown';
    if (ua.includes('Android')) return 'android';
    if (ua.includes('iPhone')) return 'ios';
    return 'web';
  }
}

export { IAM_AUTH_PORT };
