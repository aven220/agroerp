import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('CPEP permissions', () => {
  const perms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'coffee');

  it('defines coffee procurement permissions', () => {
    expect(perms.map((p) => p.action).sort()).toEqual(
      [
        'admin',
        'audit:read',
        'catalog:manage',
        'config:manage',
        'config:read',
        'inventory',
        'quality',
        'quality:configure',
        'quality:decide',
        'read',
        'receive',
        'settle',
        'settle:pay',
        'settle:void',
        'weigh',
        'weigh:configure',
        'weigh:manual',
      ].sort(),
    );
  });
});

