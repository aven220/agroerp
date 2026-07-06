import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmWmsDispatchStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmWmsKey, isFullDispatch, isPartialDispatch } from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';

@Injectable()
export class EpscmWmsDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmWmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EpscmWmsDispatchStatus) {
    return this.prisma.epscmWmsDispatch.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, dispatchKey: string) {
    const d = await this.prisma.epscmWmsDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { lines: true },
    });
    if (!d) throw new NotFoundException('Dispatch not found');
    return d;
  }

  async prepare(organizationId: string, userId: string, orderKey: string, warehouseKey: string) {
    const seq = await this.prisma.epscmWmsDispatch.count({ where: { organizationId } });
    const dispatchKey = generateEpscmWmsKey('DSP', seq + 1);
    const lines = await this.prisma.escmSalesOrderLine.findMany({
      where: { order: { organizationId, orderKey } },
    });
    const dispatch = await this.prisma.epscmWmsDispatch.create({
      data: {
        organizationId,
        dispatchKey,
        orderKey,
        warehouseKey,
        status: 'preparing',
        lines: {
          create: await Promise.all(
            lines.map(async (line, i) => {
              const lseq = await this.prisma.epscmWmsDispatchLine.count({ where: { organizationId } });
              return {
                organizationId,
                lineKey: generateEpscmWmsKey('DSL', lseq + i + 1),
                itemKey: line.itemKey,
                requestedQty: Number(line.quantity),
              };
            }),
          ),
        },
      },
      include: { lines: true },
    });
    await this.audit.log(organizationId, 'EpscmWmsDispatch', dispatchKey, 'created', userId);
    return dispatch;
  }

  async assignLoading(organizationId: string, userId: string, dispatchKey: string) {
    const d = await this.get(organizationId, dispatchKey);
    return this.prisma.epscmWmsDispatch.update({
      where: { id: d.id },
      data: { status: 'loading', loadedAt: new Date() },
    });
  }

  async shipLine(organizationId: string, userId: string, dispatchKey: string, lineKey: string, shippedQty: number) {
    const d = await this.get(organizationId, dispatchKey);
    const line = d.lines.find((l) => l.lineKey === lineKey);
    if (!line) throw new NotFoundException('Dispatch line not found');
    await this.prisma.epscmWmsDispatchLine.update({
      where: { id: line.id },
      data: { shippedQty },
    });
    const refreshed = await this.get(organizationId, dispatchKey);
    const partial = refreshed.lines.some((l) => isPartialDispatch(l.requestedQty, l.shippedQty));
    const full = refreshed.lines.every((l) => isFullDispatch(l.requestedQty, l.shippedQty));
    const status: EpscmWmsDispatchStatus = full ? 'completed' : partial ? 'partial' : refreshed.status;
    return this.prisma.epscmWmsDispatch.update({
      where: { id: d.id },
      data: { status, isPartial: partial && !full },
    });
  }

  async confirmExit(organizationId: string, userId: string, dispatchKey: string) {
    const d = await this.get(organizationId, dispatchKey);
    if (d.status === 'completed' && d.confirmedAt) throw new BadRequestException('Already confirmed');
    const updated = await this.prisma.epscmWmsDispatch.update({
      where: { id: d.id },
      data: { status: 'completed', confirmedAt: new Date() },
    });
    await this.integration.onDispatchConfirmed(organizationId, dispatchKey, d.orderKey);
    await this.audit.log(organizationId, 'EpscmWmsDispatch', dispatchKey, 'wms_dispatched', userId);
    return updated;
  }
}
