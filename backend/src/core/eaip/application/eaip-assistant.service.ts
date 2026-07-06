import { Injectable, NotFoundException } from '@nestjs/common';
import { AiServicesFacade } from '@/core/eaidsp/application/ai-services.facade';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { generateEaipKey } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipAssistantService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly ai: AiServicesFacade,
    private readonly audit: EaipAuditService,
  ) {}

  listSessions(organizationId: string, userId: string) {
    return this.prisma.eaipAssistantSession.findMany({
      where: { organizationId, userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSession(organizationId: string, userId: string, title?: string) {
    const count = await this.prisma.eaipAssistantSession.count({ where: { organizationId } });
    const sessionKey = generateEaipKey('SES', count + 1);
    return this.prisma.eaipAssistantSession.create({
      data: { organizationId, sessionKey, userId, title: title ?? 'Asistente Agronómico' },
    });
  }

  async sendMessage(organizationId: string, userId: string, sessionKey: string, content: string) {
    const session = await this.prisma.eaipAssistantSession.findFirst({ where: { organizationId, sessionKey, userId } });
    if (!session) throw new NotFoundException('Session not found');
    const userMsgKey = generateEaipKey('MSG', Date.now());
    await this.prisma.eaipAssistantMessage.create({
      data: { organizationId, messageKey: userMsgKey, sessionId: session.id, role: 'user', content },
    });
    let assistantContent: string;
    try {
      const response = await this.ai.chat(organizationId, userId, `Asistente agronómico AGROERP: ${content}`, { useRag: true });
      assistantContent = typeof response === 'object' && response && 'content' in response
        ? String((response as { content: string }).content)
        : `Recomendación agronómica basada en: ${content}`;
    } catch {
      assistantContent = `Análisis agronómico (modo offline): revise condiciones del lote, clima y calendario de labores para: ${content}`;
    }
    const asstMsgKey = generateEaipKey('MSG', Date.now() + 1);
    const message = await this.prisma.eaipAssistantMessage.create({
      data: { organizationId, messageKey: asstMsgKey, sessionId: session.id, role: 'assistant', content: assistantContent },
    });
    await this.audit.log(organizationId, 'EaipAssistantSession', sessionKey, 'assistant_query', userId, { query: content });
    return { sessionKey, userMessage: content, assistantMessage: message };
  }

  getMessages(organizationId: string, sessionKey: string) {
    return this.prisma.eaipAssistantMessage.findMany({
      where: { organizationId, session: { sessionKey } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
