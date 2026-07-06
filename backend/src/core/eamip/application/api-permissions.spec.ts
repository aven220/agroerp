import { AccessControlService } from '@/core/identity/application/access-control.service';

describe('EAMIP Security — permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService({} as never, {} as never);
  });

  it('denies api:configure without permission', () => {
    expect(service.hasPermission(['api:read'], 'api:configure')).toBe(false);
  });

  it('allows api:client:manage', () => {
    expect(service.hasPermission(['api:client:manage', 'api:read'], 'api:client:manage')).toBe(true);
  });

  it('denies api:key:manage to read-only', () => {
    expect(service.hasPermission(['api:read'], 'api:key:manage')).toBe(false);
  });

  it('allows api:developer:portal', () => {
    expect(service.hasPermission(['api:developer:portal'], 'api:developer:portal')).toBe(true);
  });
});
