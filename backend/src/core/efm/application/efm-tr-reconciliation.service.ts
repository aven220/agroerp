import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import {
  DEFAULT_RECONCILIATION_RULES,
  generateTrKey,
  matchMovementToLine,
  parseCsvStatement,
  parseOfxStatement,
} from '../domain/efm-treasury.engine';

@Injectable()
export class EfmTrReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  listRules(organizationId: string) {
    return this.prisma.efmTrReconciliationRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  async seedRules(organizationId: string, userId: string) {
    for (const r of DEFAULT_RECONCILIATION_RULES) {
      await this.prisma.efmTrReconciliationRule.upsert({
        where: { organizationId_ruleKey: { organizationId, ruleKey: r.ruleKey } },
        update: { name: r.name, matchField: r.matchField, matchOperator: r.matchOperator, toleranceAmount: r.toleranceAmount, toleranceDays: r.toleranceDays, priority: r.priority },
        create: { organizationId, ruleKey: r.ruleKey, name: r.name, matchField: r.matchField, matchOperator: r.matchOperator, toleranceAmount: r.toleranceAmount, toleranceDays: r.toleranceDays, priority: r.priority },
      });
    }
    await this.audit.log(organizationId, 'EfmTrReconciliationRule', 'seed', 'completed', userId);
    return this.listRules(organizationId);
  }

