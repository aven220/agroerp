import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EintStatus } from '@agroerp/prisma-eint-client';
import { AiServicesFacade } from '@/core/eaidsp/application/ai-services.facade';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { EINT_ASSISTANTS } from '../domain/eint.engine';
import { EintAiService } from './eint-ai.service';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintAssistantService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly ai: EintAiService,
    private readonly facade: AiServicesFacade,
    private readonly audit: EintAuditService,
  ) {}

  catalog() {
    return EINT_ASSISTANTS;
  }

  list(organizationId: string, moduleRef?: string) {
    return this.prisma.eintAssistant.findMany({
      where: { organizationId, ...(moduleRef ? { moduleRef } : {}) },
      orderBy: { assistantKey: 'asc' },
    });
  }

  async bootstrap(organizationId: string, userId: string) {
    for (const a of EINT_ASSISTANTS) {
      const exists = await this.prisma.eintAssistant.findFirst({ where: { organizationId, assistantKey: a.assistantKey } });
      if (!exists) {
        await this.prisma.eintAssistant.create({
          data: {
            organizationId,
            assistantKey: a.assistantKey,
            name: a.name,
            moduleRef: a.moduleRef,
            domain: a.domain,
            systemPrompt: `Eres el asistente especializado de ${a.name} para AGROERP.`,
            serviceTypes: ['chat', 'summarization', 'recommendation'],
            createdBy: userId,
            status: 'active',
          },
        });
      }
    }
    return this.list(organizationId);
  }

  async chat(organizationId: string, userId: string, assistantKey: string, message: string, perms?: string[]) {
    const assistant = await this.prisma.eintAssistant.findFirst({
      where: { organizationId, assistantKey, status: 'active' },
    });
    if (!assistant) throw new NotFoundException('Asistente no encontrado');
    const prompt = `${assistant.systemPrompt ?? ''}\n\nUsuario: ${message}`;
    const result = await this.ai.invoke(organizationId, userId, 'chat', prompt, assistant.moduleRef, perms);
    await this.audit.log(organizationId, 'EintAssistant', assistantKey, 'ai_invoked', userId, { message: message.slice(0, 100) });
    return { assistantKey, moduleRef: assistant.moduleRef, result };
  }
}
