import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AuthService } from '@/core/identity/application/auth.service';

@Injectable()
export class IamOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  async registerClient(organizationId: string, data: {
    name: string;
    clientId: string;
    redirectUris: string[];
    scopes?: string[];
  }) {
    const secret = randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(secret, 10);
    await this.prisma.iamOAuthClient.create({
      data: {
        organizationId,
        clientId: data.clientId,
        clientSecretHash: hash,
        name: data.name,
        redirectUris: data.redirectUris,
        scopes: data.scopes ?? ['openid', 'profile'],
      },
    });
    return { clientId: data.clientId, clientSecret: secret };
  }

  async listClients(organizationId: string) {
    return this.prisma.iamOAuthClient.findMany({
      where: { organizationId },
      select: { id: true, clientId: true, name: true, redirectUris: true, scopes: true, isActive: true },
    });
  }

  async token(clientId: string, clientSecret: string, grantType: string) {
    const client = await this.prisma.iamOAuthClient.findFirst({
      where: { clientId, isActive: true },
    });
    if (!client) return null;
    const valid = await bcrypt.compare(clientSecret, client.clientSecretHash);
    if (!valid) return null;

    if (grantType === 'client_credentials') {
      const payload = {
        sub: client.id,
        orgId: client.organizationId,
        roles: ['service'],
        permissions: client.scopes,
        clientId: client.clientId,
      };
      return {
        access_token: this.jwt.sign(payload, { expiresIn: '1h' }),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: client.scopes.join(' '),
      };
    }
    return null;
  }
}
