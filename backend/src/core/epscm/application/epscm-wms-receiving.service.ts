import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmWmsReceiptStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeReceiptVariance, generateEpscmWmsKey } from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';

@Injectable()
export class EpscmWmsReceivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmWmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EpscmWmsReceiptStatus) {
    return this.prisma.epscmWmsReceipt.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, receiptKey: string) {
    const r = await this.prisma.epscmWmsReceipt.findFirst({
      where: { organizationId, receiptKey },
      include: { lines: true },
    });
    if (!r) throw new NotFoundException('Receipt not found');
    return r;
  }

  async schedule(
    organizationId: string,
    userId: string,
    warehouseKey: string,
    scheduledAt: Date,
    purchaseKey?: string,
  ) {
    const seq = await this.prisma.epscmWmsReceipt.count({ where: { organizationId } });
    const receiptKey = generateEpscmWmsKey('RCP', seq + 1);
    const receipt = await this.prisma.epscmWmsReceipt.create({
      data: {
        organizationId,
        receiptKey,
        warehouseKey,
        purchaseKey,
        status: 'scheduled',
        scheduledAt,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsReceipt', receiptKey, 'created', userId);
    return receipt;
  }

  async fromPurchaseOrder(
    organizationId: string,
    userId: string,
    purchaseKey: string,
    warehouseKey: string,
    lines?: Array<{ itemKey: string; expectedQty: number }>,
  ) {
    let poLines = lines ?? [];
    if (!poLines.length) {
      const proposals = await this.prisma.epscmReplenishmentProposal.findMany({
        where: { organizationId, proposalType: 'purchase', status: 'proposed' },
        take: 50,
      });
      poLines = proposals.map((p) => ({ itemKey: p.itemKey, expectedQty: p.proposedQty }));
    }
    const seq = await this.prisma.epscmWmsReceipt.count({ where: { organizationId } });
    const receiptKey = generateEpscmWmsKey('RCP', seq + 1);
    const receipt = await this.prisma.epscmWmsReceipt.create({
      data: {
        organizationId,
        receiptKey,
        purchaseKey,
        warehouseKey,
        status: 'receiving',
        lines: {
          create: await Promise.all(
            poLines.map(async (line, i) => {
              const lseq = await this.prisma.epscmWmsReceiptLine.count({ where: { organizationId } });
              return {
                organizationId,
                lineKey: generateEpscmWmsKey('RCL', lseq + i + 1),
                itemKey: line.itemKey,
                expectedQty: Number(line.expectedQty),
              };
            }),
          ),
        },
      },
      include: { lines: true },
    });
    await this.audit.log(organizationId, 'EpscmWmsReceipt', receiptKey, 'created', userId, { purchaseKey });
    return receipt;
  }

  async receiveLine(
    organizationId: string,
    userId: string,
    receiptKey: string,
    lineKey: string,
    receivedQty: number,
    locationKey?: string,
    issueNotes?: string,
  ) {
    const receipt = await this.get(organizationId, receiptKey);
    const line = receipt.lines.find((l) => l.lineKey === lineKey);
    if (!line) throw new NotFoundException('Receipt line not found');
    const varianceQty = computeReceiptVariance(line.expectedQty, receivedQty);
    const status: EpscmWmsReceiptStatus = varianceQty !== 0 ? 'variance' : line.receivedQty + receivedQty >= line.expectedQty ? 'completed' : 'partial';

    await this.prisma.epscmWmsReceiptLine.update({
      where: { id: line.id },
      data: {
        receivedQty: line.receivedQty + receivedQty,
        varianceQty,
        locationKey,
        issueNotes,
      },
    });

    if (locationKey) {
      const locSeq = await this.prisma.epscmWmsLocationStock.count({ where: { organizationId } });
      const existing = await this.prisma.epscmWmsLocationStock.findFirst({
        where: { organizationId, locationKey, itemKey: line.itemKey },
      });
      if (existing) {
        await this.prisma.epscmWmsLocationStock.update({
          where: { id: existing.id },
          data: { quantity: { increment: receivedQty } },
        });
      } else {
        await this.prisma.epscmWmsLocationStock.create({
          data: {
            organizationId,
            stockKey: generateEpscmWmsKey('STK', locSeq + 1),
            locationKey,
            itemKey: line.itemKey,
            quantity: receivedQty,
          },
        });
      }
      await this.prisma.epscmWmsLocation.updateMany({
        where: { organizationId, locationKey },
        data: { occupiedQty: { increment: receivedQty }, status: 'occupied' },
      });
    }

    const updatedReceipt = await this.prisma.epscmWmsReceipt.update({
      where: { id: receipt.id },
      data: {
        status,
        receivedAt: status === 'completed' ? new Date() : receipt.receivedAt,
      },
      include: { lines: true },
    });

    if (status === 'completed') {
      await this.integration.onReceiptConfirmed(organizationId, receiptKey, receipt.purchaseKey ?? undefined);
      await this.audit.log(organizationId, 'EpscmWmsReceipt', receiptKey, 'wms_received', userId);
    }
    return updatedReceipt;
  }

  async confirmByBarcode(organizationId: string, userId: string, barcode: string, receivedQty: number, locationKey?: string) {
    const line = await this.prisma.epscmWmsReceiptLine.findFirst({
      where: {
        organizationId,
        OR: [{ lineKey: barcode }, { itemKey: barcode }],
        receipt: { status: { in: ['scheduled', 'receiving', 'partial', 'variance'] } },
      },
      include: { receipt: true },
    });
    if (!line) throw new NotFoundException('Receipt line not found');
    return this.receiveLine(organizationId, userId, line.receiptKey, line.lineKey, receivedQty, locationKey);
  }
}
