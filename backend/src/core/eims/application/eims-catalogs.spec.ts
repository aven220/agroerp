import {
  EIMS_CATALOG_KEYS,
  EIMS_ITEM_TYPES,
  generateItemCodes,
  generateLocationKey,
} from '../domain/eims.catalogs';

describe('EIMS Catalogs', () => {
  it('defines required catalog keys and item types', () => {
    expect(EIMS_CATALOG_KEYS).toContain('item_type');
    expect(EIMS_CATALOG_KEYS).toContain('uom');
    expect(EIMS_CATALOG_KEYS).toContain('warehouse_type');
    expect(EIMS_ITEM_TYPES.some((t) => t.entryKey === 'coffee_parchment')).toBe(true);
    expect(EIMS_ITEM_TYPES.some((t) => t.entryKey === 'fertilizer')).toBe(true);
  });

  it('generates item and location codes', () => {
    const codes = generateItemCodes('CAF-PERG-001');
    expect(codes.qrCode).toBe('EIMS:CAF-PERG-001');
    expect(codes.barcode.length).toBeGreaterThan(0);
    expect(
      generateLocationKey({ warehouseKey: 'WH-MAIN', aisle: 'A', shelf: '01', level: '1', position: '2' }),
    ).toBe('WH-MAIN-A-01-1-2');
  });

  it('handles concurrent code generation independently', () => {
    const a = generateItemCodes('ITEM-A');
    const b = generateItemCodes('ITEM-B');
    expect(a.qrCode).not.toBe(b.qrCode);
  });
});
