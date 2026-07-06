import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiProviderRequest, AiProviderResponse } from '../domain/ai-provider.port';

@Injectable()
export class AiModelRouterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiProviderRegistryService,
  ) {}

  async resolveModel(organizationId: string, modelKey?: string) {
    if (modelKey) {
      const model = await this.prisma.aiModelDefinition.findFirst({
        where: { organizationId, modelKey, isActive: true },
        include: { provider: true },
      });
      if (model) return model;
    }

    const defaultModel = await this.prisma.aiModelDefinition.findFirst({
      where: { organizationId, isDefault: true, isActive: true },
      include: { provider: true },
    });
    if (defaultModel) return defaultModel;

    const anyModel = await this.prisma.aiModelDefinition.findFirst({
      where: { organizationId, isActive: true },
      include: { provider: true },
    });
    if (anyModel) return anyModel;

    throw new NotFoundException('No hay modelos de IA configurados');
  }

  async route(
    organizationId: string,
    request: AiProviderRequest,
    modelKey?: string,
  ): Promise<AiProviderResponse & { providerId?: string; costPer1kIn?: number; costPer1kOut?: number }> {
    const model = await this.resolveModel(organizationId, modelKey ?? request.modelKey);
    const provider = model.provider;
    const adapter = this.registry.get(provider.providerType);
    const settings = {
      ...(provider.settings as Record<string, unknown>),
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKeyRef ? process.env[provider.apiKeyRef] : undefined,
    };

    if (adapter.isConfigured(settings)) {
      const result = await adapter.complete({ ...request, modelKey: model.modelKey }, settings);
      return {
        ...result,
        providerId: provider.id,
        costPer1kIn: model.costPer1kIn ? Number(model.costPer1kIn) : undefined,
        costPer1kOut: model.costPer1kOut ? Number(model.costPer1kOut) : undefined,
      };
    }

    const fallback = this.registry.get('enterprise');
    const result = await fallback.complete({ ...request, modelKey: model.modelKey }, settings);
    return {
      ...result,
      providerId: provider.id,
      costPer1kIn: 0,
      costPer1kOut: 0,
    };
  }
}
