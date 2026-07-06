import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiProviderAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listProviders(organizationId: string) {
    return this.prisma.aiProviderConfig.findMany({
      where: { organizationId },
      include: { models: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProvider(
    organizationId: string,
    userId: string,
    data: {
      providerKey: string;
      providerType: string;
      name: string;
      baseUrl?: string;
      apiKeyRef?: string;
      isDefault?: boolean;
      settings?: Record<string, unknown>;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.aiProviderConfig.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }
    return this.prisma.aiProviderConfig.create({
      data: {
        organizationId,
        providerKey: data.providerKey,
        providerType: data.providerType as 'openai',
        name: data.name,
        baseUrl: data.baseUrl,
        apiKeyRef: data.apiKeyRef,
        isDefault: data.isDefault ?? false,
        settings: (data.settings ?? {}) as object,
        createdBy: userId,
      },
    });
  }

  async updateProvider(organizationId: string, id: string, data: Partial<{
    name: string;
    baseUrl: string;
    apiKeyRef: string;
    isDefault: boolean;
    isActive: boolean;
    settings: Record<string, unknown>;
  }>) {
    const provider = await this.prisma.aiProviderConfig.findFirst({ where: { id, organizationId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (data.isDefault) {
      await this.prisma.aiProviderConfig.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }
    return this.prisma.aiProviderConfig.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl } : {}),
        ...(data.apiKeyRef !== undefined ? { apiKeyRef: data.apiKeyRef } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.settings ? { settings: data.settings as object } : {}),
      },
    });
  }

  async createModel(
    organizationId: string,
    data: {
      providerId: string;
      modelKey: string;
      displayName: string;
      modelType?: string;
      capabilities?: string[];
      costPer1kIn?: number;
      costPer1kOut?: number;
      isDefault?: boolean;
    },
  ) {
    const provider = await this.prisma.aiProviderConfig.findFirst({
      where: { id: data.providerId, organizationId },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    if (data.isDefault) {
      await this.prisma.aiModelDefinition.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    return this.prisma.aiModelDefinition.create({
      data: {
        organizationId,
        providerId: data.providerId,
        modelKey: data.modelKey,
        displayName: data.displayName,
        modelType: data.modelType ?? 'chat',
        capabilities: data.capabilities ?? ['chat', 'completion'],
        costPer1kIn: data.costPer1kIn,
        costPer1kOut: data.costPer1kOut,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async listModels(organizationId: string) {
    return this.prisma.aiModelDefinition.findMany({
      where: { organizationId },
      include: { provider: true },
      orderBy: { displayName: 'asc' },
    });
  }

  async listConversations(organizationId: string, userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { organizationId, userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
      take: 50,
    });
  }

  async getConversation(organizationId: string, userId: string, id: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, organizationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    return conv;
  }
}
