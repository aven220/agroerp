import { Injectable, NotFoundException } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EAPP_AG_INDICES, generateEappKey } from '../domain/eapp.engine';

@Injectable()
export class EappIndexService {
  constructor(private readonly prisma: EappPrismaService) {}

  catalog() {
    return EAPP_AG_INDICES;
  }

  list(organizationId: string) {
    return this.prisma.eappAgIndex.findMany({
      where: { organizationId, status: 'active' },
      include: { readings: { take: 5, orderBy: { capturedAt: 'desc' } } },
    });
  }

  async ensureStandardIndices(organizationId: string) {
    for (const idx of EAPP_AG_INDICES) {
      await this.prisma.eappAgIndex.upsert({
        where: { organizationId_indexKey: { organizationId, indexKey: idx.code } },
        create: {
          organizationId,
          indexKey: idx.code,
          code: idx.code,
          name: idx.name,
          formula: idx.formula,
          isCustom: false,
        },
        update: {},
      });
    }
    return this.list(organizationId);
  }

  async createCustom(
    organizationId: string,
    data: { code: string; name: string; formula?: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eappAgIndex.count({ where: { organizationId, isCustom: true } });
    const indexKey = generateEappKey('IDX', count + 1);
    return this.prisma.eappAgIndex.create({
      data: {
        organizationId,
        indexKey,
        code: data.code,
        name: data.name,
        formula: data.formula,
        isCustom: true,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listReadings(organizationId: string, indexKey?: string, fieldLotId?: string) {
    return this.prisma.eappAgIndexReading.findMany({
      where: {
        organizationId,
        ...(fieldLotId ? { fieldLotId } : {}),
        ...(indexKey ? { index: { indexKey } } : {}),
      },
      include: { index: true },
      orderBy: { capturedAt: 'desc' },
      take: 500,
    });
  }

  async recordReading(
    organizationId: string,
    data: {
      indexKey: string;
      fieldLotId?: string;
      value?: number;
      rasterRef?: string;
      sourceType?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const index = await this.prisma.eappAgIndex.findFirst({
      where: { organizationId, indexKey: data.indexKey },
    });
    if (!index) throw new NotFoundException('Índice no encontrado');
    return this.prisma.eappAgIndexReading.create({
      data: {
        organizationId,
        indexId: index.id,
        fieldLotId: data.fieldLotId,
        value: data.value,
        rasterRef: data.rasterRef,
        sourceType: data.sourceType ?? 'computed',
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }
}
