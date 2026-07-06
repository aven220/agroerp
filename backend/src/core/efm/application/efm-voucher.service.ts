import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmVoucherTypeService } from './efm-voucher-type.service';
import { EfmPeriodService } from './efm-period.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import {
  buildReversalLines,
} from '../domain/efm-voucher.engine';
import {
  generateJournalKey,
  isBalanced,
  validateJournalLines,
  type JournalLineInput,
} from '../domain/efm-accounting.engine';

export type VoucherFilters = {
  status?: string;
  periodKey?: string;
  companyKey?: string;
  branchKey?: string;
  voucherTypeKey?: string;
  originType?: string;
  sourceModule?: string;
  sourceDocumentKey?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class EfmVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly voucherTypes: EfmVoucherTypeService,
    private readonly periods: EfmPeriodService,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  list(organizationId: string, filters?: VoucherFilters, limit = 1000) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
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

    return this.prisma.efmJournalEntry.findMany({
      where,
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
        approvals: { orderBy: { approvalLevel: 'asc' } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  getOne(organizationId: string, entryKey: string) {
    return this.prisma.efmJournalEntry.findFirst({
      where: { organizationId, entryKey },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
        approvals: { orderBy: { approvalLevel: 'asc' } },
      },
    });
  }

  async createManual(
    organizationId: string,
    userId: string,
    input: {
      voucherTypeKey: string;
      description: string;
      lines: JournalLineInput[];
      entryDate: string;
      companyKey?: string;
      branchKey?: string;
      costCenterKey?: string;
      reference?: string;
      observations?: string;
      currencyKey?: string;
      sourceModule?: string;
      sourceDocumentType?: string;
      sourceDocumentKey?: string;
      submitForApproval?: boolean;
    },
  ) {
    const vt = await this.voucherTypes.getOne(organizationId, input.voucherTypeKey);
    if (!vt) throw new NotFoundException(`Tipo comprobante ${input.voucherTypeKey} no encontrado`);
    if (vt.originAllowed === 'automatic') {
      throw new BadRequestException('Este tipo solo admite comprobantes automáticos');
    }

    const errors = validateJournalLines(input.lines);
    if (errors.length) throw new BadRequestException(errors.join('; '));

    const period = await this.periods.getOpenPeriod(organizationId, new Date(input.entryDate));
    if (!period) throw new BadRequestException('No hay período contable abierto');

    await this.validateAccounts(organizationId, input.lines);

    const count = await this.prisma.efmJournalEntry.count({ where: { organizationId } });
    const entryKey = generateJournalKey(count + 1);
    const { voucherNumber } = await this.voucherTypes.nextNumber(
      organizationId,
      input.voucherTypeKey,
      input.companyKey,
      new Date(input.entryDate),
    );

    const sourceDocumentKey = input.sourceDocumentKey ?? entryKey;
    const initialStatus = vt.requiresApproval && input.submitForApproval !== false
      ? 'pending_approval' as const
      : 'draft' as const;

    const entry = await this.prisma.efmJournalEntry.create({
      data: {
        organizationId,
        entryKey,
        voucherTypeKey: input.voucherTypeKey,
        voucherNumber,
        originType: 'manual',
        sourceModule: input.sourceModule ?? 'adjustment',
        sourceDocumentType: input.sourceDocumentType ?? 'manual_voucher',
        sourceDocumentKey,
        entryDate: new Date(input.entryDate),
        periodKey: period.periodKey,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        costCenterKey: input.costCenterKey,
        currencyKey: input.currencyKey ?? 'COP',
        status: initialStatus,
        description: input.description,
        reference: input.reference,
        observations: input.observations,
        totalDebit: input.lines.reduce((s, l) => s + l.debit, 0),
        totalCredit: input.lines.reduce((s, l) => s + l.credit, 0),
        createdBy: userId,
        lines: {
          create: input.lines.map((l, i) => ({
            lineNumber: i + 1,
            accountKey: l.accountKey,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
            costCenterKey: l.costCenterKey ?? input.costCenterKey,
            profitCenterKey: l.profitCenterKey,
            projectKey: l.projectKey,
            branchKey: l.branchKey ?? input.branchKey,
            companyKey: l.companyKey ?? input.companyKey,
            taxKey: l.taxKey,
            auxiliaryKey: l.auxiliaryKey,
            sourceDocumentKey: l.sourceDocumentKey ?? sourceDocumentKey,
            reference: l.reference ?? input.reference,
            observations: l.observations ?? input.observations,
          })),
        },
      },
      include: { lines: true },
    });

    if (vt.requiresApproval && initialStatus === 'pending_approval') {
      for (let level = 1; level <= vt.approvalLevels; level += 1) {
        await this.prisma.efmVoucherApproval.create({
          data: { organizationId, entryKey, approvalLevel: level, status: 'pending' },
        });
      }
    }

    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'created', userId, {
      voucherNumber,
      originType: 'manual',
    });
    await this.core.emitUserAction(organizationId, 'EfmVoucher', entryKey, EVENT_TYPES.EFM_VOUCHER_CREATED, {
      voucherNumber,
    });

    if (vt.autoPost && !vt.requiresApproval) {
      return this.engine.postEntry(organizationId, entryKey, userId);
    }
    return entry;
  }

  async submitForApproval(organizationId: string, entryKey: string, userId: string) {
    const entry = await this.getOne(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);
    if (entry.status !== 'draft') throw new BadRequestException('Solo borradores pueden enviarse a aprobación');

    const vt = entry.voucherTypeKey
      ? await this.voucherTypes.getOne(organizationId, entry.voucherTypeKey)
      : null;
    const levels = vt?.approvalLevels ?? 1;

    await this.prisma.efmVoucherApproval.deleteMany({ where: { organizationId, entryKey } });
    for (let level = 1; level <= levels; level += 1) {
      await this.prisma.efmVoucherApproval.create({
        data: { organizationId, entryKey, approvalLevel: level, status: 'pending' },
      });
    }

    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: { status: 'pending_approval', currentApprovalLevel: 0 },
      include: { lines: true, approvals: true },
    });
    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'submitted_for_approval', userId);
    return updated;
  }

  async approve(organizationId: string, entryKey: string, userId: string, comments?: string) {
    const entry = await this.getOne(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);
    if (entry.status !== 'pending_approval') {
      throw new BadRequestException('Comprobante no está pendiente de aprobación');
    }

    const nextLevel = entry.currentApprovalLevel + 1;
    const approval = await this.prisma.efmVoucherApproval.findFirst({
      where: { organizationId, entryKey, approvalLevel: nextLevel, status: 'pending' },
    });
    if (!approval) throw new BadRequestException('No hay nivel de aprobación pendiente');

    await this.prisma.efmVoucherApproval.update({
      where: { id: approval.id },
      data: { status: 'approved', approverUserId: userId, comments, decidedAt: new Date() },
    });

    const vt = entry.voucherTypeKey
      ? await this.voucherTypes.getOne(organizationId, entry.voucherTypeKey)
      : null;
    const totalLevels = vt?.approvalLevels ?? 1;
    const allApproved = nextLevel >= totalLevels;

    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: {
        currentApprovalLevel: nextLevel,
        status: allApproved ? 'approved' : 'pending_approval',
      },
      include: { lines: true, approvals: true },
    });

    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'approved', userId, {
      level: nextLevel,
      comments,
    });
    await this.core.emitUserAction(organizationId, 'EfmVoucher', entryKey, EVENT_TYPES.EFM_VOUCHER_APPROVED, {
      level: nextLevel,
    });

    if (allApproved) {
      if (vt?.autoPost) {
        return this.engine.postEntry(organizationId, entryKey, userId);
      }
    }
    return updated;
  }

  async reject(organizationId: string, entryKey: string, userId: string, reason: string) {
    const entry = await this.getOne(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);
    if (entry.status !== 'pending_approval') {
      throw new BadRequestException('Comprobante no está pendiente de aprobación');
    }

    const nextLevel = entry.currentApprovalLevel + 1;
    await this.prisma.efmVoucherApproval.updateMany({
      where: { organizationId, entryKey, approvalLevel: nextLevel },
      data: { status: 'rejected', approverUserId: userId, comments: reason, decidedAt: new Date() },
    });

    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: { status: 'rejected', observations: reason },
      include: { lines: true, approvals: true },
    });

    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'rejected', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EfmVoucher', entryKey, EVENT_TYPES.EFM_VOUCHER_REJECTED, { reason });
    return updated;
  }

  async voidVoucher(organizationId: string, entryKey: string, userId: string, reason: string) {
    const entry = await this.getOne(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);
    if (entry.status === 'voided') throw new BadRequestException('Comprobante ya anulado');
    if (entry.status === 'reversed') throw new BadRequestException('Comprobante ya reversado');

    const period = await this.prisma.efmAccountingPeriod.findFirst({
      where: { organizationId, periodKey: entry.periodKey },
    });
    if (period?.status === 'locked') throw new BadRequestException('Período bloqueado');

    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: {
        status: 'voided',
        voidReason: reason,
        voidedBy: userId,
        voidedAt: new Date(),
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'voided', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EfmVoucher', entryKey, EVENT_TYPES.EFM_VOUCHER_VOIDED, { reason });
    return updated;
  }

  async reverse(organizationId: string, entryKey: string, userId: string, reason?: string) {
    const original = await this.getOne(organizationId, entryKey);
    if (!original) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);
    if (original.status !== 'posted') {
      throw new BadRequestException('Solo comprobantes contabilizados pueden reversarse');
    }
    if (original.reversedEntryKey) {
      throw new BadRequestException('Comprobante ya tiene reversión registrada');
    }

    const revType = await this.prisma.efmVoucherType.findFirst({
      where: { organizationId, code: 'REV', isActive: true },
    });
    const voucherTypeKey = revType?.voucherTypeKey ?? original.voucherTypeKey ?? 'VT-REV';

    const reversalLines = buildReversalLines(original.lines);
    const count = await this.prisma.efmJournalEntry.count({ where: { organizationId } });
    const newEntryKey = generateJournalKey(count + 1);
    const { voucherNumber } = await this.voucherTypes.nextNumber(
      organizationId,
      voucherTypeKey,
      original.companyKey ?? undefined,
      new Date(),
    );

    const reversal = await this.prisma.efmJournalEntry.create({
      data: {
        organizationId,
        entryKey: newEntryKey,
        voucherTypeKey,
        voucherNumber,
        originType: 'automatic',
        sourceModule: original.sourceModule,
        sourceDocumentType: 'reversal',
        sourceDocumentKey: `REV-${original.entryKey}`,
        entryDate: new Date(),
        periodKey: original.periodKey,
        companyKey: original.companyKey,
        branchKey: original.branchKey,
        costCenterKey: original.costCenterKey,
        currencyKey: original.currencyKey,
        status: 'draft',
        description: `Reversión de ${original.voucherNumber ?? original.entryKey}`,
        reference: original.entryKey,
        observations: reason,
        reversedFromEntryKey: original.entryKey,
        totalDebit: reversalLines.reduce((s, l) => s + l.debit, 0),
        totalCredit: reversalLines.reduce((s, l) => s + l.credit, 0),
        createdBy: userId,
        lines: {
          create: reversalLines.map((l, i) => ({
            lineNumber: i + 1,
            ...l,
          })),
        },
      },
      include: { lines: true },
    });

    await this.prisma.efmJournalEntry.update({
      where: { id: original.id },
      data: { status: 'reversed', reversedEntryKey: newEntryKey },
    });

    const posted = await this.engine.postEntry(organizationId, newEntryKey, userId);

    await this.audit.log(organizationId, 'EfmVoucher', entryKey, 'reversed', userId, {
      reversalEntryKey: newEntryKey,
      reason,
    });
    await this.core.emitUserAction(organizationId, 'EfmVoucher', entryKey, EVENT_TYPES.EFM_VOUCHER_REVERSED, {
      reversalEntryKey: newEntryKey,
    });

    return { original: await this.getOne(organizationId, entryKey), reversal: posted };
  }

  async validateVoucher(organizationId: string, entryKey: string) {
    const entry = await this.getOne(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Comprobante ${entryKey} no encontrado`);

    const errors: string[] = [];
    const lines = entry.lines.map((l) => ({ accountKey: l.accountKey, debit: l.debit, credit: l.credit }));
    errors.push(...validateJournalLines(lines));

    const period = await this.prisma.efmAccountingPeriod.findFirst({
      where: { organizationId, periodKey: entry.periodKey },
    });
    if (!period || period.status !== 'open') errors.push('Período contable no abierto');

    for (const line of entry.lines) {
      const account = await this.prisma.efmAccount.findFirst({
        where: { organizationId, accountKey: line.accountKey, isActive: true },
      });
      if (!account) errors.push(`Cuenta inactiva o inexistente: ${line.accountKey}`);
    }

    return { valid: errors.length === 0, errors, entryKey };
  }

  private async validateAccounts(organizationId: string, lines: JournalLineInput[]) {
    for (const line of lines) {
      const account = await this.prisma.efmAccount.findFirst({
        where: { organizationId, accountKey: line.accountKey, isActive: true },
      });
      if (!account) throw new BadRequestException(`Cuenta ${line.accountKey} no existe o está inactiva`);
      if (!account.isPostingAllowed) throw new BadRequestException(`Cuenta ${line.accountKey} no permite movimiento`);
    }
  }
}
