import { AccessControlService } from '@/core/identity/application/access-control.service';

describe('PRM Security — permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService({} as never, {} as never);
  });

  it('denies producer:create without permission', () => {
    expect(service.hasPermission(['producer:read'], 'producer:create')).toBe(false);
  });

  it('allows producer:* wildcard', () => {
    expect(service.hasPermission(['producer:*'], 'producer:delete')).toBe(true);
  });

  it('allows explicit producer:export', () => {
    expect(service.hasPermission(['producer:export', 'producer:read'], 'producer:export')).toBe(true);
  });

  it('denies producer:admin to field agent role permissions', () => {
    const fieldAgentPerms = ['producer:read', 'producer:create', 'producer:update'];
    expect(service.hasPermission(fieldAgentPerms, 'producer:admin')).toBe(false);
    expect(service.hasPermission(fieldAgentPerms, 'producer:merge')).toBe(false);
  });
});
