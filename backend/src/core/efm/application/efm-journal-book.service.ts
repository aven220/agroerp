import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { toCsv } from '../domain/efm-voucher.engine';
import type { VoucherFilters } from './efm-voucher.service';

@Injectable()
export class EfmJournalBookService {
  constructor(private readonly prisma: PrismaService) {}

  async query(organizationId: string, filters?: VoucherFilters, limit = 5000) {
    const where: Record<string, unknown> = {
      organizationId,
      status: { in: ['posted', 'reversed'] },
    };
    if (filters?.periodKey) where.periodKey = filters.periodKey;
    if (filters?.companyKey) where.companyKey = filters.companyKey;
    if (filters?.branchKey) where.branchKey = filters.branchKey;
    if (filters?.voucherTypeKey) where.voucherTypeKey = filters.voucherTypeKey;
    if (filters?.originType) where.originType = filters.originType;
    if (filters?.sourceModule) where.sourceModule = filters.sourceModule;
    if (filters?.sourceDocumentKey) where.sourceDocumentKey = { contains: filters.sourceDocumentKey };
    if (filters?.createdBy) where.createdBy = filters.createdBy;
    if (filters?.dateFrom || filters?.dateTo) {
      where.entryDate = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }

    const entries = await this.prisma.efmJournalEntry.findMany({
      where,
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
      },
      orderBy: [{ entryDate: 'asc' }, { voucherNumber: 'asc' }, { entryKey: 'asc' }],
      take: limit,
    });

    const accounts = await this.prisma.efmAccount.findMany({
      where: { organizationId, isActive: true },
      select: { accountKey: true, code: true, name: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.accountKey, a]));

    const rows = entries.flatMap((e) =>
      e.lines.map((l) => ({
        entryKey: e.entryKey,
        voucherNumber: e.voucherNumber,
        entryDate: e.entryDate.toISOString().slice(0, 10),
        periodKey: e.periodKey,
        companyKey: l.companyKey ?? e.companyKey,
        branchKey: l.branchKey ?? e.branchKey,
        accountKey: l.accountKey,
        accountCode: accountMap.get(l.accountKey)?.code ?? l.accountKey,
        accountName: accountMap.get(l.accountKey)?.name ?? '',
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? e.description,
        costCenterKey: l.costCenterKey,
        profitCenterKey: l.profitCenterKey,
        projectKey: l.projectKey,
        sourceModule: e.sourceModule,
        sourceDocumentKey: l.sourceDocumentKey ?? e.sourceDocumentKey,
        reference: l.reference ?? e.reference,
        observations: l.observations ?? e.observations,
        createdBy: e.createdBy,
        postedAt: e.postedAt?.toISOString() ?? null,
      })),
    );

    return {
      filters: filters ?? {},
      totalEntries: entries.length,
      totalLines: rows.length,
      rows,
    };
  }

  async exportCsv(organizationId: string, filters?: VoucherFilters) {
    const { rows } = await this.query(organizationId, filters, 50000);
    const columns = [
      'entryDate', 'voucherNumber', 'entryKey', 'accountCode', 'accountName',
      'debit', 'credit', 'companyKey', 'branchKey', 'costCenterKey',
      'profitCenterKey', 'projectKey', 'sourceModule', 'sourceDocumentKey',
      'reference', 'description', 'createdBy',
    ];
    return {
      filename: `libro-diario-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      content: toCsv(rows as Array<Record<string, unknown>>, columns),
    };
  }
}
