import { Inject, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HpaAuditService } from './hpa-audit.service';
import { HPA_AI_PORT, type HpaAiPort } from '../domain/hpa-ai.port';
import { AI_CAPABILITIES, generateHpaKey, type AiCapabilityCode } from '../domain/hpa-analytics.engine';
import type { HpaAiCapability } from '@prisma/client';

@Injectable()
export class HpaAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HpaAuditService,
    private readonly core: CoreEngineService,
    @Inject(HPA_AI_PORT) private readonly ai: HpaAiPort,
  ) {}

  capabilities() {
    return {
      capabilities: AI_CAPABILITIES,
      architecture: 'external-provider-ready',
      adapters: ['stub', 'http'],
      note: 'No se ejecutan modelos propios; se invoca proveedor externo cuando esté configurado',
    };
  }

  async listProviders(organizationId: string) {
    return this.prisma.hpaAiProviderConfig.findMany({
      where: { organizationId },
      orderBy: { providerName: 'asc' },
    });
  }

  async upsertProvider(organizationId: string, userId: string, input: {
    configKey?: string;
    providerName: string;
    baseUrl?: string;
    apiKeyRef?: string;
    capabilities?: string[];
    isActive?: boolean;
    settings?: Record<string, unknown>;
  }) {
    const configKey = input.configKey ?? generateHpaKey('AIC', (await this.prisma.hpaAiProviderConfig.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hpaAiProviderConfig.findFirst({ where: { organizationId, configKey } });
    const data = {
      providerName: input.providerName,
      baseUrl: input.baseUrl,
      apiKeyRef: input.apiKeyRef,
      capabilities: input.capabilities ?? [...AI_CAPABILITIES],
      isActive: input.isActive ?? false,
      settings: (input.settings ?? {}) as object,
    };
    const row = existing
      ? await this.prisma.hpaAiProviderConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.hpaAiProviderConfig.create({
          data: { organizationId, configKey, ...data },
        });
    await this.audit.log({
      organizationId, action: 'config', resource: 'HpaAiProviderConfig', userId,
      details: { configKey, isActive: row.isActive },
    });
    return row;
  }

  async insight(organizationId: string, userId: string, capability: AiCapabilityCode, employeeKey?: string) {
    const result = await this.ai.predict({
      organizationId,
      capability,
      employeeKey,
      context: { requestedBy: userId },
    });

    const insightKey = generateHpaKey('INS', Date.now() % 100000000);
    await this.prisma.hpaAiInsightCache.create({
      data: {
        organizationId,
        insightKey,
        capability: capability as HpaAiCapability,
        employeeKey,
        providerName: result.providerName,
        score: result.score ?? undefined,
        payload: result.payload as object,
        expiresAt: new Date(Date.now() + 24 * 3600000),
      },
    });

    await this.audit.log({
      organizationId, action: 'query', resource: 'HpaAiInsight', userId, employeeKey,
      details: { capability, status: result.status },
    });
    await this.core.emitUserAction(organizationId, 'HpaAiInsight', insightKey, EVENT_TYPES.HPA_AI_INSIGHT_REQUESTED, {
      capability, status: result.status,
    });

    return result;
  }

  async panel(organizationId: string, userId: string, employeeKey?: string) {
    const insights = [];
    for (const capability of AI_CAPABILITIES) {
      insights.push(await this.insight(organizationId, userId, capability, employeeKey));
    }
    const providers = await this.listProviders(organizationId);
    return {
      architecture: this.capabilities(),
      providers,
      insights,
    };
  }
}
