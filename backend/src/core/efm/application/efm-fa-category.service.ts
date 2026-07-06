import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_FA_CATEGORIES } from '../domain/efm-fixed-assets.engine';

@Injectable()
export class EfmFaCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmFaCategory.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async upsert(organizationId: string, userId: string, input: {
    categoryKey?: string;
    code: string;
    name: string;
    assetClass: string;
    isIntangible?: boolean;
    defaultDepreciationMethod?: string;
    defaultUsefulLifeMonths?: number;
    defaultResidualPercent?: number;
    assetAccountKey?: string;
    depreciationAccountKey?: string;
    expenseAccountKey?: string;
  }) {
    const categoryKey = input.categoryKey ?? `CAT-${input.code.toUpperCase()}`;
    const row = await this.prisma.efmFaCategory.upsert({
      where: { organizationId_categoryKey: { organizationId, categoryKey } },
      create: {
        organizationId,
        categoryKey,
        code: input.code,
        name: input.name,
        assetClass: input.assetClass as never,
        isIntangible: input.isIntangible ?? false,
        defaultDepreciationMethod: (input.defaultDepreciationMethod ?? 'straight_line') as never,
        defaultUsefulLifeMonths: input.defaultUsefulLifeMonths ?? 60,
        defaultResidualPercent: input.defaultResidualPercent ?? 0,
        assetAccountKey: input.assetAccountKey ?? 'ACC-1520',
        depreciationAccountKey: input.depreciationAccountKey ?? 'ACC-1592',
        expenseAccountKey: input.expenseAccountKey ?? 'ACC-5160',
      },
      update: {
        name: input.name,
        assetClass: input.assetClass as never,
        isIntangible: input.isIntangible,
        defaultDepreciationMethod: input.defaultDepreciationMethod as never,
        defaultUsefulLifeMonths: input.defaultUsefulLifeMonths,
        defaultResidualPercent: input.defaultResidualPercent,
        assetAccountKey: input.assetAccountKey,
        depreciationAccountKey: input.depreciationAccountKey,
        expenseAccountKey: input.expenseAccountKey,
      },
    });
    await this.audit.log(organizationId, 'EfmFaCategory', categoryKey, 'upserted', userId);
    return row;
  }

  async seed(organizationId: string, userId: string) {
    for (const cat of DEFAULT_FA_CATEGORIES) {
      await this.prisma.efmFaCategory.upsert({
        where: { organizationId_categoryKey: { organizationId, categoryKey: cat.categoryKey } },
        create: {
          organizationId,
          categoryKey: cat.categoryKey,
          code: cat.code,
          name: cat.name,
          assetClass: cat.assetClass as never,
          isIntangible: 'isIntangible' in cat ? Boolean(cat.isIntangible) : false,
          defaultDepreciationMethod: 'straight_line',
          defaultUsefulLifeMonths: cat.defaultUsefulLifeMonths,
          defaultResidualPercent: cat.defaultResidualPercent,
          assetAccountKey: cat.assetClass === 'intangible' ? 'ACC-1610' : 'ACC-1520',
          depreciationAccountKey: cat.assetClass === 'intangible' ? 'ACC-1620' : 'ACC-1592',
          expenseAccountKey: cat.assetClass === 'intangible' ? 'ACC-5165' : 'ACC-5160',
        },
        update: {},
      });
    }
    await this.audit.log(organizationId, 'EfmFaCategory', 'seed', 'completed', userId);
    return this.list(organizationId);
  }
}
