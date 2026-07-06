import { Injectable } from '@nestjs/common';
import { EVENT_TYPES, EpopCacheSetPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { computeExpiresAt, isExpired } from '../domain/cache.engine';

@Injectable()
export class PerfCacheService {
  private readonly memory = new Map<string, { value: Record<string, unknown>; expiresAt: number; hits: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  private memKey(layer: string, cacheKey: string) {
    return `${layer}:${cacheKey}`;
  }

  async get(organizationId: string | undefined, cacheKey: string, layer: 'client' | 'server' | 'data' = 'server') {
    const mk = this.memKey(layer, cacheKey);
    const mem = this.memory.get(mk);
    if (mem && mem.expiresAt > Date.now()) {
      mem.hits += 1;
      if (organizationId) {
        await this.core.emitUserAction(organizationId, 'Cache', cacheKey, EVENT_TYPES.PERF_CACHE_HIT, { layer, source: 'memory' });
      }
      return { hit: true, layer, source: 'memory', value: mem.value, hits: mem.hits };
    }

    const row = await this.prisma.epopCacheEntry.findUnique({
      where: { cacheKey_layer: { cacheKey, layer } },
    });
    if (!row || isExpired(row.expiresAt)) {
      if (row) await this.prisma.epopCacheEntry.delete({ where: { id: row.id } }).catch(() => undefined);
      if (organizationId) {
        await this.core.emitUserAction(organizationId, 'Cache', cacheKey, EVENT_TYPES.PERF_CACHE_MISS, { layer });
      }
      return { hit: false, layer, source: null, value: null };
    }

    const updated = await this.prisma.epopCacheEntry.update({
      where: { id: row.id },
      data: { hitCount: { increment: 1 } },
    });
    this.memory.set(mk, {
      value: updated.value as Record<string, unknown>,
      expiresAt: updated.expiresAt.getTime(),
      hits: updated.hitCount,
    });
    if (organizationId) {
      await this.core.emitUserAction(organizationId, 'Cache', cacheKey, EVENT_TYPES.PERF_CACHE_HIT, { layer, source: 'data' });
    }
    return { hit: true, layer, source: 'data', value: updated.value, hits: updated.hitCount };
  }

  async set(organizationId: string | undefined, payload: EpopCacheSetPayload) {
    const layer = (payload.layer ?? 'server') as 'server';
    const ttlSeconds = payload.ttlSeconds ?? 300;
    const expiresAt = computeExpiresAt(ttlSeconds);
    const entry = await this.prisma.epopCacheEntry.upsert({
      where: { cacheKey_layer: { cacheKey: payload.cacheKey, layer } },
      update: {
        value: payload.value as object,
        ttlSeconds,
        expiresAt,
        organizationId,
      },
      create: {
        organizationId,
        cacheKey: payload.cacheKey,
        layer,
        value: payload.value as object,
        ttlSeconds,
        expiresAt,
      },
    });
    this.memory.set(this.memKey(layer, payload.cacheKey), {
      value: payload.value,
      expiresAt: expiresAt.getTime(),
      hits: entry.hitCount,
    });
    return entry;
  }

  async invalidate(cacheKey: string, layer: 'client' | 'server' | 'data' = 'server') {
    this.memory.delete(this.memKey(layer, cacheKey));
    await this.prisma.epopCacheEntry.deleteMany({ where: { cacheKey, layer } });
    return { invalidated: true, cacheKey, layer };
  }

  async purgeExpired() {
    const now = new Date();
    for (const [key, val] of this.memory) {
      if (val.expiresAt <= now.getTime()) this.memory.delete(key);
    }
    const result = await this.prisma.epopCacheEntry.deleteMany({ where: { expiresAt: { lte: now } } });
    return { purged: result.count };
  }

  stats(organizationId?: string) {
    return this.prisma.epopCacheEntry.groupBy({
      by: ['layer'],
      where: organizationId ? { organizationId } : {},
      _count: { id: true },
      _sum: { hitCount: true },
    });
  }
}
