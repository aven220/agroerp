import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiRagService {
  constructor(private readonly prisma: PrismaService) {}

  async indexDocument(
    organizationId: string,
    userId: string,
    data: {
      documentKey: string;
      title: string;
      sourceType: string;
      sourceRef?: string;
      content: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const contentHash = createHash('sha256').update(data.content).digest('hex');
    const chunks = this.chunkContent(data.content);

    const existing = await this.prisma.aiRagDocument.findFirst({
      where: { organizationId, documentKey: data.documentKey },
    });

    const doc = existing
      ? await this.prisma.aiRagDocument.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            sourceType: data.sourceType as 'document',
            sourceRef: data.sourceRef,
            content: data.content,
            contentHash,
            metadata: (data.metadata ?? {}) as object,
            indexedAt: new Date(),
          },
        })
      : await this.prisma.aiRagDocument.create({
          data: {
            organizationId,
            documentKey: data.documentKey,
            title: data.title,
            sourceType: data.sourceType as 'document',
            sourceRef: data.sourceRef,
            content: data.content,
            contentHash,
            metadata: (data.metadata ?? {}) as object,
            indexedAt: new Date(),
            createdBy: userId,
          },
        });

    await this.prisma.aiRagChunk.deleteMany({ where: { documentId: doc.id } });
    await this.prisma.aiRagChunk.createMany({
      data: chunks.map((content, i) => ({
        documentId: doc.id,
        chunkIndex: i,
        content,
        tokenCount: Math.ceil(content.length / 4),
      })),
    });

    return doc;
  }

  async search(organizationId: string, query: string, limit = 5) {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const chunks = await this.prisma.aiRagChunk.findMany({
      where: {
        document: { organizationId },
      },
      include: { document: true },
      take: 200,
    });

    const scored = chunks
      .map((c) => {
        const text = c.content.toLowerCase();
        const score = terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
        return { chunk: c, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => ({
      documentKey: s.chunk.document.documentKey,
      title: s.chunk.document.title,
      sourceType: s.chunk.document.sourceType,
      sourceRef: s.chunk.document.sourceRef,
      content: s.chunk.content,
      dataDate: s.chunk.document.updatedAt.toISOString(),
      score: s.score,
    }));
  }

  async syncErpRecords(organizationId: string, userId: string) {
    const [producers, forms, reports] = await Promise.all([
      this.prisma.producer.findMany({
        where: { organizationId, deletedAt: null },
        take: 50,
        select: { id: true, legalName: true, producerNumber: true, lifecycleStatus: true, municipalityCode: true },
      }),
      this.prisma.formDefinition.findMany({
        where: { organizationId, deletedAt: null, status: 'published' },
        take: 30,
        select: { id: true, formKey: true, name: true, description: true },
      }),
      this.prisma.biReportDefinition.findMany({
        where: { organizationId, deletedAt: null },
        take: 20,
        select: { reportKey: true, name: true, description: true },
      }),
    ]);

    const indexed = [];
    for (const p of producers) {
      indexed.push(
        await this.indexDocument(organizationId, userId, {
          documentKey: `producer-${p.id}`,
          title: `Productor ${p.legalName}`,
          sourceType: 'erp_record',
          sourceRef: p.id,
          content: `Productor ${p.legalName} (${p.producerNumber}). Estado: ${p.lifecycleStatus}. Municipio: ${p.municipalityCode ?? 'N/A'}.`,
        }),
      );
    }
    for (const f of forms) {
      indexed.push(
        await this.indexDocument(organizationId, userId, {
          documentKey: `form-${f.formKey}`,
          title: f.name,
          sourceType: 'form',
          sourceRef: f.id,
          content: `Formulario ${f.name} (${f.formKey}). ${f.description ?? ''}`,
        }),
      );
    }
    for (const r of reports) {
      indexed.push(
        await this.indexDocument(organizationId, userId, {
          documentKey: `report-${r.reportKey}`,
          title: r.name,
          sourceType: 'report',
          sourceRef: r.reportKey,
          content: `Reporte ${r.name}. ${r.description ?? ''}`,
        }),
      );
    }
    return { indexed: indexed.length };
  }

  async listDocuments(organizationId: string) {
    return this.prisma.aiRagDocument.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
  }

  async removeDocument(organizationId: string, id: string) {
    const doc = await this.prisma.aiRagDocument.findFirst({ where: { id, organizationId } });
    if (!doc) throw new NotFoundException('Documento RAG no encontrado');
    return this.prisma.aiRagDocument.delete({ where: { id } });
  }

  formatForPrompt(results: Awaited<ReturnType<AiRagService['search']>>) {
    if (!results.length) return '';
    return (
      '\n\nFuentes organizacionales (RAG):\n' +
      results.map((r, i) => `[${i + 1}] ${r.title} (${r.sourceType}): ${r.content.slice(0, 500)}`).join('\n')
    );
  }

  private chunkContent(content: string, chunkSize = 1200): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks.length ? chunks : [content];
  }
}
