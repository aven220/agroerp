import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  canTransitionStatus,
  classifyCustomer,
  generateAddressKey,
  generateContactKey,
  generateCustomerKey,
  generateHistoryKey,
  generateVisitKey,
  mergeOfflineVisits,
  validateCustomerInput,
  type EscmCustomerStatusValue,
  type EscmCustomerTypeValue,
} from '../domain/escm-customer.engine';

@Injectable()
export class EscmCustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  private readonly includeRelations = {
    contacts: { where: { isActive: true }, orderBy: { isPrimary: 'desc' as const } },
    addresses: { where: { isActive: true }, orderBy: { isPrimary: 'desc' as const } },
    communications: { orderBy: { isPrimary: 'desc' as const } },
    customerNotes: { orderBy: { createdAt: 'desc' as const }, take: 30 },
    creditLimits: { where: { isActive: true } },
    purchaseHistories: { orderBy: { purchasedAt: 'desc' as const }, take: 50 },
    visits: { orderBy: { visitedAt: 'desc' as const }, take: 30 },
    pricings: { where: { isActive: true } },
    conditions: { where: { isActive: true } },
  };

  list(
    organizationId: string,
    filters?: {
      status?: string;
      customerType?: string;
      segmentKey?: string;
      channelKey?: string;
      q?: string;
      classification?: string;
    },
  ) {
    return this.prisma.escmCustomer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerType ? { customerType: filters.customerType as never } : {}),
        ...(filters?.segmentKey ? { segmentKey: filters.segmentKey } : {}),
        ...(filters?.channelKey ? { channelKey: filters.channelKey } : {}),
        ...(filters?.classification ? { classification: filters.classification } : {}),
        ...(filters?.q
          ? {
              OR: [
                { legalName: { contains: filters.q, mode: 'insensitive' } },
                { commercialName: { contains: filters.q, mode: 'insensitive' } },
                { customerKey: { contains: filters.q, mode: 'insensitive' } },
                { documentNumber: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, customerKey: string) {
    const row = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
      include: this.includeRelations,
    });
    if (!row) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);
    return {
      ...row,
      computedClassification: classifyCustomer({
        lifetimeValue: row.lifetimeValue,
        lastPurchaseAt: row.lastPurchaseAt,
        status: row.status as EscmCustomerStatusValue,
      }),
    };
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      customerType: EscmCustomerTypeValue;
      status?: EscmCustomerStatusValue;
      legalName: string;
      commercialName?: string;
      documentType?: string;
      documentNumber?: string;
      taxId?: string;
      segmentKey?: string;
      channelKey?: string;
      classification?: string;
      countryCode?: string;
      regionKey?: string;
      municipalityCode?: string;
      currencyKey?: string;
      priceListKey?: string;
      paymentTermKey?: string;
      deliveryMethodKey?: string;
      incotermKey?: string;
      creditLimit?: number;
      assignedUserId?: string;
      notes?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const err = validateCustomerInput(input);
    if (err) throw new BadRequestException(err);
    const count = await this.prisma.escmCustomer.count({ where: { organizationId } });
    const customerKey = generateCustomerKey(input.customerType, count + 1);
    const row = await this.prisma.escmCustomer.create({
      data: {
        organizationId,
        customerKey,
        customerType: input.customerType,
        status: input.status ?? 'prospect',
        legalName: input.legalName,
        commercialName: input.commercialName,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        taxId: input.taxId,
        customerTypeKey: input.customerType,
        segmentKey: input.segmentKey,
        channelKey: input.channelKey,
        classification: input.classification,
        countryCode: input.countryCode ?? 'CO',
        regionKey: input.regionKey,
        municipalityCode: input.municipalityCode,
        currencyKey: input.currencyKey ?? 'COP',
        priceListKey: input.priceListKey,
        paymentTermKey: input.paymentTermKey,
        deliveryMethodKey: input.deliveryMethodKey,
        incotermKey: input.incotermKey,
        creditLimit: input.creditLimit,
        assignedUserId: input.assignedUserId,
        notes: input.notes,
        tags: input.tags ?? [],
        metadata: (input.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Customer', customerKey, 'created', userId, {
      customerType: input.customerType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EscmCustomer',
      row.id,
      EVENT_TYPES.ESCM_CUSTOMER_CREATED,
      { customerKey, customerType: input.customerType },
    );
    return row;
  }

  async update(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: Record<string, unknown>,
  ) {
    const existing = await this.getOne(organizationId, customerKey);
    if (input.status && input.status !== existing.status) {
      if (
        !canTransitionStatus(
          existing.status as EscmCustomerStatusValue,
          input.status as EscmCustomerStatusValue,
        )
      ) {
        throw new BadRequestException(`Transición de estado inválida: ${existing.status} → ${input.status}`);
      }
    }
    const row = await this.prisma.escmCustomer.update({
      where: { id: existing.id },
      data: {
        ...(input.legalName ? { legalName: String(input.legalName) } : {}),
        ...(input.commercialName !== undefined ? { commercialName: input.commercialName as string } : {}),
        ...(input.status ? { status: input.status as never } : {}),
        ...(input.segmentKey !== undefined ? { segmentKey: input.segmentKey as string } : {}),
        ...(input.channelKey !== undefined ? { channelKey: input.channelKey as string } : {}),
        ...(input.classification !== undefined ? { classification: input.classification as string } : {}),
        ...(input.priceListKey !== undefined ? { priceListKey: input.priceListKey as string } : {}),
        ...(input.paymentTermKey !== undefined ? { paymentTermKey: input.paymentTermKey as string } : {}),
        ...(input.creditLimit !== undefined ? { creditLimit: Number(input.creditLimit) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes as string } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    await this.audit.log(organizationId, 'Customer', customerKey, 'updated', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EscmCustomer',
      row.id,
      EVENT_TYPES.ESCM_CUSTOMER_UPDATED,
      { customerKey },
    );
    return row;
  }

  async addContact(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: {
      firstName: string;
      lastName?: string;
      jobTitle?: string;
      email?: string;
      phone?: string;
      mobile?: string;
      isPrimary?: boolean;
    },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    const seq = customer.contacts.length + 1;
    const contactKey = generateContactKey(customerKey, seq);
    if (input.isPrimary) {
      await this.prisma.escmCustomerContact.updateMany({
        where: { customerId: customer.id },
        data: { isPrimary: false },
      });
    }
    return this.prisma.escmCustomerContact.create({
      data: {
        customerId: customer.id,
        contactKey,
        ...input,
      },
    });
  }

  async addAddress(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: {
      addressType?: string;
      line1: string;
      line2?: string;
      city?: string;
      regionKey?: string;
      countryCode?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      isPrimary?: boolean;
    },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    const seq = customer.addresses.length + 1;
    const addressKey = generateAddressKey(customerKey, input.addressType ?? 'billing', seq);
    if (input.isPrimary) {
      await this.prisma.escmCustomerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isPrimary: false },
      });
    }
    return this.prisma.escmCustomerAddress.create({
      data: {
        customerId: customer.id,
        addressKey,
        addressType: input.addressType ?? 'billing',
        ...input,
      },
    });
  }

  async addCommunication(
    organizationId: string,
    customerKey: string,
    input: { commType: string; value: string; label?: string; isPrimary?: boolean },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    return this.prisma.escmCustomerCommunication.create({
      data: { customerId: customer.id, ...input },
    });
  }

  async addNote(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: { title?: string; content: string },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    const noteKey = `NOTE-${customerKey}-${Date.now()}`;
    return this.prisma.escmCustomerNote.create({
      data: {
        customerId: customer.id,
        noteKey,
        title: input.title,
        content: input.content,
        createdBy: userId,
      },
    });
  }

  async recordVisit(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: {
      visitedAt?: string;
      purpose?: string;
      outcome?: string;
      latitude?: number;
      longitude?: number;
      offline?: boolean;
      visitKey?: string;
    },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    const visitKey = input.visitKey ?? generateVisitKey(customerKey);
    const row = await this.prisma.escmCustomerVisit.create({
      data: {
        organizationId,
        customerId: customer.id,
        visitKey,
        visitedAt: input.visitedAt ? new Date(input.visitedAt) : new Date(),
        purpose: input.purpose,
        outcome: input.outcome,
        latitude: input.latitude,
        longitude: input.longitude,
        offline: input.offline ?? false,
        syncedAt: input.offline ? null : new Date(),
        visitedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'CustomerVisit', visitKey, 'recorded', userId, {
      customerKey,
      offline: input.offline,
    });
    return row;
  }

  async syncVisits(
    organizationId: string,
    userId: string,
    visits: Array<{
      customerKey: string;
      visitKey: string;
      visitedAt: string;
      purpose?: string;
      outcome?: string;
      latitude?: number;
      longitude?: number;
    }>,
  ) {
    const results = [];
    for (const v of visits) {
      const existing = await this.prisma.escmCustomerVisit.findFirst({
        where: { organizationId, visitKey: v.visitKey },
      });
      if (existing) {
        results.push(existing);
        continue;
      }
      const row = await this.recordVisit(organizationId, userId, v.customerKey, {
        ...v,
        offline: true,
        visitKey: v.visitKey,
      });
      await this.prisma.escmCustomerVisit.update({
        where: { id: row.id },
        data: { syncedAt: new Date(), offline: false },
      });
      results.push(row);
    }
    const merged = mergeOfflineVisits(
      [],
      results.map((r) => ({ visitKey: r.visitKey, visitedAt: r.visitedAt.toISOString() })),
    );
    return { synced: results.length, visits: merged };
  }

  async addPurchaseHistory(
    organizationId: string,
    userId: string,
    customerKey: string,
    input: {
      documentKey?: string;
      documentType?: string;
      itemKey?: string;
      quantity: number;
      unitPrice: number;
      currencyKey?: string;
      purchasedAt?: string;
    },
  ) {
    const customer = await this.getOne(organizationId, customerKey);
    const totalAmount = input.quantity * input.unitPrice;
    const seq = customer.purchaseHistories.length + 1;
    const historyKey = generateHistoryKey(customerKey, seq);
    const row = await this.prisma.escmPurchaseHistory.create({
      data: {
        customerId: customer.id,
        historyKey,
        documentKey: input.documentKey,
        documentType: input.documentType,
        itemKey: input.itemKey,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalAmount,
        currencyKey: input.currencyKey ?? customer.currencyKey ?? 'COP',
        purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
      },
    });
    await this.prisma.escmCustomer.update({
      where: { id: customer.id },
      data: {
        lifetimeValue: { increment: totalAmount },
        lastPurchaseAt: new Date(),
        creditUsed: { increment: totalAmount },
      },
    });
    return row;
  }

  crmPanel(organizationId: string, customerKey: string) {
    return this.getOne(organizationId, customerKey);
  }

  commercialHistory(organizationId: string, customerKey?: string) {
    return this.prisma.escmPurchaseHistory.findMany({
      where: {
        ...(customerKey
          ? { customer: { organizationId, customerKey, deletedAt: null } }
          : { customer: { organizationId, deletedAt: null } }),
      },
      include: {
        customer: { select: { customerKey: true, legalName: true, commercialName: true } },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 500,
    });
  }
}
