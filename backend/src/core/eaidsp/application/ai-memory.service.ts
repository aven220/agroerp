import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async remember(
    organizationId: string,
    memoryKey: string,
    content: string,
    scope: 'user' | 'org' | 'copilot' = 'user',
    userId?: string,
    expiresAt?: Date,
  ) {
    const existing = await this.prisma.aiMemoryEntry.findFirst({
      where: { organizationId, memoryKey, userId: userId ?? null },
    });
    if (existing) {
      return this.prisma.aiMemoryEntry.update({
        where: { id: existing.id },
        data: { content, expiresAt, scope },
      });
    }
    return this.prisma.aiMemoryEntry.create({
      data: { organizationId, memoryKey, content, scope, userId, expiresAt },
    });
  }

  async recall(organizationId: string, userId?: string, limit = 20) {
    const now = new Date();
    return this.prisma.aiMemoryEntry.findMany({
      where: {
        organizationId,
        AND: [
          { OR: [{ userId }, { scope: 'org' }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async forget(organizationId: string, memoryKey: string, userId?: string) {
    const entry = await this.prisma.aiMemoryEntry.findFirst({
      where: { organizationId, memoryKey, userId: userId ?? null },
    });
    if (!entry) return null;
    return this.prisma.aiMemoryEntry.delete({ where: { id: entry.id } });
  }

  formatForPrompt(entries: Array<{ memoryKey: string; content: string }>) {
    if (!entries.length) return '';
    return '\n\nMemoria previa:\n' + entries.map((e) => `- ${e.memoryKey}: ${e.content}`).join('\n');
  }
}
