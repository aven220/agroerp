import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class IamMfaService {
  constructor(private readonly prisma: PrismaService) {}

  async setupTotp(organizationId: string, userId: string, label?: string) {
    const secret = this.generateSecret();
    const factor = await this.prisma.iamMfaFactor.create({
      data: {
        organizationId,
        userId,
        factorType: 'totp',
        secretEnc: secret,
        label: label ?? 'Authenticator',
        isVerified: false,
      },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const otpauth = `otpauth://totp/AGROERP:${user?.email}?secret=${secret}&issuer=AGROERP`;
    return { factorId: factor.id, secret, otpauth };
  }

  async verifyTotp(organizationId: string, userId: string, code: string, factorId?: string) {
    const factor = await this.prisma.iamMfaFactor.findFirst({
      where: {
        organizationId,
        userId,
        factorType: 'totp',
        ...(factorId ? { id: factorId } : { isPrimary: true }),
        isVerified: true,
      },
    }) ?? await this.prisma.iamMfaFactor.findFirst({
      where: { organizationId, userId, factorType: 'totp', ...(factorId ? { id: factorId } : {}) },
    });

    if (!factor?.secretEnc) throw new UnauthorizedException('MFA no configurado');
    const valid = this.verifyCode(factor.secretEnc, code);
    if (!valid) throw new UnauthorizedException('Código MFA inválido');

    if (!factor.isVerified) {
      await this.prisma.iamMfaFactor.update({
        where: { id: factor.id },
        data: { isVerified: true, isPrimary: true },
      });
      await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    }
    return { verified: true };
  }

  async listFactors(organizationId: string, userId: string) {
    return this.prisma.iamMfaFactor.findMany({
      where: { organizationId, userId },
      select: { id: true, factorType: true, label: true, isVerified: true, isPrimary: true, createdAt: true },
    });
  }

  private generateSecret(): string {
    const bytes = randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += BASE32[bytes[i] % 32];
    }
    return secret;
  }

  private verifyCode(secret: string, code: string): boolean {
    const timestep = Math.floor(Date.now() / 30000);
    for (const offset of [-1, 0, 1]) {
      const expected = this.totp(secret, timestep + offset);
      if (expected === code.padStart(6, '0')) return true;
    }
    return false;
  }

  private totp(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
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

  private base32Decode(input: string): Buffer {
    const str = input.toUpperCase().replace(/=+$/, '');
    let bits = '';
    for (const c of str) {
      const val = BASE32.indexOf(c);
      if (val < 0) throw new BadRequestException('Invalid base32');
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }
}
