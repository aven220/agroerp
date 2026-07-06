import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { canActivateAgreement, generateAgreementKey, generatePromiseKey } from '../domain/escm-ar.engine';

@Injectable()
export class EscmAgreementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  listAgreements(organizationId: string, filters?: { status?: string; customerKey?: string }) {
    return this.prisma.escmPaymentAgreement.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      include: { _count: { select: { promises: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getAgreement(organizationId: string, agreementKey: string) {
    const row = await this.prisma.escmPaymentAgreement.findFirst({
      where: { organizationId, agreementKey },
      include: { promises: true, customer: true },
    });
    if (!row) throw new NotFoundException(`Acuerdo ${agreementKey} no encontrado`);
    return row;
  }

  async createAgreement(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      totalAmount: number;
      startDate: string;
      endDate: string;
      terms?: Array<{ dueDate: string; amount: number; label?: string }>;
      notes?: string;
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    const count = await this.prisma.escmPaymentAgreement.count({ where: { organizationId } });
    const agreementKey = generateAgreementKey(count + 1);

    const row = await this.prisma.escmPaymentAgreement.create({
      data: {
        organizationId,
        agreementKey,
        status: 'draft',
        customerId: customer.id,
        customerKey: customer.customerKey,
        totalAmount: input.totalAmount,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        terms: (input.terms ?? []) as object,
        notes: input.notes,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'PaymentAgreement', agreementKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmPaymentAgreement', row.id, EVENT_TYPES.ESCM_AGREEMENT_CREATED, {
      agreementKey,
    });
    return row;
  }

  async activateAgreement(organizationId: string, userId: string, agreementKey: string) {
    const agreement = await this.getAgreement(organizationId, agreementKey);
    if (!canActivateAgreement(agreement.status)) {
      throw new BadRequestException('Acuerdo no puede activarse');
    }

    const updated = await this.prisma.escmPaymentAgreement.update({
      where: { id: agreement.id },
      data: { status: 'active', approvedAt: new Date(), approvedBy: userId },
    });

    await this.audit.log(organizationId, 'PaymentAgreement', agreementKey, 'activated', userId);
    await this.core.emitUserAction(organizationId, 'EscmPaymentAgreement', updated.id, EVENT_TYPES.ESCM_AGREEMENT_ACTIVATED, {
      agreementKey,
    });
    return updated;
  }

  listPromises(organizationId: string, filters?: { status?: string; customerKey?: string }) {
    return this.prisma.escmPaymentPromise.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      include: { receivable: true, agreement: true },
      orderBy: { promisedDate: 'asc' },
      take: 500,
    });
  }

  async createPromise(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      promisedAmount: number;
      promisedDate: string;
      receivableKey?: string;
      agreementKey?: string;
      notes?: string;
      supportUrls?: string[];
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    let receivableId: string | undefined;
    if (input.receivableKey) {
      const r = await this.prisma.escmReceivable.findFirst({
        where: { organizationId, receivableKey: input.receivableKey },
      });
      receivableId = r?.id;
    }

    let agreementId: string | undefined;
    if (input.agreementKey) {
      const a = await this.prisma.escmPaymentAgreement.findFirst({
        where: { organizationId, agreementKey: input.agreementKey },
      });
      agreementId = a?.id;
    }

    const count = await this.prisma.escmPaymentPromise.count({ where: { organizationId } });
    const promiseKey = generatePromiseKey(count + 1);

    const row = await this.prisma.escmPaymentPromise.create({
      data: {
        organizationId,
        promiseKey,
        status: 'pending',
        customerId: customer.id,
        customerKey: customer.customerKey,
        receivableId,
        agreementId,
        promisedAmount: input.promisedAmount,
        promisedDate: new Date(input.promisedDate),
        notes: input.notes,
        supportUrls: (input.supportUrls ?? []) as object,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'PaymentPromise', promiseKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmPaymentPromise', row.id, EVENT_TYPES.ESCM_PROMISE_CREATED, {
      promiseKey,
    });
    return row;
  }

  async markPromiseKept(organizationId: string, userId: string, promiseKey: string) {
    const promise = await this.prisma.escmPaymentPromise.findFirst({
      where: { organizationId, promiseKey },
    });
    if (!promise) throw new NotFoundException(`Promesa ${promiseKey} no encontrada`);

    const updated = await this.prisma.escmPaymentPromise.update({
      where: { id: promise.id },
      data: { status: 'kept', keptAt: new Date() },
    });

    await this.audit.log(organizationId, 'PaymentPromise', promiseKey, 'kept', userId);
    return updated;
  }

  async markPromiseBroken(organizationId: string, userId: string, promiseKey: string, reason?: string) {
    const promise = await this.prisma.escmPaymentPromise.findFirst({
      where: { organizationId, promiseKey },
    });
    if (!promise) throw new NotFoundException(`Promesa ${promiseKey} no encontrada`);

    const updated = await this.prisma.escmPaymentPromise.update({
      where: { id: promise.id },
      data: { status: 'broken', notes: reason ?? promise.notes },
    });

    if (promise.agreementId) {
      await this.prisma.escmPaymentAgreement.update({
        where: { id: promise.agreementId },
        data: { status: 'breached' },
      });
    }

    await this.audit.log(organizationId, 'PaymentPromise', promiseKey, 'broken', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmPaymentPromise', updated.id, EVENT_TYPES.ESCM_PROMISE_BROKEN, {
      promiseKey,
    });
    return updated;
  }
}
