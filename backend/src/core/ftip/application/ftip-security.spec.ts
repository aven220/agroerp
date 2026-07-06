import { AccessControlService } from '@/core/identity/application/access-control.service';

describe('FTIP Security — permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService({} as never, {} as never);
  });

  it('denies farm:create without permission', () => {
    expect(service.hasPermission(['farm:read'], 'farm:create')).toBe(false);
  });

  it('allows farm:* wildcard', () => {
    expect(service.hasPermission(['farm:*'], 'farm:delete')).toBe(true);
  });

  it('allows explicit farm:export', () => {
    expect(service.hasPermission(['farm:export', 'farm:read'], 'farm:export')).toBe(true);
  });

  it('allows territory:geometry for geometry updates', () => {
    expect(
      service.hasPermission(['territory:geometry', 'farm:read'], 'territory:geometry'),
    ).toBe(true);
  });

  it('denies farm:approve to field agent role permissions', () => {
    const fieldAgentPerms = ['farm:read', 'farm:create', 'farm:update', 'territory:geometry'];
    expect(service.hasPermission(fieldAgentPerms, 'farm:approve')).toBe(false);
    expect(service.hasPermission(fieldAgentPerms, 'farm:import')).toBe(false);
  });
});
