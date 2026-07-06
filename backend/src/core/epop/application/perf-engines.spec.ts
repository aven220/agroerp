import { buildPaginatedResult, normalizePagination } from '../domain/pagination.engine';
import { cacheHitRatio, computeExpiresAt, isExpired } from '../domain/cache.engine';
import { extractTableNames, improvementPct, queryFingerprint, suggestIndex } from '../domain/query-optimizer.engine';

describe('EPOP PaginationEngine', () => {
  it('normalizes page bounds', () => {
    expect(normalizePagination({ page: 0, pageSize: 1000 })).toEqual({ page: 1, pageSize: 200, skip: 0 });
    expect(normalizePagination({ page: 3, pageSize: 10 }).skip).toBe(20);
  });

  it('builds paginated result', () => {
    const result = buildPaginatedResult([1, 2], 50, 1, 25);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(true);
  });
});

describe('EPOP CacheEngine', () => {
  it('computes expiry and hit ratio', () => {
    const exp = computeExpiresAt(60, new Date('2026-01-01T00:00:00Z'));
    expect(isExpired(exp, new Date('2026-01-01T00:02:00Z'))).toBe(true);
    expect(cacheHitRatio(80, 20)).toBe(0.8);
  });
});

describe('EPOP QueryOptimizerEngine', () => {
  it('fingerprints and extracts tables', () => {
    const sql = 'SELECT * FROM events JOIN users ON users.id = events.user_id';
    expect(queryFingerprint(sql)).toHaveLength(24);
    expect(extractTableNames(sql)).toEqual(expect.arrayContaining(['events', 'users']));
  });

  it('suggests indexes and improvement', () => {
    const rec = suggestIndex('events', ['organization_id', 'created_at']);
    expect(rec.indexSql).toContain('CREATE INDEX');
    expect(improvementPct(200, 100)).toBe(50);
  });
});
