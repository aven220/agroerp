import { applyFieldMappings } from '../domain/field-map.engine';
import { transformData } from '../domain/transform.engine';
import { resolveRoute } from '../domain/route.engine';

describe('EIH Load — transform throughput', () => {
  it('processes 5k field mappings under 500ms', () => {
    const mappings = Array.from({ length: 50 }, (_, i) => ({
      sourceField: `field_${i}`,
      targetField: `target_${i}`,
    }));
    const source = Object.fromEntries(mappings.map((m) => [m.sourceField, `val_${m.sourceField}`]));
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      applyFieldMappings(source, mappings);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('transforms 2k JSON rows under 300ms', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ({ id: i, value: i * 1.5 }));
    const start = Date.now();
    transformData(rows, 'json', 'csv');
    expect(Date.now() - start).toBeLessThan(300);
  });

  it('evaluates 10k routing rules under 200ms', () => {
    const rules = [{ field: 'status', operator: 'eq' as const, value: 'active', targetStepKey: 'process' }];
    const start = Date.now();
    for (let i = 0; i < 10_000; i++) {
      resolveRoute(rules, { status: 'active' }, 'default');
    }
    expect(Date.now() - start).toBeLessThan(200);
  });
});
