import { AccessControlService } from '@/core/identity/application/access-control.service';

describe('FMDT Security — permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService({} as never, {} as never);
  });

  it('denies lot:create without permission', () => {
    expect(service.hasPermission(['lot:read'], 'lot:create')).toBe(false);
  });

  it('allows lot:import explicit', () => {
    expect(service.hasPermission(['lot:import', 'lot:read'], 'lot:import')).toBe(true);
  });

  it('allows field_operation:create', () => {
    expect(
      service.hasPermission(['field_operation:create', 'lot:read'], 'field_operation:create'),
    ).toBe(true);
  });

  it('denies lot:approve to field agent permissions', () => {
    const perms = ['lot:read', 'lot:create', 'lot:update', 'field_operation:create'];
    expect(service.hasPermission(perms, 'lot:approve')).toBe(false);
    expect(service.hasPermission(perms, 'lot_cost:approve')).toBe(false);
  });
});
