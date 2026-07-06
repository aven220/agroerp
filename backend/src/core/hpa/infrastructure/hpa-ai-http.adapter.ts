import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AI_CAPABILITIES, buildAiStubInsight, type AiCapabilityCode } from '../domain/hpa-analytics.engine';
import type { HpaAiInsightRequest, HpaAiInsightResult, HpaAiPort } from '../domain/hpa-ai.port';

/**
 * Adapter preparado para invocar un proveedor externo de IA.
 * Si no hay configuración activa o falla la llamada, retorna el contrato stub.
 */
@Injectable()
export class HpaAiHttpAdapter implements HpaAiPort {
  private readonly logger = new Logger(HpaAiHttpAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  listCapabilities(): AiCapabilityCode[] {
    return [...AI_CAPABILITIES];
  }

  async predict(request: HpaAiInsightRequest): Promise<HpaAiInsightResult> {
    const config = await this.prisma.hpaAiProviderConfig.findFirst({
      where: {
        organizationId: request.organizationId,
        isActive: true,
        capabilities: { has: request.capability },
      },
    });

    if (!config?.baseUrl) {
      return buildAiStubInsight(request.capability, request.employeeKey);
    }

    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKeyRef ? { 'x-api-key-ref': config.apiKeyRef } : {}),
        },
        body: JSON.stringify({
          capability: request.capability,
          employeeKey: request.employeeKey,
          scopeKey: request.scopeKey,
          context: request.context ?? {},
          settings: config.settings,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`AI provider ${config.providerName} responded ${response.status}`);
        return {
          ...buildAiStubInsight(request.capability, request.employeeKey),
          providerName: config.providerName,
          status: 'provider_error',
          payload: {
            message: 'Proveedor externo no disponible; arquitectura lista para reintento',
            httpStatus: response.status,
            requiresExternalModel: true,
          },
        };
      }

      const body = await response.json() as Record<string, unknown>;
      return {
        capability: request.capability,
        employeeKey: request.employeeKey ?? null,
        providerName: config.providerName,
        status: 'provider_success',
        score: typeof body.score === 'number' ? body.score : null,
        payload: body,
      };
    } catch (err) {
      this.logger.warn(`AI provider call failed: ${(err as Error).message}`);
      return {
        ...buildAiStubInsight(request.capability, request.employeeKey),
        providerName: config.providerName,
        status: 'provider_error',
        payload: {
          message: 'Error de conectividad con proveedor externo',
          requiresExternalModel: true,
        },
      };
    }
  }
}
