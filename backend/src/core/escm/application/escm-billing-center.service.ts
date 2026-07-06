import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EscmBillingCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const invoiceStatuses = ['draft', 'proforma', 'issued', 'partial', 'voided', 'cancelled'] as const;
    const returnStatuses = ['draft', 'submitted', 'approved', 'processed', 'rejected'] as const;
    const warrantyStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'in_repair', 'replacement', 'closed'] as const;

    const [
      invoiceCounts,
      returnCounts,
      warrantyCounts,
      creditNoteCount,
      debitNoteCount,
      recentInvoices,
      pendingReturns,
      pendingWarranties,
      billingDocs,
    ] = await Promise.all([
      Promise.all(
        invoiceStatuses.map((s) =>
          this.prisma.escmInvoice.count({ where: { organizationId, status: s } }),
        ),
      ),
      Promise.all(
        returnStatuses.map((s) =>
          this.prisma.escmReturn.count({ where: { organizationId, status: s } }),
        ),
      ),
      Promise.all(
        warrantyStatuses.map((s) =>
          this.prisma.escmWarrantyClaim.count({ where: { organizationId, status: s } }),
        ),
      ),
      this.prisma.escmCreditNote.count({ where: { organizationId, status: 'issued' } }),
      this.prisma.escmDebitNote.count({ where: { organizationId, status: 'issued' } }),
      this.prisma.escmInvoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.escmReturn.count({
        where: { organizationId, status: { in: ['submitted', 'approved'] } },
      }),
      this.prisma.escmWarrantyClaim.count({
        where: { organizationId, status: { in: ['pending_approval', 'in_repair', 'replacement'] } },
      }),
      this.prisma.escmBillingDocument.count({ where: { organizationId } }),
    ]);

    const issuedTotal = await this.prisma.escmInvoice.aggregate({
      where: { organizationId, status: { in: ['issued', 'partial'] } },
      _sum: { totalAmount: true },
    });

    return {
      invoicesByStatus: Object.fromEntries(invoiceStatuses.map((s, i) => [s, invoiceCounts[i]])),
      returnsByStatus: Object.fromEntries(returnStatuses.map((s, i) => [s, returnCounts[i]])),
      warrantiesByStatus: Object.fromEntries(warrantyStatuses.map((s, i) => [s, warrantyCounts[i]])),
      issuedCreditNotes: creditNoteCount,
      issuedDebitNotes: debitNoteCount,
      billingDocuments: billingDocs,
      pendingReturns,
      pendingWarranties,
      recentInvoices,
      issuedTotalAmount: issuedTotal._sum.totalAmount ?? 0,
    };
  }
}
