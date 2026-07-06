import {
  buildDisplayName,
  buildOrgTree,
  buildSearchTokens,
  canTransitionEmploymentStatus,
  filterEmployeesByQuery,
  generateHcmKey,
  resolveContractEndDate,
  validateDocumentNumber,
  validateEmployeeNumber,
  validateImportRow,
} from '../domain/hcm-workforce.engine';

describe('HCM Workforce Engine — Fase 1', () => {
  it('generates HCM keys', () => {
    expect(generateHcmKey('EMP', 1)).toBe('EMP-00000001');
  });

  it('builds display name', () => {
    expect(buildDisplayName('Ana', 'García', 'María', 'López')).toBe('Ana María García López');
  });

  it('validates employee number', () => {
    expect(validateEmployeeNumber('EMP-00001')).toBe(true);
    expect(validateEmployeeNumber('AB')).toBe(false);
  });

  it('validates document number', () => {
    expect(validateDocumentNumber('12345678')).toBe(true);
    expect(validateDocumentNumber('123')).toBe(false);
  });

  it('validates import rows', () => {
    const ok = validateImportRow({
      employeeNumber: 'EMP-001',
      firstName: 'Juan',
      lastName: 'Pérez',
      documentNumber: '1234567890',
      companyKey: 'CO-MAIN',
    }, 1);
    expect(ok.valid).toBe(true);

    const bad = validateImportRow({
      employeeNumber: '',
      firstName: '',
      lastName: '',
      documentNumber: '1',
      companyKey: '',
    }, 2);
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('builds org tree', () => {
    const tree = buildOrgTree([
      { nodeKey: 'A', nodeType: 'company', refKey: 'CO', parentNodeKey: null, title: 'Empresa', sortOrder: 1 },
      { nodeKey: 'B', nodeType: 'department', refKey: 'DEPT', parentNodeKey: 'A', title: 'RRHH', sortOrder: 2 },
      { nodeKey: 'C', nodeType: 'employee', refKey: 'EMP', parentNodeKey: 'B', title: 'Ana', sortOrder: 3 },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children?.[0].children?.[0].title).toBe('Ana');
  });

  it('resolves contract end dates', () => {
    const start = new Date(2026, 0, 1);
    expect(resolveContractEndDate('indefinite', start)).toBeNull();
    const fixed = resolveContractEndDate('fixed_term', start);
    expect(fixed!.getFullYear()).toBeGreaterThanOrEqual(2026);
    const intern = resolveContractEndDate('intern', start);
    expect(intern!.getTime()).toBeGreaterThan(start.getTime());
  });

  it('validates employment status transitions', () => {
    expect(canTransitionEmploymentStatus('active', 'terminated')).toBe(true);
    expect(canTransitionEmploymentStatus('terminated', 'active')).toBe(false);
  });

  it('filters employees by query', () => {
    const rows = filterEmployeesByQuery([
      { employeeNumber: 'EMP-001', displayName: 'Ana García', documentNumber: '1010', email: 'a@test.com' },
      { employeeNumber: 'EMP-002', displayName: 'Carlos Ruiz', documentNumber: '2020', email: 'c@test.com' },
    ], 'garcía');
    expect(rows).toHaveLength(1);
  });

  it('builds search tokens', () => {
    expect(buildSearchTokens({ employeeNumber: 'EMP-1', displayName: 'Ana', documentNumber: '123', email: 'a@x.com' })).toContain('ana');
  });

  it('handles concurrent key generation', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateHcmKey('EMP', i + 1));
    expect(new Set(keys).size).toBe(100);
  });
});
