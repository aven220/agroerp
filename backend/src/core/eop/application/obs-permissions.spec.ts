import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('EOP permissions', () => {
  const perms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'observability');

  it('defines all required observability permissions', () => {
    expect(perms.map((p) => p.action).sort()).toEqual(
      ['admin', 'alerts:manage', 'audit:read', 'incidents:manage', 'ingest', 'read'].sort(),
    );
  });
});
