import { createHash } from 'crypto';
import { IntegrationSecurityService } from './integration-security.service';
import { applyFieldMappings, suggestMappings } from '../domain/field-map.engine';
import { transformData } from '../domain/transform.engine';
import { resolveRoute } from '../domain/route.engine';

describe('IntegrationSecurityService', () => {
  const security = new IntegrationSecurityService({} as never);

  it('hashes secrets consistently', () => {
    const hash = security.hashSecret('test-secret');
    expect(hash).toBe(createHash('sha256').update('test-secret').digest('hex'));
  });

  it('generates eih API keys', () => {
    const key = security.generateApiKey();
    expect(key).toMatch(/^eih_/);
  });
});

describe('EIH FieldMapEngine', () => {
  it('maps and transforms fields', () => {
    const result = applyFieldMappings(
      { name: 'cafe', qty: '100' },
      [
        { sourceField: 'name', targetField: 'product', transform: 'uppercase' },
        { sourceField: 'qty', targetField: 'quantity', transform: 'number' },
      ],
    );
    expect(result).toEqual({ product: 'CAFE', quantity: 100 });
  });

  it('suggests matching field names', () => {
    const suggestions = suggestMappings(
      ['producer_name', 'lot_code'],
      ['producerName', 'lotCode'],
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('EIH TransformEngine', () => {
  it('converts JSON to CSV', () => {
    const csv = transformData([{ a: 1, b: 2 }], 'json', 'csv');
    expect(String(csv)).toContain('a,b');
  });
});

describe('EIH RouteEngine', () => {
  it('resolves routing rules', () => {
    const step = resolveRoute(
      [{ field: 'type', operator: 'eq', value: 'invoice', targetStepKey: 'billing' }],
      { type: 'invoice' },
      'default',
    );
    expect(step).toBe('billing');
  });
});
