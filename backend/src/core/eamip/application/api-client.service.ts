import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiClientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.apiClient.findMany({
      where: { organizationId },
      include: { keys: { select: { id: true, keyPrefix: true, name: true, isActive: true, lastUsedAt: true, expiresAt: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const client = await this.prisma.apiClient.findFirst({
      where: { id, organizationId },
      include: { keys: true },
    });
    if (!client) throw new NotFoundException('Cliente API no encontrado');
    return client;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      clientKey: string;
      name: string;
      description?: string;
      scopes?: string[];
      rateLimitPerMinute?: number;
      rateLimitPerDay?: number;
      whitelistIps?: string[];
      blacklistIps?: string[];
    },
  ) {
    return this.prisma.apiClient.create({
      data: {
        organizationId,
        clientKey: data.clientKey,
        name: data.name,
        description: data.description,
        scopes: data.scopes ?? [],
        rateLimitPerMinute: data.rateLimitPerMinute ?? 120,
        rateLimitPerDay: data.rateLimitPerDay ?? 50000,
        whitelistIps: data.whitelistIps ?? [],
        blacklistIps: data.blacklistIps ?? [],
        createdBy: userId,
      },
    });
  }

  async updateStatus(organizationId: string, id: string, status: 'active' | 'suspended' | 'revoked') {
    await this.findOne(organizationId, id);
    return this.prisma.apiClient.update({ where: { id }, data: { status } });
  }
}
