import { AccessControlService } from '@/core/identity/application/access-control.service';

describe('EAIDSP Security — permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService({} as never, {} as never);
  });

  it('denies ai:configure without permission', () => {
    expect(service.hasPermission(['ai:read'], 'ai:configure')).toBe(false);
  });

  it('allows ai:chat with ai:copilot:use', () => {
    expect(service.hasPermission(['ai:chat', 'ai:copilot:use'], 'ai:chat')).toBe(true);
  });

  it('denies ai:admin to standard chat user', () => {
    expect(service.hasPermission(['ai:read', 'ai:chat'], 'ai:admin')).toBe(false);
  });

  it('allows ai:prompt:approve to admin bundle', () => {
    expect(service.hasPermission(['ai:prompt:approve', 'ai:configure'], 'ai:prompt:approve')).toBe(true);
  });

  it('denies ai:rag:manage without explicit permission', () => {
    expect(service.hasPermission(['ai:rag:read'], 'ai:rag:manage')).toBe(false);
  });
});
