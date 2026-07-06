import { EPOP_CACHE_LAYERS, EPOP_PERF_KINDS } from '@agroerp/shared';
import { buildPaginatedResult, normalizePagination } from '../domain/pagination.engine';
import { queryFingerprint } from '../domain/query-optimizer.engine';

describe('EPOP Load', () => {
  it('paginates 100k conceptual rows under 50ms', () => {
    const start = Date.now();
    const page = normalizePagination({ page: 400, pageSize: 50 });
    const items = Array.from({ length: page.pageSize }, (_, i) => page.skip + i);
    const result = buildPaginatedResult(items, 100_000, page.page, page.pageSize);
    expect(result.items[0]).toBe(19950);
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('fingerprints 10k queries under 2s', () => {
    const start = Date.now();
    for (let i = 0; i < 10_000; i++) {
      queryFingerprint(`SELECT * FROM events WHERE id = ${i}`);
    }
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe('EPOP catalog completeness', () => {
  it('includes cache layers and perf kinds', () => {
    expect(EPOP_CACHE_LAYERS).toEqual(expect.arrayContaining(['client', 'server', 'data']));
    for (const k of ['response_time', 'slow_query', 'memory', 'cpu', 'fps', 'bundle_size', 'module_latency']) {
      expect(EPOP_PERF_KINDS).toContain(k);
    }
  });
});
