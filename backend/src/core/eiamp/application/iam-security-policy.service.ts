import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamSecurityPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(organizationId: string) {
    const existing = await this.prisma.iamSecurityPolicy.findUnique({ where: { organizationId } });
    if (existing) return existing;
    return this.prisma.iamSecurityPolicy.create({ data: { organizationId } });
  }

  async update(organizationId: string, data: Prisma.IamSecurityPolicyUpdateInput) {
    await this.getOrCreate(organizationId);
    return this.prisma.iamSecurityPolicy.update({
      where: { organizationId },
      data,
    });
  }

  isWithinAllowedHours(policy: { allowedHours: unknown }): boolean {
    const hours = policy.allowedHours as { start?: string; end?: string; timezone?: string } | null;
    if (!hours?.start || !hours?.end) return true;

    const tz = hours.timezone ?? 'UTC';
    const h = this.currentHourInTimezone(tz);
    const start = parseInt(hours.start.split(':')[0], 10);
    const end = parseInt(hours.end.split(':')[0], 10);
    if (Number.isNaN(start) || Number.isNaN(end)) return true;
    if (start <= end) return h >= start && h < end;
    return h >= start || h < end;
  }

  private currentHourInTimezone(timezone: string): number {
    try {
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }).formatToParts(new Date()).find((p) => p.type === 'hour')?.value;
      return parseInt(hour ?? '0', 10);
    } catch {
      return new Date().getUTCHours();
    }
  }

  isPasswordExpired(passwordChangedAt: Date | null, expiryDays: number): boolean {
    if (!passwordChangedAt) return false;
    const ms = expiryDays * 86_400_000;
    return Date.now() - passwordChangedAt.getTime() > ms;
  }
}
