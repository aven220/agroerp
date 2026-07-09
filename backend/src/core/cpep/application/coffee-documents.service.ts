import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeAuditService } from './coffee-audit.service';

@Injectable()
export class CoffeeDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly reception: CoffeeReceptionService,
    private readonly audit: CoffeeAuditService,
  ) {}

  list(organizationId: string, ticketKey?: string) {
    return Promise.all([
      this.prisma.cpepDocument.findMany({
        where: {
          organizationId,
          voided: false,
          ...(ticketKey ? { ticket: { ticketKey } } : {}),
        },
        include: { ticket: { select: { ticketKey: true, producerId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      ticketKey
        ? Promise.resolve([])
        : this.prisma.producerDocument.findMany({
            where: { organizationId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
              id: true,
              title: true,
              documentTypeCode: true,
              contentId: true,
              producerId: true,
              createdAt: true,
            },
          }),
    ]).then(([cpepDocs, prmDocs]) => {
      const unified = [
        ...cpepDocs.map((doc) => ({
          id: doc.id,
          documentKey: doc.documentKey,
          title: doc.title,
          documentType: doc.documentType,
          ticketKey: doc.ticket?.ticketKey,
          producerId: doc.ticket?.producerId ?? undefined,
          source: 'cpep' as const,
          qrPayload: doc.qrPayload,
          pdfUrl: doc.pdfUrl,
          reprintCount: doc.reprintCount,
          createdAt: doc.createdAt.toISOString(),
        })),
        ...prmDocs.map((doc) => ({
          id: doc.id,
          documentKey: doc.id,
          title: doc.title,
          documentType: doc.documentTypeCode,
          ticketKey: undefined,
          producerId: doc.producerId,
          source: 'prm' as const,
          createdAt: doc.createdAt.toISOString(),
        })),
      ];
      return unified.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }

  async getOne(organizationId: string, documentKey: string) {
    const doc = await this.prisma.cpepDocument.findFirst({
      where: { organizationId, documentKey },
      include: { ticket: true, settlement: true },
    });
    if (!doc) throw new NotFoundException(`Documento ${documentKey} no encontrado`);
    return doc;
  }

  async generateSettlementDocs(
    organizationId: string,
    ticketKey: string,
    settlement: {
      id: string;
      settlementKey: string;
      totalAmount: number;
      netWeightKg: number;
      basePricePerKg: number;
      appliedPricePerKg?: number | null;
      grossWeightKg?: number | null;
      tareWeightKg?: number | null;
      bonusesTotal?: number;
      penaltiesTotal?: number;
      discountsTotal?: number;
      taxesTotal?: number;
      withholdingsTotal?: number;
      transportTotal?: number;
      advancesTotal?: number;
      creditsTotal?: number;
      lines: unknown;
      bonusLines?: unknown;
      penaltyLines?: unknown;
      discountLines?: unknown;
      producerSigned?: boolean;
      producerSignerName?: string | null;
    },
  ) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    const content = {
      ticketKey: ticket.ticketKey,
      producerName: ticket.producerName,
      producerId: ticket.producerId,
      farmName: ticket.farmName,
      lotCode: ticket.lotCode,
      grossWeightKg: settlement.grossWeightKg ?? ticket.grossWeightKg,
      tareWeightKg: settlement.tareWeightKg ?? ticket.tareWeightKg,
      netWeightKg: settlement.netWeightKg,
      basePricePerKg: settlement.basePricePerKg,
      appliedPricePerKg: settlement.appliedPricePerKg ?? settlement.basePricePerKg,
      bonusesTotal: settlement.bonusesTotal ?? 0,
      penaltiesTotal: settlement.penaltiesTotal ?? 0,
      discountsTotal: settlement.discountsTotal ?? 0,
      taxesTotal: settlement.taxesTotal ?? 0,
      withholdingsTotal: settlement.withholdingsTotal ?? 0,
      transportTotal: settlement.transportTotal ?? 0,
      advancesTotal: settlement.advancesTotal ?? 0,
      creditsTotal: settlement.creditsTotal ?? 0,
      totalAmount: settlement.totalAmount,
      lines: settlement.lines,
      bonusLines: settlement.bonusLines,
      penaltyLines: settlement.penaltyLines,
      discountLines: settlement.discountLines,
      settlementKey: settlement.settlementKey,
      producerSigned: settlement.producerSigned,
      producerSignerName: settlement.producerSignerName,
      generatedAt: new Date().toISOString(),
    };

    const docs: Array<{
      type: 'receipt' | 'settlement' | 'voucher' | 'invoice' | 'remittance' | 'label' | 'qr' | 'barcode' | 'pdf' | 'signature';
      title: string;
    }> = [
      { type: 'settlement', title: `Liquidación ${settlement.settlementKey}` },
      { type: 'receipt', title: `Recibo de compra ${ticket.ticketKey}` },
      { type: 'voucher', title: `Comprobante de pago ${ticket.ticketKey}` },
      { type: 'remittance', title: `Remisión ${ticket.ticketKey}` },
      { type: 'label', title: `Etiqueta ${ticket.ticketKey}` },
      { type: 'qr', title: `QR ${ticket.qrCode}` },
      { type: 'barcode', title: `Barcode ${ticket.barcode}` },
      { type: 'pdf', title: `PDF ${settlement.settlementKey}` },
      { type: 'signature', title: `Firma digital ${ticket.ticketKey}` },
    ];
    if (settlement.totalAmount >= 1_000_000) {
      docs.push({ type: 'invoice', title: `Factura ${settlement.settlementKey}` });
    }

    const created = [];
    for (const d of docs) {
      const doc = await this.prisma.cpepDocument.upsert({
        where: { organizationId_documentKey: { organizationId, documentKey: `${d.type}-${ticket.ticketKey}` } },
        update: {
          settlementId: settlement.id,
          content: content as object,
          qrPayload: ticket.qrCode,
          barcodePayload: ticket.barcode,
          pdfUrl: `cpep/pdf/${settlement.settlementKey}-${d.type}.pdf`,
          signed: settlement.producerSigned || ticket.signatures.length > 0,
          voided: false,
          voidReason: null,
        },
        create: {
          organizationId,
          ticketId: ticket.id,
          settlementId: settlement.id,
          documentKey: `${d.type}-${ticket.ticketKey}`,
          documentType: d.type,
          title: d.title,
          content: content as object,
          qrPayload: ticket.qrCode,
          barcodePayload: ticket.barcode,
          pdfUrl: `cpep/pdf/${settlement.settlementKey}-${d.type}.pdf`,
          signed: settlement.producerSigned || ticket.signatures.length > 0,
        },
      });
      created.push(doc);
      await this.core.emitUserAction(organizationId, 'CoffeeDocument', doc.id, EVENT_TYPES.COFFEE_DOCUMENT_GENERATED, {
        documentType: d.type,
        ticketKey,
        settlementKey: settlement.settlementKey,
      });
    }
    return created;
  }

  async generatePaymentVoucher(
    organizationId: string,
    ticketKey: string,
    settlement: { id: string; settlementKey: string; totalAmount: number; paidAmount: number; paymentStatus: string },
    payments: Array<{ paymentKey: string; method: string; amount: number }>,
  ) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    const documentKey = `voucher-pay-${settlement.settlementKey}-${Date.now()}`;
    const doc = await this.prisma.cpepDocument.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        settlementId: settlement.id,
        documentKey,
        documentType: 'voucher',
        title: `Comprobante de pago ${settlement.settlementKey}`,
        content: {
          ticketKey,
          settlementKey: settlement.settlementKey,
          totalAmount: settlement.totalAmount,
          paidAmount: settlement.paidAmount,
          paymentStatus: settlement.paymentStatus,
          payments,
          producerName: ticket.producerName,
        } as object,
        qrPayload: ticket.qrCode,
        barcodePayload: ticket.barcode,
        pdfUrl: `cpep/pdf/${documentKey}.pdf`,
        signed: true,
      },
    });
    await this.core.emitUserAction(organizationId, 'CoffeeDocument', doc.id, EVENT_TYPES.COFFEE_DOCUMENT_GENERATED, {
      documentType: 'voucher',
      ticketKey,
    });
    return doc;
  }

  async reprint(organizationId: string, userId: string, documentKey: string) {
    const doc = await this.getOne(organizationId, documentKey);
    if (doc.voided) throw new BadRequestException('Documento anulado');
    const updated = await this.prisma.cpepDocument.update({
      where: { id: doc.id },
      data: { reprintCount: { increment: 1 }, lastPrintedAt: new Date() },
    });
    await this.audit.log(organizationId, 'Document', documentKey, 'reprinted', userId, {
      reprintCount: updated.reprintCount,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeDocument',
      doc.id,
      EVENT_TYPES.COFFEE_DOCUMENT_REPRINTED,
      { documentKey, reprintCount: updated.reprintCount },
    );
    return updated;
  }
}
