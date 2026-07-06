import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface ApiClientContext {
  clientId: string;
  organizationId: string;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

@Injectable()
export class ApiSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async validateApiKey(rawKey: string, ip?: string): Promise<ApiClientContext> {
    const prefix = rawKey.slice(0, 12);
    const candidates = await this.prisma.apiClientKey.findMany({
      where: { keyPrefix: prefix, isActive: true },
      include: { client: true },
      take: 20,
    });

    for (const key of candidates) {
      const match = await bcrypt.compare(rawKey, key.keyHash);
      if (!match) continue;
      if (key.expiresAt && key.expiresAt < new Date()) {
        throw new UnauthorizedException('API key expired');
      }
      const client = key.client;
      if (client.status !== 'active') {
        throw new UnauthorizedException('API client suspended');
      }
      if (client.blacklistIps.length && ip && client.blacklistIps.includes(ip)) {
        throw new ForbiddenException('IP blocked');
      }
      if (client.whitelistIps.length && ip && !client.whitelistIps.includes(ip)) {
        throw new ForbiddenException('IP not whitelisted');
      }

      await this.prisma.apiClientKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        clientId: client.id,
        organizationId: client.organizationId,
        scopes: client.scopes,
        rateLimitPerMinute: client.rateLimitPerMinute,
        rateLimitPerDay: client.rateLimitPerDay,
      };
    }

    throw new UnauthorizedException('Invalid API key');
  }

  assertScope(scopes: string[], required?: string) {
    if (!required) return;
    if (scopes.includes('*') || scopes.includes(required)) return;
    throw new ForbiddenException(`Missing scope: ${required}`);
  }

  sanitizeInput(value: string): string {
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').slice(0, 100_000);
  }

  detectAbuse(patterns: string[]): boolean {
    const blocked = ['<script', 'javascript:', '../', 'union select', 'drop table'];
    return patterns.some((p) => blocked.some((b) => p.toLowerCase().includes(b)));
  }
}
