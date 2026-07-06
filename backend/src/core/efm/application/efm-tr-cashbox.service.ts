import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { computeCashCountDifference, generateTrKey } from '../domain/efm-treasury.engine';

@Injectable()
export class EfmTrCashboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmTrCashBox.findMany({
      where: { organizationId, isActive: true },
      include: { sessions: { where: { status: 'open' }, take: 1 } },
      orderBy: { code: 'asc' },
    });
  }

  async upsert(organizationId: string, userId: string, input: {
    cashBoxKey?: string; code: string; name: string; cashBoxType?: string;
    currencyKey?: string; companyKey?: string; maxBalance?: number; custodianUserId?: string;
  }) {
    const cashBoxKey = input.cashBoxKey ?? generateTrKey('CBX', (await this.prisma.efmTrCashBox.count({ where: { organizationId } })) + 1);
    const row = await this.prisma.efmTrCashBox.upsert({
      where: { organizationId_cashBoxKey: { organizationId, cashBoxKey } },
      update: {
        code: input.code, name: input.name,
        cashBoxType: (input.cashBoxType ?? 'general') as never,
        currencyKey: input.currencyKey ?? 'COP',
        companyKey: input.companyKey,
        maxBalance: input.maxBalance ?? 0,
        custodianUserId: input.custodianUserId,
      },
      create: {
        organizationId, cashBoxKey, code: input.code, name: input.name,
        cashBoxType: (input.cashBoxType ?? 'general') as never,
        currencyKey: input.currencyKey ?? 'COP',
        companyKey: input.companyKey,
        maxBalance: input.maxBalance ?? 0,
        custodianUserId: input.custodianUserId,
      },
    });
    await this.audit.log(organizationId, 'EfmTrCashBox', cashBoxKey, 'upserted', userId);
    return row;
  }

  async openSession(organizationId: string, userId: string, cashBoxKey: string, openingBalance: number) {
    const existing = await this.prisma.efmTrCashSession.findFirst({
      where: { organizationId, cashBoxKey, status: 'open' },
    });
    if (existing) throw new BadRequestException('Caja ya tiene sesión abierta');

    const sessionKey = generateTrKey('CSN', (await this.prisma.efmTrCashSession.count({ where: { organizationId } })) + 1);
    const session = await this.prisma.efmTrCashSession.create({
      data: {
        organizationId, sessionKey, cashBoxKey, openingBalance, openedBy: userId, openedAt: new Date(),
      },
    });
    await this.audit.log(organizationId, 'EfmTrCashSession', sessionKey, 'opened', userId, { openingBalance });
    return session;
  }

  async closeSession(organizationId: string, userId: string, sessionKey: string, closingBalance: number, observations?: string) {
    const session = await this.prisma.efmTrCashSession.findFirst({ where: { organizationId, sessionKey } });
    if (!session) throw new NotFoundException(`Sesión ${sessionKey} no encontrada`);
    if (session.status !== 'open') throw new BadRequestException('Sesión no está abierta');

    const movements = await this.prisma.efmTrMovement.findMany({
      where: { organizationId, cashBoxKey: session.cashBoxKey, status: 'processed', processedAt: { gte: session.openedAt } },
    });
    const net = movements.reduce((s, m) => {
      if (m.movementType === 'deposit' || m.movementType === 'ar_collection') return s + m.amount;
      if (m.movementType === 'withdrawal' || m.movementType === 'ap_payment') return s - m.amount;
      return s;
    }, 0);
    const expected = session.openingBalance + net;
    const difference = computeCashCountDifference(closingBalance, expected);

    const updated = await this.prisma.efmTrCashSession.update({
      where: { id: session.id },
      data: {
        status: Math.abs(difference) > 0.01 ? 'pending_approval' : 'closed',
        closingBalance,
        expectedBalance: expected,
        differenceAmount: difference,
        closedAt: new Date(),
        closedBy: userId,
        observations,
      },
    });

    if (Math.abs(difference) <= 0.01) {
      await this.prisma.efmTrCashBox.update({
        where: { organizationId_cashBoxKey: { organizationId, cashBoxKey: session.cashBoxKey } },
        data: { currentBalance: closingBalance },
      });
    }

    await this.audit.log(organizationId, 'EfmTrCashSession', sessionKey, 'closed', userId, { difference });
    return updated;
  }

  async submitCount(organizationId: string, userId: string, sessionKey: string, input: {
    countedAmount: number; denominations?: Record<string, unknown>;
  }) {
    const session = await this.prisma.efmTrCashSession.findFirst({ where: { organizationId, sessionKey } });
    if (!session) throw new NotFoundException(`Sesión ${sessionKey} no encontrada`);

    const expected = session.expectedBalance ?? session.openingBalance;
    const countKey = generateTrKey('CNT', (await this.prisma.efmTrCashCount.count({ where: { organizationId } })) + 1);

    const count = await this.prisma.efmTrCashCount.create({
      data: {
        organizationId,
        countKey,
        sessionKey,
        sessionId: session.id,
        countedAmount: input.countedAmount,
        expectedAmount: expected,
        differenceAmount: computeCashCountDifference(input.countedAmount, expected),
        denominations: (input.denominations ?? {}) as never,
        countedBy: userId,
        status: 'submitted',
      },
    });
    await this.audit.log(organizationId, 'EfmTrCashCount', countKey, 'submitted', userId);
    return count;
  }

  async approveCount(organizationId: string, userId: string, countKey: string) {
    const count = await this.prisma.efmTrCashCount.findFirst({ where: { organizationId, countKey } });
    if (!count) throw new NotFoundException(`Arqueo ${countKey} no encontrado`);

    const updated = await this.prisma.efmTrCashCount.update({
      where: { id: count.id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });

    const session = await this.prisma.efmTrCashSession.findFirst({ where: { id: count.sessionId } });
    if (session) {
      await this.prisma.efmTrCashSession.update({
        where: { id: session.id },
        data: { status: 'closed', approvedBy: userId, closingBalance: count.countedAmount },
      });
      await this.prisma.efmTrCashBox.update({
        where: { organizationId_cashBoxKey: { organizationId, cashBoxKey: session.cashBoxKey } },
        data: { currentBalance: count.countedAmount },
      });
    }

    await this.audit.log(organizationId, 'EfmTrCashCount', countKey, 'approved', userId);
    return updated;
  }

  async seed(organizationId: string, userId: string) {
    await this.upsert(organizationId, userId, { code: 'CAJA-GEN', name: 'Caja general', cashBoxType: 'general' });
    await this.upsert(organizationId, userId, { code: 'CAJA-MEN', name: 'Caja menor', cashBoxType: 'petty', maxBalance: 5000000 });
    return this.list(organizationId);
  }
}
