import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('EPOP permissions', () => {
  const perms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'performance');

  it('defines all required performance permissions', () => {
    expect(perms.map((p) => p.action).sort()).toEqual(
      ['admin', 'audit:read', 'benchmark', 'cache:manage', 'optimize', 'read'].sort(),
    );
  });
});
