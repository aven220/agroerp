import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmTrBankService } from './efm-tr-bank.service';
import { EfmTrCashboxService } from './efm-tr-cashbox.service';
import { EfmTrReconciliationService } from './efm-tr-reconciliation.service';

@Injectable()
export class EfmTrCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly banks: EfmTrBankService,
    private readonly cashboxes: EfmTrCashboxService,
    private readonly reconciliation: EfmTrReconciliationService,
  ) {}

  async center(organizationId: string) {
    const [
      bankCount,
      accountCount,
      cashBoxCount,
      openSessions,
      movementCount,
      pendingReconciliations,
      liquidityAlerts,
      totalBankBalance,
      totalCashBalance,
      recentMovements,
    ] = await Promise.all([
      this.prisma.efmTrBank.count({ where: { organizationId, isActive: true } }),
      this.prisma.efmTrBankAccount.count({ where: { organizationId, isActive: true } }),
      this.prisma.efmTrCashBox.count({ where: { organizationId, isActive: true } }),
      this.prisma.efmTrCashSession.count({ where: { organizationId, status: 'open' } }),
      this.prisma.efmTrMovement.count({ where: { organizationId, status: 'processed' } }),
      this.prisma.efmTrReconciliation.count({ where: { organizationId, status: { in: ['open', 'in_progress'] } } }),
      this.prisma.efmTrLiquidityAlert.count({ where: { organizationId, isResolved: false } }),
      this.prisma.efmTrBankAccount.aggregate({ where: { organizationId, isActive: true }, _sum: { currentBalance: true } }),
      this.prisma.efmTrCashBox.aggregate({ where: { organizationId, isActive: true }, _sum: { currentBalance: true } }),
      this.prisma.efmTrMovement.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const currencies = await this.prisma.efmTrBankAccount.groupBy({
      by: ['currencyKey'],
      where: { organizationId, isActive: true },
      _sum: { currentBalance: true },
    });

    return {
      bankCount,
      accountCount,
      cashBoxCount,
      openSessions,
      movementCount,
      pendingReconciliations,
      liquidityAlerts,
      totalBankBalance: totalBankBalance._sum.currentBalance ?? 0,
      totalCashBalance: totalCashBalance._sum.currentBalance ?? 0,
      totalLiquidity: (totalBankBalance._sum.currentBalance ?? 0) + (totalCashBalance._sum.currentBalance ?? 0),
      balancesByCurrency: currencies.map((c) => ({
        currencyKey: c.currencyKey,
        balance: c._sum.currentBalance ?? 0,
      })),
      recentMovements,
    };
  }

  async seed(organizationId: string, userId: string) {
    await this.banks.seed(organizationId, userId);
    await this.cashboxes.seed(organizationId, userId);
    await this.reconciliation.seedRules(organizationId, userId);

    const bankList = await this.banks.listBanks(organizationId);
    const mainBank = bankList[0];
    if (mainBank) {
      const existing = await this.prisma.efmTrBankAccount.findFirst({
        where: { organizationId, bankKey: mainBank.bankKey },
      });
      if (!existing) {
        await this.banks.upsertAccount(organizationId, userId, {
          bankKey: mainBank.bankKey,
          accountNumber: '000123456789',
          accountType: 'checking',
          currencyKey: 'COP',
        });
      }
    }

    await this.audit.log(organizationId, 'EfmTrConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }
}
