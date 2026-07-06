import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_BANKS, generateTrKey } from '../domain/efm-treasury.engine';

@Injectable()
export class EfmTrBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  listBanks(organizationId: string) {
    return this.prisma.efmTrBank.findMany({
      where: { organizationId, isActive: true },
      include: { accounts: { where: { isActive: true } }, branches: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsertBank(organizationId: string, userId: string, input: {
    bankKey?: string; code: string; name: string; countryCode?: string; swiftCode?: string;
  }) {
    const bankKey = input.bankKey ?? generateTrKey('BANK', (await this.prisma.efmTrBank.count({ where: { organizationId } })) + 1);
    const row = await this.prisma.efmTrBank.upsert({
      where: { organizationId_bankKey: { organizationId, bankKey } },
      update: { code: input.code, name: input.name, countryCode: input.countryCode ?? 'CO', swiftCode: input.swiftCode },
      create: { organizationId, bankKey, code: input.code, name: input.name, countryCode: input.countryCode ?? 'CO', swiftCode: input.swiftCode },
    });
    await this.audit.log(organizationId, 'EfmTrBank', bankKey, 'upserted', userId);
    return row;
  }

  listAccounts(organizationId: string, filters?: { bankKey?: string; currencyKey?: string }) {
    return this.prisma.efmTrBankAccount.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(filters?.bankKey ? { bankKey: filters.bankKey } : {}),
        ...(filters?.currencyKey ? { currencyKey: filters.currencyKey } : {}),
      },
      include: { bank: true, signers: { where: { isActive: true } } },
      orderBy: { accountNumber: 'asc' },
    });
  }

  async upsertAccount(organizationId: string, userId: string, input: {
    accountKey?: string; bankKey: string; branchKey?: string; accountNumber: string;
    accountType?: string; currencyKey?: string; companyKey?: string; glAccountKey?: string;
  }) {
    const accountKey = input.accountKey ?? generateTrKey('BAC', (await this.prisma.efmTrBankAccount.count({ where: { organizationId } })) + 1);
    const row = await this.prisma.efmTrBankAccount.upsert({
      where: { organizationId_accountKey: { organizationId, accountKey } },
      update: {
        bankKey: input.bankKey,
        branchKey: input.branchKey,
        accountNumber: input.accountNumber,
        accountType: (input.accountType ?? 'checking') as never,
        currencyKey: input.currencyKey ?? 'COP',
        companyKey: input.companyKey,
        glAccountKey: input.glAccountKey ?? 'ACC-1110',
      },
      create: {
        organizationId,
        accountKey,
        bankKey: input.bankKey,
        branchKey: input.branchKey,
        accountNumber: input.accountNumber,
        accountType: (input.accountType ?? 'checking') as never,
        currencyKey: input.currencyKey ?? 'COP',
        companyKey: input.companyKey,
        glAccountKey: input.glAccountKey ?? 'ACC-1110',
      },
    });
    await this.audit.log(organizationId, 'EfmTrBankAccount', accountKey, 'upserted', userId);
    return row;
  }

  async addSigner(organizationId: string, userId: string, input: {
    accountKey: string; fullName: string; userId?: string; roleKey?: string; maxAmount?: number;
  }) {
    const signerKey = generateTrKey('SIGN', (await this.prisma.efmTrBankSigner.count({ where: { organizationId } })) + 1);
    const row = await this.prisma.efmTrBankSigner.create({
      data: {
        organizationId,
        accountKey: input.accountKey,
        signerKey,
        userId: input.userId,
        fullName: input.fullName,
        roleKey: input.roleKey,
        maxAmount: input.maxAmount,
      },
    });
    await this.audit.log(organizationId, 'EfmTrBankSigner', signerKey, 'created', userId);
    return row;
  }

  async addBranch(organizationId: string, bankKey: string, input: { code: string; name: string; city?: string }) {
    const branchKey = generateTrKey('BR', (await this.prisma.efmTrBankBranch.count({ where: { organizationId } })) + 1);
    return this.prisma.efmTrBankBranch.create({
      data: { organizationId, bankKey, branchKey, code: input.code, name: input.name, city: input.city },
    });
  }

  async seed(organizationId: string, userId: string) {
    for (const b of DEFAULT_BANKS) {
      await this.upsertBank(organizationId, userId, b);
    }
    return this.listBanks(organizationId);
  }

  getBalances(organizationId: string) {
    return this.prisma.efmTrBankAccount.findMany({
      where: { organizationId, isActive: true },
      select: {
        accountKey: true, accountNumber: true, accountType: true, currencyKey: true,
        currentBalance: true, availableBalance: true, bank: { select: { name: true, code: true } },
      },
    });
  }
}
