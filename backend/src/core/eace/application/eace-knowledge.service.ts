import { Injectable } from '@nestjs/common';
import { EaceKnowledgeType } from '@agroerp/prisma-eace-client';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceKnowledgeService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  list(organizationId: string, itemType?: string, category?: string) {
    return this.prisma.eaceKnowledgeItem.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(itemType ? { itemType: itemType as EaceKnowledgeType } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publish(organizationId: string, userId: string, data: {
    itemType: EaceKnowledgeType; title: string; content?: string;
    mediaRef?: string; category?: string; metadata?: Record<string, unknown>;
  }) {
    const count = await this.prisma.eaceKnowledgeItem.count({ where: { organizationId } });
    const item = await this.prisma.eaceKnowledgeItem.create({
      data: {
        organizationId,
        itemKey: generateEaceKey('KNW', count + 1),
        itemType: data.itemType,
        title: data.title,
        content: data.content,
        mediaRef: data.mediaRef,
        category: data.category,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'KnowledgeItem', item.itemKey, 'knowledge_published', userId);
    return item;
  }
}
