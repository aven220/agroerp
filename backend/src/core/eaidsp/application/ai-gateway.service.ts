import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiCompletionResponse, AiExplainability } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AiModelRouterService } from './ai-model-router.service';
import { AiContextManagerService } from './ai-context-manager.service';
import { AiMemoryService } from './ai-memory.service';
import { AiRagService } from './ai-rag.service';
import { AiPromptManagerService } from './ai-prompt-manager.service';
import { AiCopilotService } from './ai-copilot.service';
import { AiSanitizerService } from './ai-sanitizer.service';
import { AiMetricsService } from './ai-metrics.service';

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly router: AiModelRouterService,
    private readonly context: AiContextManagerService,
    private readonly memory: AiMemoryService,
    private readonly rag: AiRagService,
    private readonly prompts: AiPromptManagerService,
    private readonly copilots: AiCopilotService,
    private readonly sanitizer: AiSanitizerService,
    private readonly metrics: AiMetricsService,
  ) {}

  async complete(
    organizationId: string,
    userId: string,
    request: AiCompletionRequest,
    userPermissions: string[] = [],
  ): Promise<AiCompletionResponse> {
    const start = Date.now();
    await this.metrics.checkQuota(organizationId, userId);

    const sanitizedPrompt = this.sanitizer.sanitizeInput(request.prompt);
    if (this.sanitizer.detectInjection(request.prompt)) {
      throw new ForbiddenException('Entrada bloqueada por política de seguridad');
    }

    let copilotPrompt: string | undefined;
    let modelKey: string | undefined;
    if (request.copilotKey) {
      const copilot = await this.copilots.findOne(organizationId, request.copilotKey);
      const required = (copilot.permissions as string[]) ?? [];
      if (required.length && !required.some((p) => userPermissions.includes(p))) {
        throw new ForbiddenException('Sin permisos para este copiloto');
      }
      copilotPrompt = copilot.systemPrompt;
      modelKey = copilot.modelKey ?? undefined;
    }

    const ctx = await this.context.buildContext(organizationId, userId, {
      moduleContext: request.moduleContext,
      copilotKey: request.copilotKey,
      permissions: userPermissions,
    });

    const memories = await this.memory.recall(organizationId, userId, 10);
    const ragResults = request.useRag !== false ? await this.rag.search(organizationId, sanitizedPrompt) : [];

    let systemPrompt = request.systemPrompt ?? this.context.toSystemPrompt(ctx, copilotPrompt);
    systemPrompt += this.memory.formatForPrompt(memories);
    if (ragResults.length) systemPrompt += this.rag.formatForPrompt(ragResults);

    let finalPrompt = sanitizedPrompt;
    if (request.variables) {
      finalPrompt = this.prompts.renderTemplate(sanitizedPrompt, request.variables);
    }

    const result = await this.router.route(organizationId, {
      prompt: finalPrompt,
      systemPrompt,
      modelKey: modelKey ?? 'agroerp-enterprise',
      serviceType: request.serviceType,
    }, modelKey);

    const filteredContent = this.sanitizer.filterSensitiveOutput(result.content);
    const latencyMs = Date.now() - start;
    const estimatedCost =
      result.costPer1kIn && result.costPer1kOut
        ? (result.tokensIn / 1000) * result.costPer1kIn + (result.tokensOut / 1000) * result.costPer1kOut
        : 0;

    const explainability: AiExplainability = {
      confidence: ragResults.length ? 0.88 : 0.75,
      sources: ragResults.map((r) => ({
        type: r.sourceType,
        ref: r.sourceRef ?? r.documentKey,
        title: r.title,
        dataDate: r.dataDate,
      })),
      modelUsed: result.modelUsed,
      providerType: result.providerType,
      latencyMs,
      justification: ragResults.length
        ? 'Respuesta fundamentada en documentos organizacionales indexados (RAG).'
        : 'Respuesta basada en contexto ERP y motor empresarial.',
      ragUsed: ragResults.length > 0,
    };

    let conversationId = request.conversationId;
    let messageId: string | undefined;

    if (request.serviceType === 'chat') {
      const conv = conversationId
        ? await this.prisma.aiConversation.findFirst({ where: { id: conversationId, organizationId, userId } })
        : null;

      const conversation = conv
        ? conv
        : await this.prisma.aiConversation.create({
            data: {
              organizationId,
              userId,
              copilotKey: request.copilotKey,
              title: sanitizedPrompt.slice(0, 80),
              moduleContext: request.moduleContext,
            },
          });
      conversationId = conversation.id;

      await this.prisma.aiConversationMessage.create({
        data: { conversationId, role: 'user', content: sanitizedPrompt, serviceType: request.serviceType },
      });
      const assistantMsg = await this.prisma.aiConversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: filteredContent,
          serviceType: request.serviceType,
          explainability: explainability as object,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        },
      });
      messageId = assistantMsg.id;
    }

    await this.metrics.logRequest({
      organizationId,
      userId,
      serviceType: request.serviceType,
      providerType: result.providerType,
      modelKey: result.modelUsed,
      moduleContext: request.moduleContext,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCost,
      latencyMs,
      confidence: explainability.confidence,
      explainability,
    });

    await this.metrics.incrementQuota(organizationId, userId);

    return {
      content: filteredContent,
      explainability,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCost,
      conversationId,
      messageId,
    };
  }
}
