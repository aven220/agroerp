import { createHmac, randomBytes } from 'crypto';
import { IamMfaService } from './iam-mfa.service';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function totpForTest(secret: string, counter: number): string {
  const key = (() => {
    let bits = '';
    for (const c of secret.toUpperCase()) {
      const val = BASE32.indexOf(c);
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  })();
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

describe('IamMfaService TOTP', () => {
  it('verifies valid TOTP codes with clock skew window', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const counter = Math.floor(Date.now() / 30000);
    const code = totpForTest(secret, counter);

    const factors: Array<Record<string, unknown>> = [
      { id: 'f1', secretEnc: secret, isVerified: false, factorType: 'totp' },
    ];

    const prisma = {
      iamMfaFactor: {
        findFirst: jest.fn().mockImplementation(async () => factors[0]),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(factors[0], data);
          return factors[0];
        }),
      },
      user: { update: jest.fn() },
    };

    const service = new IamMfaService(prisma as never);
    const result = await service.verifyTotp('org', 'user', code, 'f1');
    expect(result.verified).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rejects invalid TOTP codes', async () => {
    const prisma = {
      iamMfaFactor: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'f1',
          secretEnc: 'JBSWY3DPEHPK3PXP',
          isVerified: true,
          factorType: 'totp',
        }),
      },
    };
    const service = new IamMfaService(prisma as never);
    await expect(service.verifyTotp('org', 'user', '000000')).rejects.toThrow();
  });
});

describe('IamMfaService setup', () => {
  it('creates TOTP factor with otpauth URI', async () => {
    const created: Record<string, unknown> = {};
    const prisma = {
      iamMfaFactor: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(created, data, { id: 'factor-1' });
          return created;
        }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'admin@test.com' }) },
    };
    const service = new IamMfaService(prisma as never);
    const res = await service.setupTotp('org', 'user');
    expect(res.factorId).toBe('factor-1');
    expect(res.otpauth).toContain('otpauth://totp/');
    expect(res.secret.length).toBeGreaterThan(10);
  });
});
