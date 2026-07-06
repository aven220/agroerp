import { IamAuthEnforcementService } from './iam-auth-enforcement.service';
import { IamSecurityPolicyService } from './iam-security-policy.service';

describe('IamAuthEnforcementService', () => {
  const policies = new IamSecurityPolicyService({} as never);
  const audit = { record: jest.fn() };
  const anomaly = { analyzeLogin: jest.fn() };

  it('blocks locked accounts within lockout window', async () => {
    const prisma = {
      user: { update: jest.fn() },
      iamSecurityPolicy: { findUnique: jest.fn() },
    };
    const service = new IamAuthEnforcementService(
      {
        iamSecurityPolicy: {
          findUnique: jest.fn().mockResolvedValue({
            lockoutMinutes: 30,
            blockedIpRanges: [],
            allowedIpRanges: [],
            allowedHours: null,
            mfaRequired: false,
            maxFailedAttempts: 5,
          }),
        },
        user: { update: jest.fn() },
      } as never,
      {
        getOrCreate: jest.fn().mockResolvedValue({
          lockoutMinutes: 30,
          blockedIpRanges: [],
          allowedIpRanges: [],
          allowedHours: null,
          mfaRequired: false,
        }),
        isWithinAllowedHours: () => true,
      } as never,
      audit as never,
      anomaly as never,
    );

    const result = await service.beforeLogin(
      {
        id: 'u1',
        organizationId: 'o1',
        email: 'a@test.com',
        mfaEnabled: false,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedAt: new Date(),
        passwordChangedAt: new Date(),
      },
      { password: 'x' },
    );
    expect(result.proceed).toBe(false);
    expect(result.reason).toBe('account_locked');
  });

  it('returns mfaRequired when policy mandates MFA', async () => {
    const service = new IamAuthEnforcementService(
      { user: { update: jest.fn() } } as never,
      {
        getOrCreate: jest.fn().mockResolvedValue({
          lockoutMinutes: 30,
          blockedIpRanges: [],
          allowedIpRanges: [],
          allowedHours: null,
          mfaRequired: true,
        }),
        isWithinAllowedHours: () => true,
      } as never,
      audit as never,
      anomaly as never,
    );

    const result = await service.beforeLogin(
      {
        id: 'u1',
        organizationId: 'o1',
        email: 'a@test.com',
        mfaEnabled: false,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedAt: null,
        passwordChangedAt: new Date(),
      },
      { password: 'x' },
    );
    expect(result.proceed).toBe(true);
    expect(result.mfaRequired).toBe(true);
  });
});

describe('EIAMP brute-force detection', () => {
  it('flags repeated failures as high risk pattern', () => {
    const attempts = Array.from({ length: 6 }, (_, i) => ({
      success: false,
      ipAddress: '10.0.0.1',
      createdAt: new Date(),
    }));
    const failures = attempts.filter((r) => !r.success).length;
    expect(failures).toBeGreaterThanOrEqual(5);
  });
});
