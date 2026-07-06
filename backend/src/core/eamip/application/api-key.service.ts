import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, clientId: string, userId: string, name: string, expiresAt?: Date) {
    const raw = `ag_${randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(raw, 10);
    const keyPrefix = raw.slice(0, 12);
    await this.prisma.apiClientKey.create({
      data: {
        organizationId,
        clientId,
        keyHash,
        keyPrefix,
        name,
        expiresAt,
        createdBy: userId,
      },
    });
    return { apiKey: raw, keyPrefix, name, expiresAt };
  }

  async revoke(organizationId: string, keyId: string) {
    return this.prisma.apiClientKey.updateMany({
      where: { id: keyId, organizationId },
      data: { isActive: false },
    });
  }
}
