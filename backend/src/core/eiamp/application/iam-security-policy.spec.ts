import { IamSecurityPolicyService } from './iam-security-policy.service';

describe('IamSecurityPolicyService', () => {
  const service = new IamSecurityPolicyService({} as never);

  it('allows access when allowedHours is empty', () => {
    expect(service.isWithinAllowedHours({ allowedHours: null })).toBe(true);
    expect(service.isWithinAllowedHours({ allowedHours: {} })).toBe(true);
  });

  it('respects timezone when checking allowed hours', () => {
    const spy = jest.spyOn(service as unknown as { currentHourInTimezone: (tz: string) => number }, 'currentHourInTimezone');
    spy.mockReturnValue(10);
    expect(
      service.isWithinAllowedHours({
        allowedHours: { start: '06:00', end: '22:00', timezone: 'America/Bogota' },
      }),
    ).toBe(true);
    spy.mockReturnValue(2);
    expect(
      service.isWithinAllowedHours({
        allowedHours: { start: '06:00', end: '22:00', timezone: 'America/Bogota' },
      }),
    ).toBe(false);
    spy.mockRestore();
  });

  it('detects password expiry', () => {
    const old = new Date(Date.now() - 100 * 86_400_000);
    expect(service.isPasswordExpired(old, 90)).toBe(true);
    expect(service.isPasswordExpired(new Date(), 90)).toBe(false);
    expect(service.isPasswordExpired(null, 90)).toBe(false);
  });
});
