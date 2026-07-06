import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import { DEFAULT_TAX_RULES_SEED, resolveWithholdingRate } from '../domain/escm-billing.engine';
import { resolveTaxRate } from '../domain/escm-quotation.engine';

export type TaxResolutionContext = {
  itemKey?: string;
  customerKey?: string;
  countryCode?: string;
  taxKey?: string;
  withholdingKey?: string;
};

@Injectable()
export class EscmTaxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, filters?: { ruleType?: string; isActive?: boolean }) {
    return this.prisma.escmTaxRule.findMany({
      where: {
        organizationId,
        ...(filters?.ruleType ? { ruleType: filters.ruleType } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: [{ priority: 'asc' }, { ruleKey: 'asc' }],
      take: 500,
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      ruleKey: string;
      ruleType: string;
      name: string;
      itemKey?: string;
      customerKey?: string;
      countryCode?: string;
      taxKey?: string;
      rate?: number;
      isExempt?: boolean;
      isActive?: boolean;
      priority?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const row = await this.prisma.escmTaxRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey: input.ruleKey } },
      create: {
        organizationId,
        ruleKey: input.ruleKey,
        ruleType: input.ruleType,
        name: input.name,
        itemKey: input.itemKey,
        customerKey: input.customerKey,
        countryCode: input.countryCode,
        taxKey: input.taxKey,
        rate: input.rate ?? 0,
        isExempt: input.isExempt ?? false,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 50,
        metadata: (input.metadata ?? {}) as object,
      },
      update: {
        ruleType: input.ruleType,
        name: input.name,
        itemKey: input.itemKey,
        customerKey: input.customerKey,
        countryCode: input.countryCode,
        taxKey: input.taxKey,
        rate: input.rate ?? 0,
        isExempt: input.isExempt ?? false,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 50,
        metadata: (input.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'TaxRule', input.ruleKey, 'upserted', userId);
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const created: string[] = [];
    for (const seed of DEFAULT_TAX_RULES_SEED) {
      await this.upsert(organizationId, userId, {
        ruleKey: seed.ruleKey,
        ruleType: seed.ruleType,
        name: seed.name,
        taxKey: seed.taxKey,
        rate: seed.rate,
        isExempt: 'isExempt' in seed ? Boolean(seed.isExempt) : false,
        priority: seed.priority,
      });
      created.push(seed.ruleKey);
    }
    return { created };
  }

  async resolveRates(organizationId: string, ctx: TaxResolutionContext) {
    const rules = await this.prisma.escmTaxRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    const match = (predicates: Array<(r: (typeof rules)[0]) => boolean>) =>
      rules.find((r) => predicates.every((p) => p(r)));

    const ivaRule =
      match([
        (r) => r.ruleType === 'iva' || r.ruleType === 'exempt',
        (r) => !ctx.itemKey || !r.itemKey || r.itemKey === ctx.itemKey,
        (r) => !ctx.customerKey || !r.customerKey || r.customerKey === ctx.customerKey,
        (r) => !ctx.countryCode || !r.countryCode || r.countryCode === ctx.countryCode,
      ]) ??
      match([(r) => r.ruleType === 'iva' || r.ruleType === 'exempt']);

    const whRule = match([
      (r) => r.ruleType === 'withholding',
      (r) => !ctx.customerKey || !r.customerKey || r.customerKey === ctx.customerKey,
    ]);

    const taxKey = ctx.taxKey ?? ivaRule?.taxKey ?? 'iva_19';
    const taxRate = ivaRule?.isExempt ? 0 : (ivaRule?.rate ?? resolveTaxRate(taxKey));
    const withholdingKey = ctx.withholdingKey ?? whRule?.taxKey ?? undefined;
    const withholdingRate = whRule?.rate ?? resolveWithholdingRate(withholdingKey);

    return { taxKey, taxRate, withholdingKey, withholdingRate, isExempt: ivaRule?.isExempt ?? false };
  }

  async getOne(organizationId: string, ruleKey: string) {
    const row = await this.prisma.escmTaxRule.findFirst({ where: { organizationId, ruleKey } });
    if (!row) throw new NotFoundException(`Regla fiscal ${ruleKey} no encontrada`);
    return row;
  }
}
