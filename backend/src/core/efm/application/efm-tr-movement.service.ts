import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { generateTrKey } from '../domain/efm-treasury.engine';

@Injectable()
export class EfmTrMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  list(organizationId: string, filters?: {
    movementType?: string; status?: string; bankAccountKey?: string; dateFrom?: string; dateTo?: string;
  }) {
    return this.prisma.efmTrMovement.findMany({
      where: {
        organizationId,
        ...(filters?.movementType ? { movementType: filters.movementType as never } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.bankAccountKey ? { bankAccountKey: filters.bankAccountKey } : {}),
        ...(filters?.dateFrom || filters?.dateTo ? {
          movementDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        } : {}),
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  getOne(organizationId: string, movementKey: string) {
    return this.prisma.efmTrMovement.findFirst({ where: { organizationId, movementKey } });
  }

  async create(organizationId: string, userId: string, input: {
    movementType: string;
    amount: number;
    currencyKey?: string;
    exchangeRate?: number;
    fromAccountKey?: string;
    toAccountKey?: string;
    fromCashBoxKey?: string;
    toCashBoxKey?: string;
    bankAccountKey?: string;
    cashBoxKey?: string;
    referenceNumber?: string;
    movementDate: string;
    description: string;
    observations?: string;
    sourceModule?: string;
    sourceDocumentKey?: string;
    apPaymentKey?: string;
    arPaymentKey?: string;
    autoProcess?: boolean;
  }) {
    const movementKey = generateTrKey('MOV', (await this.prisma.efmTrMovement.count({ where: { organizationId } })) + 1);

    const movement = await this.prisma.efmTrMovement.create({
      data: {
        organizationId,
        movementKey,
        movementType: input.movementType as never,
        amount: input.amount,
        currencyKey: input.currencyKey ?? 'COP',
        exchangeRate: input.exchangeRate ?? 1,
        fromAccountKey: input.fromAccountKey,
        toAccountKey: input.toAccountKey,
        fromCashBoxKey: input.fromCashBoxKey,
        toCashBoxKey: input.toCashBoxKey,
        bankAccountKey: input.bankAccountKey,
        cashBoxKey: input.cashBoxKey,
        referenceNumber: input.referenceNumber,
        movementDate: new Date(input.movementDate),
        description: input.description,
        observations: input.observations,
        sourceModule: input.sourceModule,
        sourceDocumentKey: input.sourceDocumentKey,
        apPaymentKey: input.apPaymentKey,
        arPaymentKey: input.arPaymentKey,
        status: 'approved',
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmTrMovement', movementKey, 'created', userId, { amount: input.amount });
    await this.core.emitUserAction(organizationId, 'EfmTrMovement', movementKey, EVENT_TYPES.EFM_TR_MOVEMENT_CREATED, {
      movementType: input.movementType,
    });

    if (input.autoProcess !== false) {
      return this.process(organizationId, movementKey, userId);
    }
    return movement;
  }

  async process(organizationId: string, movementKey: string, userId: string) {
    const movement = await this.getOne(organizationId, movementKey);
    if (!movement) throw new NotFoundException(`Movimiento ${movementKey} no encontrado`);
    if (movement.status === 'processed') return movement;
    if (movement.status === 'voided') throw new BadRequestException('Movimiento anulado');

    let accountingRef = movement.accountingRef;
    if (!accountingRef) {
      try {
        const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED, {
          movementKey,
          amount: movement.amount,
          movementType: movement.movementType,
          sourceModule: 'treasury',
        }, userId);
        if (entry && typeof entry === 'object' && 'entryKey' in entry) {
          accountingRef = String(entry.entryKey);
        }
      } catch {
        const lines = this.buildJournalLines(movement);
        const entry = await this.engine.createEntry(organizationId, userId, {
          sourceModule: 'treasury',
          sourceDocumentType: movement.movementType,
          sourceDocumentKey: movementKey,
          description: movement.description,
          entryDate: movement.movementDate.toISOString().slice(0, 10),
          lines,
          autoPost: true,
        });
        accountingRef = entry.entryKey;
      }
    }

    await this.updateBalances(organizationId, movement);

    const updated = await this.prisma.efmTrMovement.update({
      where: { id: movement.id },
      data: { status: 'processed', processedAt: new Date(), accountingRef, approvedBy: userId },
    });

    await this.audit.log(organizationId, 'EfmTrMovement', movementKey, 'processed', userId, { accountingRef });
    await this.core.emitUserAction(organizationId, 'EfmTrMovement', movementKey, EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED, {
      accountingRef,
    });
    return updated;
  }

  private buildJournalLines(movement: {
    movementType: string; amount: number; bankAccountKey?: string | null; cashBoxKey?: string | null;
    fromAccountKey?: string | null; toAccountKey?: string | null;
  }) {
    const amt = movement.amount;
    switch (movement.movementType) {
      case 'deposit':
      case 'ar_collection':
        return [
          { accountKey: 'ACC-1110', debit: amt, credit: 0 },
          { accountKey: 'ACC-1305', debit: 0, credit: amt },
        ];
      case 'withdrawal':
      case 'ap_payment':
        return [
          { accountKey: 'ACC-2205', debit: amt, credit: 0 },
          { accountKey: 'ACC-1110', debit: 0, credit: amt },
        ];
      case 'transfer':
        return [
          { accountKey: 'ACC-1110', debit: amt, credit: 0 },
          { accountKey: 'ACC-1110', debit: 0, credit: amt },
        ];
      case 'internal':
        return [
          { accountKey: 'ACC-1105', debit: amt, credit: 0 },
          { accountKey: 'ACC-1110', debit: 0, credit: amt },
        ];
      default:
        return [
          { accountKey: 'ACC-1110', debit: amt, credit: 0 },
          { accountKey: 'ACC-1105', debit: 0, credit: amt },
        ];
    }
  }

  private async updateBalances(organizationId: string, movement: {
    movementType: string; amount: number; bankAccountKey?: string | null; cashBoxKey?: string | null;
    fromAccountKey?: string | null; toAccountKey?: string | null;
    fromCashBoxKey?: string | null; toCashBoxKey?: string | null;
  }) {
    const delta = (type: string) => {
      if (['deposit', 'ar_collection', 'transfer'].includes(type) && movement.toAccountKey) return movement.amount;
      if (['withdrawal', 'ap_payment'].includes(type)) return -movement.amount;
      if (type === 'deposit') return movement.amount;
      if (type === 'withdrawal') return -movement.amount;
      return 0;
    };

    if (movement.bankAccountKey) {
      const d = delta(movement.movementType);
      if (d !== 0) {
        await this.prisma.efmTrBankAccount.update({
          where: { organizationId_accountKey: { organizationId, accountKey: movement.bankAccountKey } },
          data: { currentBalance: { increment: d }, availableBalance: { increment: d } },
        });
      }
    }

    if (movement.cashBoxKey) {
      const d = movement.movementType === 'deposit' ? movement.amount : -movement.amount;
      await this.prisma.efmTrCashBox.update({
        where: { organizationId_cashBoxKey: { organizationId, cashBoxKey: movement.cashBoxKey } },
        data: { currentBalance: { increment: d } },
      });
    }

    if (movement.fromAccountKey && movement.toAccountKey) {
      await this.prisma.efmTrBankAccount.update({
        where: { organizationId_accountKey: { organizationId, accountKey: movement.fromAccountKey } },
        data: { currentBalance: { decrement: movement.amount }, availableBalance: { decrement: movement.amount } },
      });
      await this.prisma.efmTrBankAccount.update({
        where: { organizationId_accountKey: { organizationId, accountKey: movement.toAccountKey } },
        data: { currentBalance: { increment: movement.amount }, availableBalance: { increment: movement.amount } },
      });
    }
  }

  async voidMovement(organizationId: string, movementKey: string, userId: string, reason: string) {
    const movement = await this.getOne(organizationId, movementKey);
    if (!movement) throw new NotFoundException(`Movimiento ${movementKey} no encontrado`);
    const updated = await this.prisma.efmTrMovement.update({
      where: { id: movement.id },
      data: { status: 'voided', observations: reason },
    });
    await this.audit.log(organizationId, 'EfmTrMovement', movementKey, 'voided', userId, { reason });
    return updated;
  }
}
