import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey, hashApiKeyPreview } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceApiService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  listCredentials(organizationId: string) {
    return this.prisma.eaceApiCredential.findMany({
      where: { organizationId },
      select: {
        id: true, credentialKey: true, name: true, apiVersion: true,
        scopes: true, status: true, expiresAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async issueCredential(organizationId: string, userId: string, data: {
    name: string; apiVersion?: string; scopes?: string[]; expiresAt?: string;
  }) {
    const rawKey = randomBytes(24).toString('hex');
    const count = await this.prisma.eaceApiCredential.count({ where: { organizationId } });
    const credential = await this.prisma.eaceApiCredential.create({
      data: {
        organizationId,
        credentialKey: generateEaceKey('API', count + 1),
        name: data.name,
        apiVersion: data.apiVersion ?? 'v1',
        scopes: (data.scopes ?? ['read']) as object,
        hashedKey: hashApiKeyPreview(rawKey),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
    await this.audit.log(organizationId, 'ApiCredential', credential.credentialKey, 'api_key_issued', userId);
    return { ...credential, apiKey: rawKey, warning: 'Store this key securely; it will not be shown again.' };
  }

  async logAccess(organizationId: string, credentialKey: string, endpoint: string, method: string, statusCode?: number) {
    const credential = await this.prisma.eaceApiCredential.findFirst({ where: { organizationId, credentialKey, status: 'active' } });
    if (!credential) return null;
    const count = await this.prisma.eaceApiAccessLog.count({ where: { organizationId } });
    return this.prisma.eaceApiAccessLog.create({
      data: {
        organizationId,
        logKey: generateEaceKey('LOG', count + 1),
        credentialId: credential.id,
        endpoint,
        method,
        statusCode,
      },
    });
  }

  listAccessLogs(organizationId: string, limit = 100) {
    return this.prisma.eaceApiAccessLog.findMany({
      where: { organizationId },
      include: { credential: { select: { name: true, credentialKey: true } } },
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });
  }

  publicApiManifest() {
    return {
      version: 'v1',
      basePath: '/api/v1/eace/public',
      endpoints: [
        { path: '/producers', method: 'GET', scope: 'read' },
        { path: '/contracts', method: 'GET', scope: 'read' },
        { path: '/marketplace', method: 'GET', scope: 'read' },
        { path: '/knowledge', method: 'GET', scope: 'read' },
        { path: '/executive/summary', method: 'GET', scope: 'executive' },
      ],
      auth: 'bearer_api_key',
    };
  }

  async publicQuery(organizationId: string, resource: string) {
    switch (resource) {
      case 'producers':
        return this.prisma.eaceProducerProfile.findMany({ where: { organizationId, status: 'active' }, take: 50 });
      case 'contracts':
        return this.prisma.eaceAgContract.findMany({ where: { organizationId, status: 'active' }, take: 50 });
      case 'marketplace':
        return this.prisma.eaceMarketplaceListing.findMany({ where: { organizationId, status: 'active' }, take: 50 });
      case 'knowledge':
        return this.prisma.eaceKnowledgeItem.findMany({ where: { organizationId, status: 'active' }, take: 50 });
      default:
        return { error: 'resource_not_found' };
    }
  }
}
