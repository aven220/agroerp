import {
  canTransitionStatus,
  classifyCustomer,
  generateCustomerKey,
  mergeOfflineVisits,
  validateCustomerInput,
} from '../domain/escm-customer.engine';
import { ESCM_CATALOG_KEYS, ESCM_CUSTOMER_TYPES } from '../domain/escm.catalogs';

describe('ESCM Customer Engine', () => {
  it('defines catalog keys and customer types', () => {
    expect(ESCM_CATALOG_KEYS).toContain('customer_type');
    expect(ESCM_CATALOG_KEYS).toContain('sales_channel');
    expect(ESCM_CUSTOMER_TYPES.some((t) => t.entryKey === 'exporter')).toBe(true);
    expect(ESCM_CUSTOMER_TYPES.some((t) => t.entryKey === 'international')).toBe(true);
  });

  it('generates customer keys by type', () => {
    expect(generateCustomerKey('company', 1)).toBe('CUS-COM-000001');
    expect(generateCustomerKey('international', 42)).toBe('CUS-INT-000042');
  });

  it('validates customer input', () => {
    expect(validateCustomerInput({})).toBe('Nombre legal requerido');
    expect(validateCustomerInput({ legalName: 'ACME', customerType: 'company' })).toBeNull();
    expect(validateCustomerInput({ legalName: 'X', customerType: 'company', creditLimit: 100, creditUsed: 200 })).toContain('excede');
  });

  it('enforces status transitions', () => {
    expect(canTransitionStatus('prospect', 'active')).toBe(true);
    expect(canTransitionStatus('prospect', 'suspended')).toBe(false);
    expect(canTransitionStatus('blocked', 'active')).toBe(false);
  });

  it('classifies customers by value and activity', () => {
    expect(classifyCustomer({ lifetimeValue: 0, status: 'inactive', lastPurchaseAt: new Date() })).toBe('inactive');
    expect(classifyCustomer({ lifetimeValue: 0, status: 'prospect', lastPurchaseAt: null })).toBe('prospect');
    expect(classifyCustomer({ lifetimeValue: 200000000, status: 'active', lastPurchaseAt: new Date() })).toBe('strategic');
  });

  it('merges offline visits by visitKey keeping latest visitedAt', () => {
    const existing = [
      { visitKey: 'V1', visitedAt: '2026-01-01T10:00:00Z', purpose: 'old' },
      { visitKey: 'V2', visitedAt: '2026-01-02T10:00:00Z', purpose: 'b' },
    ];
    const incoming = [
      { visitKey: 'V1', visitedAt: '2026-01-03T10:00:00Z', purpose: 'new' },
      { visitKey: 'V3', visitedAt: '2026-01-04T10:00:00Z', purpose: 'c' },
    ];
    const merged = mergeOfflineVisits(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.find((v) => v.visitKey === 'V1')?.purpose).toBe('new');
    expect(merged[0].visitKey).toBe('V3');
  });

  it('handles concurrent merge independently', () => {
    const a = mergeOfflineVisits(
      [{ visitKey: 'A', visitedAt: '2026-01-01' }],
      [{ visitKey: 'B', visitedAt: '2026-01-02' }],
    );
    const b = mergeOfflineVisits(
      [{ visitKey: 'C', visitedAt: '2026-01-01' }],
      [{ visitKey: 'D', visitedAt: '2026-01-02' }],
    );
    expect(a.map((v) => v.visitKey).sort()).toEqual(['A', 'B']);
    expect(b.map((v) => v.visitKey).sort()).toEqual(['C', 'D']);
  });
});