  async importStatement(organizationId: string, userId: string, input: {
    bankAccountKey: string;
    format: 'csv' | 'excel' | 'ofx';
    content: string;
    fileName?: string;
    periodFrom: string;
    periodTo: string;
    openingBalance: number;
    closingBalance: number;
  }) {
    const account = await this.prisma.efmTrBankAccount.findFirst({
      where: { organizationId, accountKey: input.bankAccountKey },
    });
    if (!account) throw new NotFoundException(`Cuenta ${input.bankAccountKey} no encontrada`);

    let parsed = input.format === 'ofx'
      ? parseOfxStatement(input.content)
      : parseCsvStatement(input.content);

    if (input.format === 'excel') parsed = parseCsvStatement(input.content);

    const statementKey = generateTrKey('STM', (await this.prisma.efmTrBankStatement.count({ where: { organizationId } })) + 1);

    const statement = await this.prisma.efmTrBankStatement.create({
      data: {
        organizationId,
        statementKey,
        bankAccountKey: input.bankAccountKey,
        importFormat: input.format,
        periodFrom: new Date(input.periodFrom),
        periodTo: new Date(input.periodTo),
        openingBalance: input.openingBalance,
        closingBalance: input.closingBalance,
        fileName: input.fileName,
        importedBy: userId,
        lines: {
          create: parsed.map((l, i) => ({
            lineNumber: i + 1,
            transactionDate: new Date(l.transactionDate),
            description: l.description,
            reference: l.reference,
            debit: l.debit,
            credit: l.credit,
            balance: l.balance,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmTrBankStatement', statementKey, 'imported', userId, {
      lineCount: parsed.length,
    });
    return statement;
  }

  async startReconciliation(organizationId: string, userId: string, input: {
    bankAccountKey: string;
    statementKey?: string;
    periodFrom: string;
    periodTo: string;
  }) {
    const account = await this.prisma.efmTrBankAccount.findFirst({
      where: { organizationId, accountKey: input.bankAccountKey },
    });
    if (!account) throw new NotFoundException(`Cuenta ${input.bankAccountKey} no encontrada`);

    let statement = input.statementKey
      ? await this.prisma.efmTrBankStatement.findFirst({ where: { organizationId, statementKey: input.statementKey }, include: { lines: true } })
      : null;

    const reconciliationKey = generateTrKey('REC', (await this.prisma.efmTrReconciliation.count({ where: { organizationId } })) + 1);

    const reconciliation = await this.prisma.efmTrReconciliation.create({
      data: {
        organizationId,
        reconciliationKey,
        bankAccountKey: input.bankAccountKey,
        statementId: statement?.id,
        statementKey: statement?.statementKey,
        periodFrom: new Date(input.periodFrom),
        periodTo: new Date(input.periodTo),
        bookBalance: account.currentBalance,
        bankBalance: statement?.closingBalance ?? account.currentBalance,
        differenceAmount: (statement?.closingBalance ?? account.currentBalance) - account.currentBalance,
        status: 'in_progress',
      },
    });

    if (statement) {
      await this.autoReconcile(organizationId, userId, reconciliation.id, input.bankAccountKey, statement.lines);
    }

    await this.audit.log(organizationId, 'EfmTrReconciliation', reconciliationKey, 'started', userId);
    return this.getOne(organizationId, reconciliationKey);
  }

  async autoReconcile(
    organizationId: string,
    userId: string,
    reconciliationId: string,
    bankAccountKey: string,
    lines: Array<{ id: string; debit: number; credit: number; transactionDate: Date; reference?: string | null; description: string; matchStatus: string }>,
  ) {
    const rules = await this.listRules(organizationId);
    const movements = await this.prisma.efmTrMovement.findMany({
      where: {
        organizationId,
        bankAccountKey,
        status: 'processed',
      },
    });

    let matched = 0;
    const usedMovementIds = new Set<string>();

    for (const line of lines) {
      if (line.matchStatus === 'auto_matched' || line.matchStatus === 'manual_matched') continue;

      for (const mov of movements) {
        if (usedMovementIds.has(mov.id)) continue;

        const result = matchMovementToLine(
          {
            amount: mov.amount,
            movementDate: mov.movementDate,
            referenceNumber: mov.referenceNumber,
            description: mov.description,
          },
          {
            debit: line.debit,
            credit: line.credit,
            transactionDate: line.transactionDate,
            reference: line.reference,
            description: line.description,
          },
          rules,
        );

        if (result.matched) {
          await this.prisma.efmTrReconciliationMatch.create({
            data: {
              reconciliationId,
              statementLineId: line.id,
              movementId: mov.id,
              matchStatus: 'auto_matched',
              matchRuleKey: result.ruleKey,
              amount: mov.amount,
              differenceAmount: result.difference,
              matchedBy: userId,
              matchedAt: new Date(),
            },
          });
          await this.prisma.efmTrBankStatementLine.update({
            where: { id: line.id },
            data: { matchStatus: 'auto_matched' },
          });
          usedMovementIds.add(mov.id);
          matched += 1;
          break;
        }
      }
    }

    const pending = lines.length - matched;
    await this.prisma.efmTrReconciliation.update({
      where: { id: reconciliationId },
      data: { matchedCount: matched, pendingCount: pending },
    });

    return { matched, pending };
  }

  async manualMatch(organizationId: string, userId: string, reconciliationKey: string, input: {
    statementLineId: string; movementKey: string;
  }) {
    const rec = await this.prisma.efmTrReconciliation.findFirst({ where: { organizationId, reconciliationKey } });
    if (!rec) throw new NotFoundException(`Conciliación ${reconciliationKey} no encontrada`);

    const movement = await this.prisma.efmTrMovement.findFirst({ where: { organizationId, movementKey: input.movementKey } });
    if (!movement) throw new NotFoundException(`Movimiento ${input.movementKey} no encontrado`);

    const line = await this.prisma.efmTrBankStatementLine.findFirst({ where: { id: input.statementLineId } });
    if (!line) throw new NotFoundException('Línea de extracto no encontrada');

    const lineAmount = line.credit > 0 ? line.credit : line.debit;

    await this.prisma.efmTrReconciliationMatch.create({
      data: {
        reconciliationId: rec.id,
        statementLineId: line.id,
        movementId: movement.id,
        matchStatus: 'manual_matched',
        amount: lineAmount,
        matchedBy: userId,
        matchedAt: new Date(),
      },
    });

    await this.prisma.efmTrBankStatementLine.update({
      where: { id: line.id },
      data: { matchStatus: 'manual_matched' },
    });

    await this.prisma.efmTrReconciliation.update({
      where: { id: rec.id },
      data: { matchedCount: { increment: 1 }, pendingCount: { decrement: 1 } },
    });

    await this.audit.log(organizationId, 'EfmTrReconciliation', reconciliationKey, 'manual_match', userId);
    return this.getOne(organizationId, reconciliationKey);
  }

  async createAdjustment(organizationId: string, userId: string, reconciliationKey: string, input: {
    amount: number; description: string;
  }) {
    const rec = await this.prisma.efmTrReconciliation.findFirst({ where: { organizationId, reconciliationKey } });
    if (!rec) throw new NotFoundException(`Conciliación ${reconciliationKey} no encontrada`);

    const adjustmentKey = generateTrKey('ADJ', (await this.prisma.efmTrReconciliationAdjustment.count({ where: { organizationId } })) + 1);

    let accountingRef: string | undefined;
    try {
      const entry = await this.engine.createEntry(organizationId, userId, {
        sourceModule: 'treasury',
        sourceDocumentType: 'reconciliation_adjustment',
        sourceDocumentKey: adjustmentKey,
        description: input.description,
        entryDate: new Date().toISOString().slice(0, 10),
        lines: input.amount > 0
          ? [{ accountKey: 'ACC-1110', debit: input.amount, credit: 0 }, { accountKey: 'ACC-6135', debit: 0, credit: input.amount }]
          : [{ accountKey: 'ACC-6135', debit: Math.abs(input.amount), credit: 0 }, { accountKey: 'ACC-1110', debit: 0, credit: Math.abs(input.amount) }],
        autoPost: true,
      });
      accountingRef = entry.entryKey;
    } catch { /* non-blocking */ }

    const adj = await this.prisma.efmTrReconciliationAdjustment.create({
      data: {
        organizationId,
        adjustmentKey,
        reconciliationId: rec.id,
        amount: input.amount,
        description: input.description,
        accountingRef,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'EfmTrReconciliation', reconciliationKey, 'adjustment', userId, { adjustmentKey });
    return adj;
  }

  async complete(organizationId: string, userId: string, reconciliationKey: string) {
    const rec = await this.prisma.efmTrReconciliation.findFirst({
      where: { organizationId, reconciliationKey },
      include: { matches: true },
    });
    if (!rec) throw new NotFoundException(`Conciliación ${reconciliationKey} no encontrada`);

    const updated = await this.prisma.efmTrReconciliation.update({
      where: { id: rec.id },
      data: { status: 'completed', completedAt: new Date(), completedBy: userId },
      include: { matches: true, adjustments: true },
    });

    if (rec.statementId) {
      await this.prisma.efmTrBankStatement.update({
        where: { id: rec.statementId },
        data: { status: 'reconciled' },
      });
    }

    await this.audit.log(organizationId, 'EfmTrReconciliation', reconciliationKey, 'completed', userId);
    return updated;
  }

  getOne(organizationId: string, reconciliationKey: string) {
    return this.prisma.efmTrReconciliation.findFirst({
      where: { organizationId, reconciliationKey },
      include: {
        matches: { include: { statementLine: true, movement: true } },
        adjustments: true,
        statement: { include: { lines: true } },
        bankAccount: { include: { bank: true } },
      },
    });
  }

  list(organizationId: string, filters?: { bankAccountKey?: string; status?: string }) {
    return this.prisma.efmTrReconciliation.findMany({
      where: {
        organizationId,
        ...(filters?.bankAccountKey ? { bankAccountKey: filters.bankAccountKey } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
