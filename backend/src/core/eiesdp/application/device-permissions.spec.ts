import { SYSTEM_PERMISSIONS } from '@agroerp/shared';

describe('EIESDP permissions', () => {
  const iotPerms = SYSTEM_PERMISSIONS.filter((p) => p.resource === 'iot');

  it('defines all required IoT permissions', () => {
    const actions = iotPerms.map((p) => p.action).sort();
    expect(actions).toEqual(
      [
        'admin',
        'audit:read',
        'control',
        'edge:manage',
        'firmware:manage',
        'read',
        'register',
        'revoke',
        'telemetry:read',
        'update',
      ].sort(),
    );
  });

  it('scopes IoT permissions to organization', () => {
    expect(iotPerms.every((p) => p.scope === 'org')).toBe(true);
  });
});
