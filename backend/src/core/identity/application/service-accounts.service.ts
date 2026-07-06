import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { CreateServiceAccountDto } from '../presentation/identity.dto';

@Injectable()
export class ServiceAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.serviceAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        clientId: true,
        active: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        permissions: true,
        scopes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateServiceAccountDto, userId: string) {
    const clientId = `agro_${randomBytes(12).toString('hex')}`;
    const clientSecret = randomBytes(32).toString('hex');
    const clientSecretHash = await bcrypt.hash(clientSecret, 12);

    const account = await this.prisma.serviceAccount.create({
      data: {
        organizationId,
        name: dto.name,
        clientId,
        clientSecretHash,
        permissions: (dto.permissions ?? []) as object,
        scopes: (dto.scopes ?? {}) as object,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'ServiceAccount',
      account.id,
      EVENT_TYPES.SERVICE_ACCOUNT_CREATED,
      { name: account.name, clientId: account.clientId },
      { ctx: { userId, organizationId } },
    );

    return {
      ...account,
      clientSecret,
    };
  }

  async createApiKey(
    organizationId: string,
    serviceAccountId: string,
    name: string,
    userId: string,
  ) {
    const prefix = `ak_${randomBytes(4).toString('hex')}`;
    const secret = randomBytes(24).toString('hex');
    const rawKey = `${prefix}.${secret}`;
    const keyHash = await bcrypt.hash(rawKey, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        serviceAccountId,
        name,
        keyPrefix: prefix,
        keyHash,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'ServiceAccount',
      serviceAccountId,
      EVENT_TYPES.API_KEY_CREATED,
      { apiKeyId: apiKey.id, name },
      { ctx: { userId, organizationId } },
    );

    return { ...apiKey, rawKey };
  }
}
