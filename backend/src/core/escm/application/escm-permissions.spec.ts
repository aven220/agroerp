import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('ESCM permissions', () => {
  const perms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'sales');

  it('defines sales module permissions', () => {
    const actions = perms.map((p) => p.action);
    expect(actions).toContain('read');
    expect(actions).toContain('customer');
    expect(actions).toContain('pricing');
    expect(actions).toContain('config');
    expect(actions).toContain('catalog');
    expect(actions).toContain('audit');
    expect(actions).toContain('admin');
    expect(actions).toContain('crm');
    expect(actions).toContain('opportunity');
    expect(actions).toContain('quotation');
    expect(actions).toContain('order');
    expect(actions).toContain('approve');
    expect(actions).toContain('reservation');
    expect(actions).toContain('dispatch');
    expect(actions).toContain('delivery');
    expect(actions).toContain('logistics');
    expect(perms.length).toBeGreaterThanOrEqual(16);
  });
});
