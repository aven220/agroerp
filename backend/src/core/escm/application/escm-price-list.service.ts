import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  applyDiscountPct,
  applyPromotion,
  checkCreditAvailable,
  generateConditionKey,
  generatePriceListKey,
  isWithinSeason,
  resolveUnitPrice,
  selectBestDiscount,
  type PriceCandidate,
} from '../domain/escm-pricing.engine';

@Injectable()
export class EscmPriceListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, all = false) {
    return this.prisma.escmPriceList.findMany({
      where: { organizationId, ...(all ? {} : { isActive: true }) },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(organizationId: string, priceListKey: string) {
    const row = await this.prisma.escmPriceList.findFirst({
      where: { organizationId, priceListKey },
      include: { items: { orderBy: { itemKey: 'asc' } } },
    });
    if (!row) throw new NotFoundException(`Lista ${priceListKey} no encontrada`);
    return row;
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      priceListKey?: string;
      name: string;
      currencyKey?: string;
      validFrom?: string;
      validTo?: string;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    const count = await this.prisma.escmPriceList.count({ where: { organizationId } });
    const priceListKey = input.priceListKey ?? generatePriceListKey(input.name, count + 1);
    if (input.isDefault) {
      await this.prisma.escmPriceList.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }
    const row = await this.prisma.escmPriceList.upsert({
      where: { organizationId_priceListKey: { organizationId, priceListKey } },
      update: {
        name: input.name,
        currencyKey: input.currencyKey ?? 'COP',
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        priceListKey,
        name: input.name,
        currencyKey: input.currencyKey ?? 'COP',
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
        isDefault: input.isDefault ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'PriceList', priceListKey, 'upsert', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EscmPriceList',
      row.id,
      EVENT_TYPES.ESCM_PRICE_LIST_UPDATED,
      { priceListKey },
    );
    return row;
  }

  async upsertItem(
    organizationId: string,
    userId: string,
    priceListKey: string,
    input: {
      itemKey: string;
      unitPrice: number;
      minQty?: number;
      uomKey?: string;
      taxKey?: string;
    },
  ) {
    const list = await this.getOne(organizationId, priceListKey);
    const row = await this.prisma.escmPriceListItem.upsert({
      where: {
        priceListId_itemKey_minQty: {
          priceListId: list.id,
          itemKey: input.itemKey,
          minQty: input.minQty ?? 1,
        },
      },
      update: {
        unitPrice: input.unitPrice,
        uomKey: input.uomKey,
        taxKey: input.taxKey,
      },
      create: {
        priceListId: list.id,
        itemKey: input.itemKey,
        unitPrice: input.unitPrice,
        minQty: input.minQty ?? 1,
        uomKey: input.uomKey,
        taxKey: input.taxKey,
      },
    });
    await this.audit.log(organizationId, 'PriceListItem', `${priceListKey}:${input.itemKey}`, 'upsert', userId, {
      unitPrice: input.unitPrice,
    });
    await this.core.emitUserAction(
      organizationId,
      'EscmPriceListItem',
      row.id,
      EVENT_TYPES.ESCM_PRICE_CHANGED,
      { priceListKey, itemKey: input.itemKey, unitPrice: input.unitPrice },
    );
    return row;
  }

  async resolvePrice(
    organizationId: string,
    input: {
      customerKey?: string;
      itemKey: string;
      regionKey?: string;
      quantity?: number;
    },
  ) {
    const candidates: PriceCandidate[] = [];
    let customer = null;
    if (input.customerKey) {
      customer = await this.prisma.escmCustomer.findFirst({
        where: { organizationId, customerKey: input.customerKey, deletedAt: null },
        include: { pricings: { where: { itemKey: input.itemKey, isActive: true } } },
      });
      for (const p of customer?.pricings ?? []) {
        candidates.push({ source: 'customer', unitPrice: p.unitPrice, priority: 10 });
      }
    }
    const regionKey = input.regionKey ?? customer?.regionKey;
    if (regionKey) {
      const regional = await this.prisma.escmRegionalPricing.findFirst({
        where: { organizationId, regionKey, itemKey: input.itemKey, isActive: true },
      });
      if (regional) candidates.push({ source: 'region', unitPrice: regional.unitPrice, priority: 20 });
    }
    const seasons = await this.prisma.escmSeasonPricing.findMany({
      where: { organizationId, itemKey: input.itemKey, isActive: true },
    });
    for (const s of seasons) {
      if (isWithinSeason(s.validFrom, s.validTo)) {
        candidates.push({ source: 'season', unitPrice: s.unitPrice, priority: 30 });
      }
    }
    const priceListKey = customer?.priceListKey;
    const defaultList = priceListKey
      ? await this.prisma.escmPriceList.findFirst({ where: { organizationId, priceListKey } })
      : await this.prisma.escmPriceList.findFirst({ where: { organizationId, isDefault: true, isActive: true } });
    if (defaultList) {
      const item = await this.prisma.escmPriceListItem.findFirst({
        where: {
          priceListId: defaultList.id,
          itemKey: input.itemKey,
          minQty: { lte: input.quantity ?? 1 },
        },
        orderBy: { minQty: 'desc' },
      });
      if (item) candidates.push({ source: 'price_list', unitPrice: item.unitPrice, priority: 40 });
    }
    let unitPrice = resolveUnitPrice(candidates);
    if (unitPrice == null) return { itemKey: input.itemKey, unitPrice: null, finalPrice: null };

    const rules = await this.prisma.escmDiscountRule.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { customerKey: input.customerKey ?? undefined },
          { segmentKey: customer?.segmentKey ?? undefined },
          { itemKey: input.itemKey },
        ],
      },
    });
    const discountPct = selectBestDiscount(rules);
    unitPrice = applyDiscountPct(unitPrice, discountPct);

    const now = new Date();
    const promo = await this.prisma.escmPromotion.findFirst({
      where: {
        organizationId,
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
        OR: [{ itemKey: input.itemKey }, { itemKey: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
    const finalPrice = applyPromotion(unitPrice, promo ?? undefined);

    return {
      itemKey: input.itemKey,
      unitPrice,
      discountPct,
      finalPrice,
      sources: candidates.map((c) => c.source),
    };
  }
}

@Injectable()
export class EscmCommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  listConditions(organizationId: string, customerKey?: string) {
    return this.prisma.escmCommercialCondition.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(customerKey ? { customerKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertCondition(
    organizationId: string,
    userId: string,
    input: {
      conditionKey?: string;
      name: string;
      customerKey?: string;
      priceListKey?: string;
      paymentTermKey?: string;
      deliveryMethodKey?: string;
      incotermKey?: string;
      discountPct?: number;
      specialTerms?: string;
      validFrom?: string;
      validTo?: string;
    },
  ) {
    const conditionKey = input.conditionKey ?? generateConditionKey(input.customerKey ?? 'GLOBAL');
    let customerId: string | undefined;
    if (input.customerKey) {
      const c = await this.prisma.escmCustomer.findFirst({
        where: { organizationId, customerKey: input.customerKey, deletedAt: null },
      });
      customerId = c?.id;
    }
    const row = await this.prisma.escmCommercialCondition.upsert({
      where: { organizationId_conditionKey: { organizationId, conditionKey } },
      update: {
        name: input.name,
        customerKey: input.customerKey,
        customerId,
        priceListKey: input.priceListKey,
        paymentTermKey: input.paymentTermKey,
        deliveryMethodKey: input.deliveryMethodKey,
        incotermKey: input.incotermKey,
        discountPct: input.discountPct ?? 0,
        specialTerms: input.specialTerms,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
      },
      create: {
        organizationId,
        conditionKey,
        name: input.name,
        customerKey: input.customerKey,
        customerId,
        priceListKey: input.priceListKey,
        paymentTermKey: input.paymentTermKey,
        deliveryMethodKey: input.deliveryMethodKey,
        incotermKey: input.incotermKey,
        discountPct: input.discountPct ?? 0,
        specialTerms: input.specialTerms,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'CommercialCondition', conditionKey, 'upsert', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EscmCommercialCondition',
      row.id,
      EVENT_TYPES.ESCM_CONDITION_UPDATED,
      { conditionKey },
    );
    return row;
  }

  listDiscountRules(organizationId: string) {
    return this.prisma.escmDiscountRule.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async upsertDiscountRule(organizationId: string, userId: string, input: Record<string, unknown>) {
    const ruleKey = (input.ruleKey as string) ?? `DISC-${Date.now()}`;
    const row = await this.prisma.escmDiscountRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey } },
      update: input as never,
      create: { organizationId, ruleKey, ...input, createdBy: userId } as never,
    });
    await this.audit.log(organizationId, 'DiscountRule', ruleKey, 'upsert', userId, input);
    return row;
  }

  listPromotions(organizationId: string) {
    return this.prisma.escmPromotion.findMany({
      where: { organizationId },
      orderBy: { validFrom: 'desc' },
    });
  }

  async upsertPromotion(organizationId: string, userId: string, input: Record<string, unknown>) {
    const promotionKey = (input.promotionKey as string) ?? `PROMO-${Date.now()}`;
    const row = await this.prisma.escmPromotion.upsert({
      where: { organizationId_promotionKey: { organizationId, promotionKey } },
      update: input as never,
      create: { organizationId, promotionKey, ...input, createdBy: userId } as never,
    });
    await this.audit.log(organizationId, 'Promotion', promotionKey, 'upsert', userId, input);
    return row;
  }

  listCreditPolicies(organizationId: string) {
    return this.prisma.escmCreditPolicy.findMany({ where: { organizationId, isActive: true } });
  }

  async upsertCreditPolicy(organizationId: string, userId: string, input: Record<string, unknown>) {
    const policyKey = (input.policyKey as string) ?? `CRPOL-${Date.now()}`;
    const row = await this.prisma.escmCreditPolicy.upsert({
      where: { organizationId_policyKey: { organizationId, policyKey } },
      update: input as never,
      create: { organizationId, policyKey, ...input, createdBy: userId } as never,
    });
    await this.audit.log(organizationId, 'CreditPolicy', policyKey, 'upsert', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EscmCreditPolicy',
      row.id,
      EVENT_TYPES.ESCM_CREDIT_POLICY_UPDATED,
      { policyKey },
    );
    return row;
  }

  async upsertCreditLimit(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: { creditLimit: number; currencyKey?: string; validFrom?: string; validTo?: string },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
    const limitKey = `LIM-${customerKey}`;
    const row = await this.prisma.escmCreditLimit.upsert({
      where: { customerId_limitKey: { customerId: customer.id, limitKey } },
      update: {
        creditLimit: input.creditLimit,
        currencyKey: input.currencyKey ?? 'COP',
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
        updatedBy: userId,
      },
      create: {
        customerId: customer.id,
        limitKey,
        creditLimit: input.creditLimit,
        currencyKey: input.currencyKey ?? 'COP',
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
        updatedBy: userId,
      },
    });
    await this.prisma.escmCustomer.update({
      where: { id: customer.id },
      data: { creditLimit: input.creditLimit },
    });
    await this.audit.log(organizationId, 'CreditLimit', limitKey, 'upsert', userId, input);
    return row;
  }

  async upsertCustomerPricing(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: { itemKey: string; unitPrice: number; currencyKey?: string },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
    const pricingKey = `CPR-${customerKey}-${input.itemKey}`;
    const row = await this.prisma.escmCustomerPricing.upsert({
      where: { customerId_itemKey: { customerId: customer.id, itemKey: input.itemKey } },
      update: {
        unitPrice: input.unitPrice,
        currencyKey: input.currencyKey ?? 'COP',
        updatedBy: userId,
      },
      create: {
        customerId: customer.id,
        pricingKey,
        itemKey: input.itemKey,
        unitPrice: input.unitPrice,
        currencyKey: input.currencyKey ?? 'COP',
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'CustomerPricing', pricingKey, 'upsert', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EscmCustomerPricing',
      row.id,
      EVENT_TYPES.ESCM_PRICE_CHANGED,
      { customerKey, itemKey: input.itemKey, unitPrice: input.unitPrice },
    );
    return row;
  }

  async upsertRegionalPricing(
    organizationId: string,
    userId: string,
    input: { regionKey: string; itemKey: string; unitPrice: number; currencyKey?: string },
  ) {
    const pricingKey = `RPR-${input.regionKey}-${input.itemKey}`;
    const row = await this.prisma.escmRegionalPricing.upsert({
      where: {
        organizationId_regionKey_itemKey: {
          organizationId,
          regionKey: input.regionKey,
          itemKey: input.itemKey,
        },
      },
      update: { unitPrice: input.unitPrice, currencyKey: input.currencyKey ?? 'COP', updatedBy: userId },
      create: {
        organizationId,
        pricingKey,
        regionKey: input.regionKey,
        itemKey: input.itemKey,
        unitPrice: input.unitPrice,
        currencyKey: input.currencyKey ?? 'COP',
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'RegionalPricing', pricingKey, 'upsert', userId, input);
    return row;
  }

  async upsertSeasonPricing(
    organizationId: string,
    userId: string,
    input: {
      seasonKey: string;
      itemKey: string;
      unitPrice: number;
      validFrom: string;
      validTo: string;
      currencyKey?: string;
    },
  ) {
    const pricingKey = `SPR-${input.seasonKey}-${input.itemKey}`;
    const row = await this.prisma.escmSeasonPricing.upsert({
      where: { organizationId_pricingKey: { organizationId, pricingKey } },
      update: {
        unitPrice: input.unitPrice,
        validFrom: new Date(input.validFrom),
        validTo: new Date(input.validTo),
        updatedBy: userId,
      },
      create: {
        organizationId,
        pricingKey,
        seasonKey: input.seasonKey,
        itemKey: input.itemKey,
        unitPrice: input.unitPrice,
        validFrom: new Date(input.validFrom),
        validTo: new Date(input.validTo),
        currencyKey: input.currencyKey ?? 'COP',
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'SeasonPricing', pricingKey, 'upsert', userId, input);
    return row;
  }

  validateCredit(organizationId: string, customerKey: string, amount: number) {
    return this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    }).then((c) => {
      if (!c) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
      const limit = c.creditLimit ?? 0;
      const ok = checkCreditAvailable(limit, c.creditUsed, amount);
      if (!ok) throw new BadRequestException('Crédito insuficiente');
      return { customerKey, creditLimit: limit, creditUsed: c.creditUsed, available: limit - c.creditUsed };
    });
  }
}
