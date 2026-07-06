import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiServiceType } from '@agroerp/shared';
import { EintStatus } from '@agroerp/prisma-eint-client';
import { AiGatewayService } from '@/core/eaidsp/application/ai-gateway.service';
import { AiServicesFacade } from '@/core/eaidsp/application/ai-services.facade';
import { AiRagService } from '@/core/eaidsp/application/ai-rag.service';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { checkQuota, EINT_AI_SERVICES, EINT_AI_VENDORS, generateEintKey, selectFallbackProvider } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintAiService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly gateway: AiGatewayService,
    private readonly facade: AiServicesFacade,
    private readonly rag: AiRagService,
    private readonly audit: EintAuditService,
  ) {}

  catalog() {
    return { vendors: EINT_AI_VENDORS, services: EINT_AI_SERVICES };
  }

  listProviders(organizationId: string) {
    return this.prisma.eintAiProvider.findMany({
      where: { organizationId },
      orderBy: [{ fallbackOrder: 'asc' }, { providerKey: 'asc' }],
    });
  }

  async registerProvider(
    organizationId: string,
    userId: string,
    providerKey: string,
    name: string,
    vendor: string,
    opts: { environment?: string; modelDefault?: string; quotaDaily?: number; fallbackOrder?: number },
  ) {
    const existing = await this.prisma.eintAiProvider.findFirst({ where: { organizationId, providerKey } });
    if (existing) throw new BadRequestException(`Provider ${providerKey} ya existe`);
    const provider = await this.prisma.eintAiProvider.create({
      data: {
        organizationId,
        providerKey,
        name,
        vendor,
        environment: opts.environment ?? 'production',
        modelDefault: opts.modelDefault,
        quotaDaily: opts.quotaDaily ?? 100000,
        fallbackOrder: opts.fallbackOrder ?? 100,
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EintAiProvider', providerKey, 'ai_provider_changed', userId, { action: 'created' });
    return provider;
  }

  async activateProvider(organizationId: string, userId: string, providerKey: string) {
    const p = await this.prisma.eintAiProvider.findFirst({ where: { organizationId, providerKey } });
    if (!p) throw new NotFoundException('Provider no encontrado');
    return this.prisma.eintAiProvider.update({ where: { id: p.id }, data: { status: 'active', version: p.version + 1 } });
  }

  async invoke(
    organizationId: string,
    userId: string,
    serviceType: AiServiceType,
    prompt: string,
    moduleRef?: string,
    perms?: string[],
  ) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await this.prisma.eintAiConsumption.aggregate({
      where: { organizationId, createdAt: { gte: since } },
      _sum: { tokensIn: true, tokensOut: true },
    });
    const tokensUsed = (used._sum.tokensIn ?? 0) + (used._sum.tokensOut ?? 0);
    const providers = await this.prisma.eintAiProvider.findMany({ where: { organizationId, status: 'active' } });
    const primary = providers.sort((a, b) => a.fallbackOrder - b.fallbackOrder)[0];
    const quota = primary?.quotaDaily ?? 100000;
    const quotaCheck = checkQuota(tokensUsed, quota);
    if (!quotaCheck.allowed) throw new BadRequestException('Cuota diaria de IA excedida');

    const start = Date.now();
    let result: unknown;
    let success = true;
    try {
      result = await this.gateway.complete(organizationId, userId, { serviceType, prompt }, perms);
    } catch (e) {
      success = false;
      const fallbackKey = selectFallbackProvider(providers.filter((p) => p.providerKey !== primary?.providerKey));
      if (fallbackKey) {
        result = await this.gateway.complete(organizationId, userId, { serviceType, prompt }, perms);
      } else {
        throw e;
      }
    }

    const seq = await this.prisma.eintAiConsumption.count({ where: { organizationId } });
    const tokensIn = Math.ceil(prompt.length / 4);
    const tokensOut = Math.ceil(JSON.stringify(result).length / 4);
    const costUsd = primary ? (tokensIn + tokensOut) / 1000 * primary.costPer1kTokens : 0;
    if (primary) {
      await this.prisma.eintAiConsumption.create({
        data: {
          organizationId,
          providerId: primary.id,
          consumptionKey: generateEintKey('AIC', seq + 1),
          serviceType,
          tokensIn,
          tokensOut,
          costUsd,
          userId,
          moduleRef,
          success,
          metadata: { durationMs: Date.now() - start } as object,
        },
      });
    }
    await this.audit.log(organizationId, 'EintAi', serviceType, 'ai_invoked', userId, { moduleRef, success });
    return result;
  }

  async chat(organizationId: string, userId: string, prompt: string, perms?: string[]) {
    return this.invoke(organizationId, userId, 'chat', prompt, undefined, perms);
  }

  semanticSearch(organizationId: string, userId: string, query: string, topK = 5) {
    return this.rag.search(organizationId, query, topK);
  }

  consumption(organizationId: string, limit = 100) {
    return this.prisma.eintAiConsumption.findMany({
      where: { organizationId },
      include: { provider: { select: { providerKey: true, name: true, vendor: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async usageDashboard(organizationId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [calls, cost] = await Promise.all([
      this.prisma.eintAiConsumption.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eintAiConsumption.aggregate({ where: { organizationId, createdAt: { gte: since } }, _sum: { costUsd: true } }),
    ]);
    return { calls24h: calls, cost24h: cost._sum.costUsd ?? 0, providers: await this.listProviders(organizationId) };
  }
}
