import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabSupplierPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  async portal(organizationId: string, partnerKey: string) {
    const [orders, invoices, payments, certificates, notifications] = await Promise.all([
      this.listPurchaseOrders(organizationId, partnerKey),
      this.prisma.epscmCollabInvoice.findMany({ where: { organizationId, partnerKey }, take: 50 }),
      this.prisma.epscmCollabPaymentStatus.findMany({ where: { organizationId, partnerKey }, take: 50 }),
      this.prisma.epscmCollabCertificate.findMany({ where: { organizationId, partnerKey } }),
      this.prisma.epscmCollabNotification.findMany({ where: { organizationId, partnerKey, isRead: false }, take: 20 }),
    ]);
    return { orders, invoices, payments, certificates, notifications };
  }

  listPurchaseOrders(organizationId: string, partnerKey: string) {
    return this.prisma.epscmCollabPurchaseLink.findMany({
      where: { organizationId, partnerKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncFromReplenishment(organizationId: string, userId: string, partnerKey: string) {
    const proposals = await this.prisma.epscmReplenishmentProposal.findMany({
      where: { organizationId, proposalType: 'purchase', status: 'proposed' },
      take: 50,
    });
    for (const p of proposals) {
      const existing = await this.prisma.epscmCollabPurchaseLink.findFirst({
        where: { organizationId, partnerKey, proposalKey: p.proposalKey },
      });
      if (existing) continue;
      const seq = await this.prisma.epscmCollabPurchaseLink.count({ where: { organizationId } });
      await this.prisma.epscmCollabPurchaseLink.create({
        data: {
          organizationId,
          linkKey: generateEpscmCollabKey('POL', seq + 1),
          partnerKey,
          purchaseKey: p.proposalKey,
          proposalKey: p.proposalKey,
          itemKey: p.itemKey,
          quantity: p.proposedQty,
        },
      });
    }
    await this.audit.log(organizationId, 'EpscmCollabPurchaseLink', partnerKey, 'collab_access', userId);
    return this.listPurchaseOrders(organizationId, partnerKey);
  }

  async confirmOrder(organizationId: string, userId: string, linkKey: string, confirmedQty: number, notes?: string) {
    const link = await this.prisma.epscmCollabPurchaseLink.findFirst({ where: { organizationId, linkKey } });
    if (!link) throw new NotFoundException('Purchase link not found');

    const seq = await this.prisma.epscmCollabOrderConfirmation.count({ where: { organizationId } });
    await this.prisma.epscmCollabOrderConfirmation.create({
      data: {
        organizationId,
        confirmationKey: generateEpscmCollabKey('CNF', seq + 1),
        linkKey,
        confirmedQty,
        confirmedBy: userId,
        notes,
      },
    });
    await this.prisma.epscmCollabPurchaseLink.update({
      where: { id: link.id },
      data: { status: 'confirmed' },
    });
    await this.integration.onOrderConfirmed(organizationId, linkKey, link.purchaseKey);
    await this.audit.log(organizationId, 'EpscmCollabOrderConfirmation', linkKey, 'collab_order_confirmed', userId);
    return link;
  }

  async updateDeliveryDate(organizationId: string, userId: string, linkKey: string, promisedDate: Date, notes?: string) {
    const seq = await this.prisma.epscmCollabDeliverySchedule.count({ where: { organizationId } });
    const schedule = await this.prisma.epscmCollabDeliverySchedule.create({
      data: {
        organizationId,
        scheduleKey: generateEpscmCollabKey('SCH', seq + 1),
        linkKey,
        promisedDate,
        updatedBy: userId,
        notes,
      },
    });
    await this.integration.onDeliveryUpdated(organizationId, linkKey);
    await this.audit.log(organizationId, 'EpscmCollabDeliverySchedule', schedule.scheduleKey, 'collab_delivery_updated', userId);
    return schedule;
  }

  async uploadInvoice(
    organizationId: string,
    userId: string,
    partnerKey: string,
    input: { invoiceNumber: string; amount: number; purchaseKey?: string; storageUrl?: string },
  ) {
    const seq = await this.prisma.epscmCollabInvoice.count({ where: { organizationId } });
    const invoice = await this.prisma.epscmCollabInvoice.create({
      data: {
        organizationId,
        invoiceKey: generateEpscmCollabKey('INV', seq + 1),
        partnerKey,
        purchaseKey: input.purchaseKey,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        storageUrl: input.storageUrl,
        uploadedBy: userId,
      },
    });
    await this.integration.onDocumentUploaded(organizationId, invoice.invoiceKey, 'invoice');
    await this.audit.log(organizationId, 'EpscmCollabInvoice', invoice.invoiceKey, 'collab_document_uploaded', userId);
    return invoice;
  }

  async uploadDocument(
    organizationId: string,
    userId: string,
    partnerKey: string,
    refType: string,
    refKey: string,
    docType: string,
    storageUrl: string,
  ) {
    const seq = await this.prisma.epscmCollabDocument.count({ where: { organizationId } });
    const doc = await this.prisma.epscmCollabDocument.create({
      data: {
        organizationId,
        documentKey: generateEpscmCollabKey('DOC', seq + 1),
        partnerKey,
        refType,
        refKey,
        docType,
        storageUrl,
        uploadedBy: userId,
      },
    });
    await this.integration.onDocumentUploaded(organizationId, doc.documentKey, docType);
    await this.audit.log(organizationId, 'EpscmCollabDocument', doc.documentKey, 'collab_document_uploaded', userId);
    return doc;
  }

  async upsertCertificate(
    organizationId: string,
    userId: string,
    partnerKey: string,
    certType: string,
    expiresAt?: Date,
    storageUrl?: string,
  ) {
    const seq = await this.prisma.epscmCollabCertificate.count({ where: { organizationId } });
    const status = expiresAt && expiresAt < new Date() ? 'expired' : expiresAt && expiresAt.getTime() - Date.now() < 30 * 86400000 ? 'expiring' : 'valid';
    return this.prisma.epscmCollabCertificate.create({
      data: {
        organizationId,
        certificateKey: generateEpscmCollabKey('CRT', seq + 1),
        partnerKey,
        certType,
        expiresAt,
        storageUrl,
        status,
      },
    });
  }

  paymentStatus(organizationId: string, partnerKey: string) {
    return this.prisma.epscmCollabPaymentStatus.findMany({ where: { organizationId, partnerKey } });
  }
}
