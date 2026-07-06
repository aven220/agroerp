import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregatePackTotals, computeBoxVolume, generateEpscmWmsKey } from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';

@Injectable()
export class EpscmWmsPackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmWmsIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.epscmWmsPackOrder.findMany({
      where: { organizationId },
      include: { boxes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, packKey: string) {
    const pack = await this.prisma.epscmWmsPackOrder.findFirst({
      where: { organizationId, packKey },
      include: { boxes: true },
    });
    if (!pack) throw new NotFoundException('Pack order not found');
    return pack;
  }

  async start(organizationId: string, userId: string, orderKey: string) {
    const existing = await this.prisma.epscmWmsPackOrder.findFirst({ where: { organizationId, orderKey } });
    if (existing) return this.get(organizationId, existing.packKey);
    const seq = await this.prisma.epscmWmsPackOrder.count({ where: { organizationId } });
    const packKey = generateEpscmWmsKey('PACK', seq + 1);
    const pack = await this.prisma.epscmWmsPackOrder.create({
      data: { organizationId, packKey, orderKey, status: 'packing' },
    });
    await this.audit.log(organizationId, 'EpscmWmsPackOrder', packKey, 'created', userId);
    return pack;
  }

  async addBox(
    organizationId: string,
    userId: string,
    packKey: string,
    input: { labelCode?: string; weight?: number; length?: number; width?: number; height?: number },
  ) {
    const pack = await this.get(organizationId, packKey);
    const volume = computeBoxVolume(input.length, input.width, input.height);
    const seq = await this.prisma.epscmWmsPackBox.count({ where: { organizationId } });
    const box = await this.prisma.epscmWmsPackBox.create({
      data: {
        organizationId,
        boxKey: generateEpscmWmsKey('BOX', seq + 1),
        packKey,
        labelCode: input.labelCode ?? `LBL-${seq + 1}`,
        weight: input.weight ?? 0,
        volume,
        length: input.length,
        width: input.width,
        height: input.height,
      },
    });
    const boxes = await this.prisma.epscmWmsPackBox.findMany({ where: { organizationId, packKey } });
    const totals = aggregatePackTotals(boxes);
    await this.prisma.epscmWmsPackOrder.update({
      where: { id: pack.id },
      data: { totalWeight: totals.totalWeight, totalVolume: totals.totalVolume },
    });
    await this.audit.log(organizationId, 'EpscmWmsPackBox', box.boxKey, 'created', userId);
    return this.get(organizationId, packKey);
  }

  async repack(organizationId: string, userId: string, packKey: string) {
    const pack = await this.get(organizationId, packKey);
    await this.prisma.epscmWmsPackBox.deleteMany({ where: { organizationId, packKey } });
    await this.prisma.epscmWmsPackOrder.update({
      where: { id: pack.id },
      data: { status: 'packing', totalWeight: 0, totalVolume: 0, packedAt: null },
    });
    await this.audit.log(organizationId, 'EpscmWmsPackOrder', packKey, 'updated', userId, { repack: true });
    return this.get(organizationId, packKey);
  }

  async complete(organizationId: string, userId: string, packKey: string) {
    const pack = await this.get(organizationId, packKey);
    if (!pack.boxes.length) throw new BadRequestException('No boxes to complete');
    const updated = await this.prisma.epscmWmsPackOrder.update({
      where: { id: pack.id },
      data: { status: 'completed', packedAt: new Date() },
    });
    await this.integration.onPackCompleted(organizationId, packKey, pack.orderKey);
    await this.audit.log(organizationId, 'EpscmWmsPackOrder', packKey, 'wms_packed', userId);
    return updated;
  }

  panel(organizationId: string) {
    return this.prisma.epscmWmsPackOrder.findMany({
      where: { organizationId, status: { in: ['pending', 'packing'] } },
      include: { boxes: true },
    });
  }
}
