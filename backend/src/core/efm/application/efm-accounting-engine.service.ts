import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmRuleService } from './efm-rule.service';
import { EfmPeriodService } from './efm-period.service';
import { EfmParameterService } from './efm-parameter.service';
import { EfmVoucherTypeService } from './efm-voucher-type.service';
import {
  buildJournalFromRule,
  extractAmountFromPayload,
  generateJournalKey,
  isBalanced,
  sumCredits,
  sumDebits,
  validateJournalLines,
  type JournalLineInput,
  type SourceDocumentContext,
} from '../domain/efm-accounting.engine';

@Injectable()
export class EfmAccountingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly rules: EfmRuleService,
    private readonly periods: EfmPeriodService,
    private readonly parameters: EfmParameterService,
    private readonly voucherTypes: EfmVoucherTypeService,
  ) {}

  listEntries(organizationId: string, filters?: { status?: string; periodKey?: string; sourceModule?: string }) {
    return this.prisma.efmJournalEntry.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.sourceModule ? { sourceModule: filters.sourceModule } : {}),
      },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
      orderBy: { entryDate: 'desc' },
      take: 500,
    });
  }

  getEntry(organizationId: string, entryKey: string) {
    return this.prisma.efmJournalEntry.findFirst({
      where: { organizationId, entryKey },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    });
  }

  async generateFromSource(
    organizationId: string,
    userId: string | undefined,
    ctx: SourceDocumentContext,
    options?: { autoPost?: boolean },
  ) {
    const existing = await this.prisma.efmJournalEntry.findFirst({
      where: {
        organizationId,
        sourceModule: ctx.sourceModule,
        sourceDocumentType: ctx.sourceDocumentType,
        sourceDocumentKey: ctx.sourceDocumentKey,
      },
    });
    if (existing) return this.getEntry(organizationId, existing.entryKey);

    const context = {
      ...ctx.payload,
      amount: ctx.amount,
      sourceModule: ctx.sourceModule,
      companyKey: ctx.companyKey,
      countryCode: ctx.countryCode,
    };

    const matchingRules = await this.rules.findMatchingRules(organizationId, ctx.eventType, context);
    if (!matchingRules.length) {
      throw new BadRequestException(`No hay reglas activas para ${ctx.eventType}`);
    }

    const rule = matchingRules[0];
    const lines = buildJournalFromRule(rule, ctx);
    const errors = validateJournalLines(lines);
    if (errors.length) throw new BadRequestException(errors.join('; '));

    return this.createEntry(organizationId, userId, {
      sourceModule: ctx.sourceModule,
      sourceDocumentType: ctx.sourceDocumentType,
      sourceDocumentKey: ctx.sourceDocumentKey,
      description: `${rule.name} — ${ctx.sourceDocumentKey}`,
      lines,
      ruleKey: rule.ruleKey,
      companyKey: ctx.companyKey,
      branchKey: ctx.branchKey,
      costCenterKey: ctx.costCenterKey,
      currencyKey: ctx.currencyKey ?? 'COP',
      entryDate: new Date().toISOString().slice(0, 10),
      autoPost: options?.autoPost,
    });
  }

  async generateFromEvent(
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>,
    userId?: string,
  ) {
    const amount = extractAmountFromPayload(payload);
    const sourceDocumentKey = String(
      payload.invoiceKey ?? payload.paymentKey ?? payload.orderKey ?? payload.movementKey
        ?? payload.settlementKey ?? payload.returnKey ?? payload.noteKey ?? payload.id ?? 'UNKNOWN',
    );
    const ctx: SourceDocumentContext = {
      sourceModule: String(payload.sourceModule ?? this.inferModule(eventType)),
      sourceDocumentType: eventType,
      sourceDocumentKey,
      eventType,
      amount,
      currencyKey: String(payload.currencyKey ?? 'COP'),
      companyKey: payload.companyKey ? String(payload.companyKey) : undefined,
      costCenterKey: payload.costCenterKey ? String(payload.costCenterKey) : undefined,
      payload,
    };

    const autoPostParam = await this.parameters.get(organizationId, 'auto_post_journals');
    const autoPost = (autoPostParam?.value as { enabled?: boolean })?.enabled ?? true;

    try {
      const entry = await this.generateFromSource(organizationId, userId, ctx, { autoPost });
      if (entry && 'entryKey' in entry) {
        await this.updateSourceAccountingRef(organizationId, ctx, entry.entryKey);
      }
      return entry;
    } catch (err) {
      await this.audit.log(organizationId, 'EfmJournalEngine', sourceDocumentKey, 'generation_failed', userId, {
        eventType,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  private inferModule(eventType: string): string {
    if (eventType.includes('Invoice') || eventType.includes('Quotation')) return 'sales';
    if (eventType.includes('Payment')) return 'collection';
    if (eventType.includes('Return')) return 'return';
    if (eventType.includes('CreditNote')) return 'credit_note';
    if (eventType.includes('DebitNote')) return 'debit_note';
    if (eventType.includes('Eims') || eventType.includes('Movement')) return 'inventory';
    if (eventType.includes('Cpep') || eventType.includes('Settlement')) return 'purchase';
    return 'adjustment';
  }

  private async updateSourceAccountingRef(organizationId: string, ctx: SourceDocumentContext, entryKey: string) {
    const ref = entryKey;
    try {
      if (ctx.sourceModule === 'sales' && ctx.payload?.invoiceKey) {
        await this.prisma.escmInvoice.updateMany({
          where: { organizationId, invoiceKey: String(ctx.payload.invoiceKey) },
          data: { accountingRef: ref },
        });
      }
      if (ctx.sourceModule === 'collection' && ctx.payload?.paymentKey) {
        await this.prisma.escmPayment.updateMany({
          where: { organizationId, paymentKey: String(ctx.payload.paymentKey) },
          data: { accountingRef: ref },
        });
      }
    } catch {
      // non-blocking integration update
    }
  }

  async createEntry(
    organizationId: string,
    userId: string | undefined,
    input: {
      sourceModule: string;
      sourceDocumentType: string;
      sourceDocumentKey: string;
      description: string;
      lines: JournalLineInput[];
      ruleKey?: string;
      companyKey?: string;
      branchKey?: string;
      costCenterKey?: string;
      currencyKey?: string;
      exchangeRate?: number;
      entryDate: string;
      autoPost?: boolean;
    },
  ) {
    const errors = validateJournalLines(input.lines);
    if (errors.length) throw new BadRequestException(errors.join('; '));

    const period = await this.periods.getOpenPeriod(organizationId, new Date(input.entryDate));
    if (!period) throw new BadRequestException('No hay período contable abierto para la fecha');

    for (const line of input.lines) {
      const account = await this.prisma.efmAccount.findFirst({
        where: { organizationId, accountKey: line.accountKey, isActive: true },
      });
      if (!account) throw new BadRequestException(`Cuenta ${line.accountKey} no existe o está inactiva`);
      if (!account.isPostingAllowed) throw new BadRequestException(`Cuenta ${line.accountKey} no permite movimiento`);
    }

    const count = await this.prisma.efmJournalEntry.count({ where: { organizationId } });
    const entryKey = generateJournalKey(count + 1);
    const totalDebit = sumDebits(input.lines);
    const totalCredit = sumCredits(input.lines);

    const autoType = await this.prisma.efmVoucherType.findFirst({
      where: { organizationId, code: 'AUTO', isActive: true },
    });
    const voucherTypeKey = autoType?.voucherTypeKey ?? undefined;
    let voucherNumber: string | undefined;
    if (voucherTypeKey) {
      const num = await this.voucherTypes.nextNumber(
        organizationId,
        voucherTypeKey,
        input.companyKey,
        new Date(input.entryDate),
      );
      voucherNumber = num.voucherNumber;
    }

    const entry = await this.prisma.efmJournalEntry.create({
      data: {
        organizationId,
        entryKey,
        voucherTypeKey,
        voucherNumber,
        originType: 'automatic',
        sourceModule: input.sourceModule,
        sourceDocumentType: input.sourceDocumentType,
        sourceDocumentKey: input.sourceDocumentKey,
        entryDate: new Date(input.entryDate),
        periodKey: period.periodKey,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        costCenterKey: input.costCenterKey,
        currencyKey: input.currencyKey ?? 'COP',
        exchangeRate: input.exchangeRate ?? 1,
        status: 'draft',
        description: input.description,
        totalDebit,
        totalCredit,
        ruleKey: input.ruleKey,
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
            sourceDocumentKey: input.sourceDocumentKey,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmJournalEntry', entryKey, 'created', userId, {
      sourceDocumentKey: input.sourceDocumentKey,
    });
    await this.core.emitUserAction(organizationId, 'EfmJournalEntry', entryKey, EVENT_TYPES.EFM_JOURNAL_CREATED, {
      sourceModule: input.sourceModule,
    });

    if (input.autoPost) {
      return this.postEntry(organizationId, entryKey, userId);
    }
    return entry;
  }

  async postEntry(organizationId: string, entryKey: string, userId?: string) {
    const entry = await this.getEntry(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Asiento ${entryKey} no encontrado`);
    const postable = ['draft', 'approved'];
    if (!postable.includes(entry.status)) {
      throw new BadRequestException(`Asiento ${entryKey} no puede contabilizarse (estado: ${entry.status})`);
    }
    if (!isBalanced(entry.lines.map((l) => ({ accountKey: l.accountKey, debit: l.debit, credit: l.credit })))) {
      throw new BadRequestException('Asiento desbalanceado');
    }

    const period = await this.prisma.efmAccountingPeriod.findFirst({
      where: { organizationId, periodKey: entry.periodKey },
    });
    if (period?.status === 'locked') throw new BadRequestException('Período contable bloqueado');

    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: { status: 'posted', postedAt: new Date(), postedBy: userId },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmJournalEntry', entryKey, 'posted', userId);
    await this.core.emitUserAction(organizationId, 'EfmJournalEntry', entryKey, EVENT_TYPES.EFM_JOURNAL_POSTED, {});
    return updated;
  }

  async voidEntry(organizationId: string, entryKey: string, userId?: string) {
    const entry = await this.getEntry(organizationId, entryKey);
    if (!entry) throw new NotFoundException(`Asiento ${entryKey} no encontrado`);
    const updated = await this.prisma.efmJournalEntry.update({
      where: { id: entry.id },
      data: { status: 'voided' },
      include: { lines: true },
    });
    await this.audit.log(organizationId, 'EfmJournalEntry', entryKey, 'voided', userId);
    return updated;
  }
}
