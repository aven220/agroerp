import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('EIH permissions', () => {
  const perms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'integration');

  it('defines all required integration permissions', () => {
    const actions = perms.map((p) => p.action).sort();
    expect(actions).toEqual(
      [
        'admin',
        'audit:read',
        'create',
        'execute',
        'publish',
        'read',
        'sync:manage',
        'update',
        'webhook:manage',
      ].sort(),
    );
  });
});
