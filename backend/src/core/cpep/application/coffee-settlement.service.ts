import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EVENT_TYPES, CpepSettlementInput } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { BreExecutorService } from '@/core/ebre/application/bre-executor.service';
import { applyAutoAdjustments } from '../domain/config-validation.engine';
import {
  SETTLEMENT_FLOW_STEPS,
  SettlementComputationInput,
  SettlementDetailLine,
  computeSettlement,
  generatePaymentKey,
  generateSettlementKey,
  qualityPriceMultiplier,
  validatePaymentAmount,
} from '../domain/settlement.engine';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeAuditService } from './coffee-audit.service';
import { CoffeeDocumentsService } from './coffee-documents.service';
import { CoffeeParameterService } from './coffee-parameter.service';
import { CoffeeInventoryService } from './coffee-inventory.service';
import { CoffeeConfigService } from './coffee-config.service';

@Injectable()
export class CoffeeSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly reception: CoffeeReceptionService,
    private readonly audit: CoffeeAuditService,
    private readonly documents: CoffeeDocumentsService,
    private readonly parameters: CoffeeParameterService,
    private readonly inventory: CoffeeInventoryService,
    private readonly config: CoffeeConfigService,
    @Optional() private readonly bre?: BreExecutorService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cpepSettlement.findMany({
      where: { organizationId, voided: false },
      include: {
        ticket: { select: { ticketKey: true, producerName: true, lotCode: true, status: true } },
        payments: { orderBy: { recordedAt: 'desc' } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(organizationId: string, settlementKey: string) {
    const settlement = await this.prisma.cpepSettlement.findFirst({
      where: { organizationId, settlementKey },
      include: {
        ticket: true,
        payments: { orderBy: { recordedAt: 'asc' } },
        documents: true,
        session: true,
      },
    });
    if (!settlement) throw new NotFoundException(`Liquidación ${settlementKey} no encontrada`);
    return settlement;
  }

  listPending(organizationId: string) {
    return this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        status: { in: ['quality_done', 'settlement_pending'] },
        settlement: null,
      },
      include: { quality: true },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
  }

  listSessions(organizationId: string, status?: string) {
    return this.prisma.cpepSettlementSession.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'pending' } : {}),
      },
      include: {
        ticket: {
          select: {
            ticketKey: true,
            producerName: true,
            netWeightKg: true,
            grossWeightKg: true,
            tareWeightKg: true,
            status: true,
            quality: true,
          },
        },
        settlements: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepSettlementSession.findFirst({
      where: { organizationId, sessionKey },
      include: {
        ticket: { include: { quality: true, signatures: true } },
        settlements: { include: { payments: true, documents: true } },
      },
    });
    if (!session) throw new NotFoundException(`Sesión de liquidación ${sessionKey} no encontrada`);
    return {
      ...session,
      flow: SETTLEMENT_FLOW_STEPS.map((s) => ({
        ...s,
        done: session.step >= s.step,
        current: session.step === s.step,
      })),
    };
  }

  async kpis(organizationId: string) {
    const settlements = await this.prisma.cpepSettlement.findMany({
      where: { organizationId, voided: false },
      select: {
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        netWeightKg: true,
        bonusesTotal: true,
        penaltiesTotal: true,
      },
    });
    const total = settlements.reduce((s, r) => s + r.totalAmount, 0);
    const paid = settlements.reduce((s, r) => s + r.paidAmount, 0);
    const kg = settlements.reduce((s, r) => s + r.netWeightKg, 0);
    return {
      count: settlements.length,
      totalAmount: total,
      paidAmount: paid,
      outstanding: total - paid,
      kgSettled: kg,
      bonusesTotal: settlements.reduce((s, r) => s + r.bonusesTotal, 0),
      penaltiesTotal: settlements.reduce((s, r) => s + r.penaltiesTotal, 0),
      paidCount: settlements.filter((r) => r.paymentStatus === 'paid').length,
      partialCount: settlements.filter((r) => r.paymentStatus === 'partial').length,
      pendingCount: settlements.filter((r) => r.paymentStatus === 'pending').length,
    };
  }

  async startSession(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    if (ticket.netWeightKg == null) throw new BadRequestException('Ticket sin peso neto');
    if (ticket.settlement && !ticket.settlement.voided) {
      throw new BadRequestException('Ticket ya liquidado');
    }
    if (ticket.quality?.decision === 'rejected') {
      throw new BadRequestException('Ticket rechazado en calidad');
    }

    const open = await this.prisma.cpepSettlementSession.findFirst({
      where: {
        organizationId,
        ticketId: ticket.id,
        status: { notIn: ['registered', 'inventory_posted', 'voided', 'cancelled'] },
      },
    });
    if (open) return this.getSession(organizationId, open.sessionKey);

    const sessionKey = `SS-${ticketKey}-${Date.now()}`;
    await this.prisma.cpepSettlementSession.create({
      data: {
        organizationId,
        sessionKey,
        ticketId: ticket.id,
        status: 'quality_received',
        step: 1,
        operatorId: userId,
      },
    });
    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { status: 'settlement_pending' },
    });
    await this.audit.log(organizationId, 'SettlementSession', sessionKey, 'started', userId, { ticketKey });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeSettlement',
      sessionKey,
      EVENT_TYPES.COFFEE_SETTLEMENT_STARTED,
      { ticketKey, sessionKey },
    );
    return this.loadPrice(organizationId, userId, sessionKey);
  }

  async loadPrice(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    const ticket = await this.prisma.cpepReceptionTicket.findUnique({
      where: { id: session.ticketId },
      include: { quality: true },
    });
    const prices = await this.config.list(organizationId);
    const active = prices.find((p) => p.isActive) ?? prices[0];
    if (!active) throw new BadRequestException('No hay precio vigente configurado');

    const basePricePerKg = active.basePricePerKg;
    const qualityPricePerKg =
      basePricePerKg * qualityPriceMultiplier(ticket?.quality?.grade ?? 'standard');

    await this.prisma.cpepSettlementSession.update({
      where: { id: session.id },
      data: {
        priceConfigKey: active.configKey,
        basePricePerKg,
        qualityPricePerKg,
        appliedPricePerKg: qualityPricePerKg,
        status: 'price_loaded',
        step: 2,
      },
    });
    await this.audit.log(organizationId, 'SettlementSession', sessionKey, 'price_loaded', userId, {
      basePricePerKg,
      qualityPricePerKg,
      configKey: active.configKey,
    });
    return this.applyRules(organizationId, userId, sessionKey);
  }

  async applyRules(
    organizationId: string,
    userId: string,
    sessionKey: string,
    overrides?: Partial<SettlementComputationInput>,
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    const ticket = await this.prisma.cpepReceptionTicket.findUnique({
      where: { id: session.ticketId },
      include: { quality: true },
    });
    if (!ticket?.netWeightKg) throw new BadRequestException('Sin peso neto');

    const prices = await this.config.list(organizationId);
    const active = prices.find((p) => p.configKey === session.priceConfigKey) ?? prices.find((p) => p.isActive);

    const bonusLines: SettlementDetailLine[] = [];
    const penaltyLines: SettlementDetailLine[] = [];
    const qualityHasTotals =
      !!ticket.quality &&
      ((ticket.quality.bonusesTotal ?? 0) > 0 || (ticket.quality.penaltiesTotal ?? 0) > 0);

    if (qualityHasTotals) {
      if (ticket.quality!.bonusesTotal) {
        bonusLines.push({
          code: 'QUALITY_BONUS',
          label: 'Bonificaciones calidad',
          amount: ticket.quality!.bonusesTotal,
          source: 'quality',
        });
      }
      if (ticket.quality!.penaltiesTotal) {
        penaltyLines.push({
          code: 'QUALITY_PENALTY',
          label: 'Castigos calidad',
          amount: ticket.quality!.penaltiesTotal,
          source: 'quality',
        });
      }
    }

    const autoBonusParam = await this.parameters.resolve(organizationId, 'auto_bonuses');
    const autoPenaltyParam = await this.parameters.resolve(organizationId, 'auto_penalties');
    const autoBonusRules =
      ((autoBonusParam?.value as { rules?: Array<{ code: string; amount: number; condition?: Record<string, unknown> }> })
        ?.rules) ?? [];
    const autoPenaltyRules =
      ((autoPenaltyParam?.value as { rules?: Array<{ code: string; amount: number; condition?: Record<string, unknown> }> })
        ?.rules) ?? [];
    const auto = applyAutoAdjustments(autoBonusRules, autoPenaltyRules, {
      humidityPct: ticket.quality?.humidityPct ?? undefined,
      factor: ticket.quality?.factor ?? undefined,
      grade: ticket.quality?.grade,
    });
    if (auto.bonusTotal) {
      bonusLines.push({ code: 'AUTO_BONUS', label: 'Bonificaciones automáticas', amount: auto.bonusTotal, source: 'rules' });
    }
    if (auto.penaltyTotal) {
      penaltyLines.push({ code: 'AUTO_PENALTY', label: 'Castigos automáticos', amount: auto.penaltyTotal, source: 'rules' });
    }

    const inputOverrides = {
      ...(session.inputOverrides as object),
      ...(overrides ?? {}),
    } as SettlementComputationInput;

    const simulation = computeSettlement(ticket.netWeightKg, {
      basePricePerKg: overrides?.basePricePerKg ?? session.basePricePerKg ?? active?.basePricePerKg ?? 0,
      qualityPricePerKg: overrides?.qualityPricePerKg ?? session.qualityPricePerKg ?? undefined,
      qualityGrade: qualityHasTotals ? undefined : ticket.quality?.grade,
      humidityPct: qualityHasTotals ? undefined : ticket.quality?.humidityPct ?? undefined,
      factor: qualityHasTotals ? undefined : ticket.quality?.factor ?? undefined,
      grossWeightKg: ticket.grossWeightKg ?? undefined,
      tareWeightKg: ticket.tareWeightKg ?? undefined,
      bonusesTotal: 0,
      penaltiesTotal: 0,
      bonusLines,
      penaltyLines,
      discountLines: (inputOverrides.discountLines as SettlementDetailLine[]) ?? [],
      discountsTotal: inputOverrides.discountsTotal ?? 0,
      transportTotal: inputOverrides.transportTotal ?? 0,
      advancesTotal: inputOverrides.advancesTotal ?? 0,
      creditsTotal: inputOverrides.creditsTotal ?? 0,
      taxesTotal: inputOverrides.taxesTotal,
      withholdingsTotal: inputOverrides.withholdingsTotal,
      taxRatePct: active?.taxRatePct ?? 0,
      withholdingPct: active?.withholdingPct ?? 0,
      roundingMode: (inputOverrides.roundingMode as 'nearest') ?? 'nearest',
      roundingPrecision: inputOverrides.roundingPrecision ?? 0,
      paidAmount: inputOverrides.paidAmount ?? 0,
    });

    if (ticket.quality) {
      simulation.qualityGrade = ticket.quality.grade;
      simulation.humidityPct = ticket.quality.humidityPct ?? undefined;
      simulation.factor = ticket.quality.factor ?? undefined;
    }

    const breRules = await this.applyBre(organizationId, userId, sessionKey, simulation);

    await this.prisma.cpepSettlementSession.update({
      where: { id: session.id },
      data: {
        status: 'simulated',
        step: 8,
        simulation: simulation as object,
        inputOverrides: inputOverrides as object,
        rulesApplied: [...bonusLines, ...penaltyLines, ...breRules] as object[],
        appliedPricePerKg: simulation.appliedPricePerKg,
      },
    });

    await this.audit.log(organizationId, 'SettlementSession', sessionKey, 'simulated', userId, {
      totalAmount: simulation.totalAmount,
      netPayable: simulation.netPayable,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeSettlement',
      session.id,
      EVENT_TYPES.COFFEE_SETTLEMENT_SIMULATED,
      { sessionKey, totalAmount: simulation.totalAmount },
    );
    return this.getSession(organizationId, sessionKey);
  }

  async simulate(
    organizationId: string,
    userId: string,
    ticketKey: string,
    input?: Partial<SettlementComputationInput>,
  ) {
    const session = await this.startSession(organizationId, userId, ticketKey);
    return this.applyRules(organizationId, userId, session.sessionKey, input);
  }

  async confirmOperator(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (!session.simulation || Object.keys(session.simulation as object).length === 0) {
      await this.applyRules(organizationId, userId, sessionKey);
    }
    await this.prisma.cpepSettlementSession.update({
      where: { id: session.id },
      data: { status: 'operator_confirmed', step: 9, confirmedAt: new Date() },
    });
    await this.audit.log(organizationId, 'SettlementSession', sessionKey, 'operator_confirmed', userId);
    return this.getSession(organizationId, sessionKey);
  }

  async confirmProducer(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input: { signerName: string; signatureData: string },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    await this.prisma.cpepSignature.create({
      data: {
        ticketId: session.ticketId,
        signerRole: 'producer',
        signerName: input.signerName,
        signatureData: input.signatureData,
      },
    });
    await this.prisma.cpepSettlementSession.update({
      where: { id: session.id },
      data: {
        status: 'producer_signed',
        step: 10,
        producerSigned: true,
        producerSignerName: input.signerName,
        signatureData: input.signatureData,
      },
    });
    await this.audit.log(organizationId, 'SettlementSession', sessionKey, 'producer_signed', userId, {
      signerName: input.signerName,
    });
    return this.getSession(organizationId, sessionKey);
  }

  async register(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (session.status !== 'operator_confirmed' && session.status !== 'producer_signed' && session.status !== 'simulated') {
      if (session.status === 'price_loaded' || session.status === 'quality_received') {
        await this.applyRules(organizationId, userId, sessionKey);
      }
    }
    const current = await this.requireSession(organizationId, sessionKey);
    const simulation = current.simulation as unknown as ReturnType<typeof computeSettlement>;
    if (!simulation?.totalAmount && simulation?.totalAmount !== 0) {
      throw new BadRequestException('Sin simulación de liquidación');
    }

    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: current.ticketId } });
    const settlementKey = generateSettlementKey(ticket?.ticketKey ?? sessionKey);

    const settlement = await this.prisma.cpepSettlement.upsert({
      where: { ticketId: current.ticketId },
      update: {
        sessionId: current.id,
        status: 'registered',
        basePricePerKg: simulation.basePricePerKg,
        qualityPricePerKg: simulation.qualityPricePerKg,
        appliedPricePerKg: simulation.appliedPricePerKg,
        grossWeightKg: simulation.grossWeightKg,
        tareWeightKg: simulation.tareWeightKg,
        netWeightKg: simulation.netWeightKg,
        bonusesTotal: simulation.bonusesTotal,
        penaltiesTotal: simulation.penaltiesTotal,
        discountsTotal: simulation.discountsTotal,
        withholdingsTotal: simulation.withholdingsTotal,
        transportTotal: simulation.transportTotal,
        advancesTotal: simulation.advancesTotal,
        creditsTotal: simulation.creditsTotal,
        taxesTotal: simulation.taxesTotal,
        subtotal: simulation.subtotal,
        totalAmount: simulation.totalAmount,
        netPayable: simulation.netPayable,
        paidAmount: 0,
        paymentStatus: 'pending',
        lines: simulation.lines as object[],
        bonusLines: simulation.bonusLines as object[],
        penaltyLines: simulation.penaltyLines as object[],
        discountLines: simulation.discountLines as object[],
        simulation: simulation as object,
        priceConfigKey: current.priceConfigKey,
        operatorId: userId,
        producerSigned: current.producerSigned,
        producerSignedAt: current.producerSigned ? new Date() : null,
        producerSignerName: current.producerSignerName,
        voided: false,
        settledBy: userId,
        settledAt: new Date(),
      },
      create: {
        organizationId,
        ticketId: current.ticketId,
        sessionId: current.id,
        settlementKey,
        status: 'registered',
        basePricePerKg: simulation.basePricePerKg,
        qualityPricePerKg: simulation.qualityPricePerKg,
        appliedPricePerKg: simulation.appliedPricePerKg,
        grossWeightKg: simulation.grossWeightKg,
        tareWeightKg: simulation.tareWeightKg,
        netWeightKg: simulation.netWeightKg,
        bonusesTotal: simulation.bonusesTotal,
        penaltiesTotal: simulation.penaltiesTotal,
        discountsTotal: simulation.discountsTotal,
        withholdingsTotal: simulation.withholdingsTotal,
        transportTotal: simulation.transportTotal,
        advancesTotal: simulation.advancesTotal,
        creditsTotal: simulation.creditsTotal,
        taxesTotal: simulation.taxesTotal,
        subtotal: simulation.subtotal,
        totalAmount: simulation.totalAmount,
        netPayable: simulation.netPayable,
        lines: simulation.lines as object[],
        bonusLines: simulation.bonusLines as object[],
        penaltyLines: simulation.penaltyLines as object[],
        discountLines: simulation.discountLines as object[],
        simulation: simulation as object,
        priceConfigKey: current.priceConfigKey,
        operatorId: userId,
        producerSigned: current.producerSigned,
        producerSignedAt: current.producerSigned ? new Date() : null,
        producerSignerName: current.producerSignerName,
        settledBy: userId,
        settledAt: new Date(),
      },
    });

    await this.prisma.cpepReceptionTicket.update({
      where: { id: current.ticketId },
      data: { status: 'settled', settledAt: new Date() },
    });

    await this.prisma.cpepSettlementSession.update({
      where: { id: current.id },
      data: { status: 'registered', step: 11, registeredAt: new Date() },
    });

    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: current.ticketId,
        eventKey: `settlement-${settlementKey}`,
        action: `Liquidación registrada ${settlement.totalAmount}`,
        details: { settlementKey, totalAmount: settlement.totalAmount },
      },
    });

    await this.audit.log(organizationId, 'Settlement', settlementKey, 'registered', userId, {
      totalAmount: settlement.totalAmount,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeSettlement',
      settlement.id,
      EVENT_TYPES.COFFEE_SETTLED,
      { ticketKey: ticket?.ticketKey, totalAmount: settlement.totalAmount, settlementKey },
    );

    const docs = await this.documents.generateSettlementDocs(organizationId, ticket!.ticketKey, settlement);
    await this.prisma.cpepSettlementSession.update({
      where: { id: current.id },
      data: { status: 'documents_generated', step: 12 },
    });

    let inventory = null;
    try {
      inventory = await this.inventory.postToInventory(organizationId, userId, ticket!.ticketKey);
      await this.prisma.cpepSettlement.update({
        where: { id: settlement.id },
        data: { inventoryPosted: true, accountingPosted: true },
      });
      await this.prisma.cpepSettlementSession.update({
        where: { id: current.id },
        data: { status: 'inventory_posted', step: 13 },
      });
      await this.core.emitUserAction(
        organizationId,
        'CoffeeSettlement',
        settlement.id,
        EVENT_TYPES.COFFEE_SETTLEMENT_POSTED,
        { settlementKey, inventory: true, accounting: true },
      );
    } catch {
      // inventory may already be posted
    }

    return {
      settlement,
      documents: docs,
      inventory,
      session: await this.getSession(organizationId, sessionKey),
    };
  }

  /** Backward-compatible settle endpoint */
  async settle(organizationId: string, userId: string, ticketKey: string, input: CpepSettlementInput) {
    const session = await this.startSession(organizationId, userId, ticketKey);
    await this.applyRules(organizationId, userId, session.sessionKey, input as never);
    await this.confirmOperator(organizationId, userId, session.sessionKey);
    return this.register(organizationId, userId, session.sessionKey);
  }

  async registerPayment(
    organizationId: string,
    ticketKey: string,
    paidAmount: number,
    userId: string,
    options?: {
      method?: string;
      reference?: string;
      bankName?: string;
      accountNumber?: string;
      walletProvider?: string;
      deferredUntil?: string;
      notes?: string;
      payments?: Array<{
        method: string;
        amount: number;
        reference?: string;
        bankName?: string;
        accountNumber?: string;
        walletProvider?: string;
      }>;
    },
  ) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    if (!ticket.settlement) throw new BadRequestException('Sin liquidación');
    if (ticket.settlement.voided) throw new BadRequestException('Liquidación anulada');

    const outstanding = ticket.settlement.totalAmount - ticket.settlement.paidAmount;
    const entries =
      options?.payments?.length
        ? options.payments
        : [{ method: options?.method ?? 'cash', amount: paidAmount, reference: options?.reference }];

    let totalPaidIncrement = 0;
    const created = [];
    const existingCount = await this.prisma.cpepPayment.count({ where: { settlementId: ticket.settlement.id } });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const error = validatePaymentAmount(entry.amount, outstanding - totalPaidIncrement, entry.method);
      if (error) throw new BadRequestException(error);

      const paymentKey = generatePaymentKey(ticket.settlement.settlementKey, existingCount + i + 1);
      const payment = await this.prisma.cpepPayment.create({
        data: {
          organizationId,
          settlementId: ticket.settlement.id,
          paymentKey,
          method: entry.method as 'cash',
          amount: entry.amount,
          reference: entry.reference ?? options?.reference,
          bankName: entry.bankName ?? options?.bankName,
          accountNumber: entry.accountNumber ?? options?.accountNumber,
          walletProvider: entry.walletProvider ?? options?.walletProvider,
          deferredUntil: options?.deferredUntil ? new Date(options.deferredUntil) : undefined,
          notes: options?.notes,
          recordedBy: userId,
          status: entry.method === 'deferred' ? 'deferred' : 'completed',
        },
      });
      created.push(payment);
      if (entry.method !== 'deferred') totalPaidIncrement += entry.amount;
    }

    const totalPaid = ticket.settlement.paidAmount + totalPaidIncrement;
    const paymentStatus = totalPaid <= 0 ? 'pending' : totalPaid >= ticket.settlement.totalAmount ? 'paid' : 'partial';
    const updated = await this.prisma.cpepSettlement.update({
      where: { id: ticket.settlement.id },
      data: {
        paidAmount: totalPaid,
        paymentStatus,
        netPayable: Math.max(0, ticket.settlement.totalAmount - totalPaid),
      },
      include: { payments: true },
    });

    await this.documents.generatePaymentVoucher(organizationId, ticketKey, updated, created);
    await this.audit.log(organizationId, 'Settlement', ticket.settlement.settlementKey, 'payment_registered', userId, {
      amount: totalPaidIncrement,
      paymentStatus,
      methods: entries.map((e) => e.method),
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeSettlement',
      updated.id,
      EVENT_TYPES.COFFEE_PAYMENT_REGISTERED,
      { ticketKey, amount: totalPaidIncrement, paymentStatus },
    );
    return updated;
  }

  async voidSettlement(
    organizationId: string,
    userId: string,
    settlementKey: string,
    reason: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('Justificación obligatoria para anulación');
    const settlement = await this.getOne(organizationId, settlementKey);
    if (settlement.voided) throw new BadRequestException('Ya está anulada');
    if (settlement.paidAmount > 0) {
      throw new BadRequestException('No se puede anular con pagos registrados; revierta pagos primero');
    }

    const updated = await this.prisma.cpepSettlement.update({
      where: { id: settlement.id },
      data: {
        voided: true,
        voidReason: reason,
        voidedBy: userId,
        voidedAt: new Date(),
        status: 'voided',
      },
    });

    await this.prisma.cpepDocument.updateMany({
      where: { settlementId: settlement.id },
      data: { voided: true, voidReason: reason },
    });

    await this.prisma.cpepReceptionTicket.update({
      where: { id: settlement.ticketId },
      data: { status: 'settlement_pending', settledAt: null },
    });

    await this.audit.log(organizationId, 'Settlement', settlementKey, 'voided', userId, { reason });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeSettlement',
      settlement.id,
      EVENT_TYPES.COFFEE_SETTLEMENT_VOIDED,
      { settlementKey, reason },
    );
    return updated;
  }

  async reprintDocument(organizationId: string, userId: string, documentKey: string) {
    const doc = await this.prisma.cpepDocument.findFirst({
      where: { organizationId, documentKey },
    });
    if (!doc) throw new NotFoundException(`Documento ${documentKey} no encontrado`);
    if (doc.voided) throw new BadRequestException('Documento anulado');

    const updated = await this.prisma.cpepDocument.update({
      where: { id: doc.id },
      data: {
        reprintCount: { increment: 1 },
        lastPrintedAt: new Date(),
      },
    });
    await this.audit.log(organizationId, 'Document', documentKey, 'reprinted', userId, {
      reprintCount: updated.reprintCount,
    });
    return updated;
  }

  private async applyBre(
    organizationId: string,
    userId: string,
    sessionKey: string,
    simulation: ReturnType<typeof computeSettlement>,
  ) {
    if (!this.bre) return [];
    try {
      const rules = await this.prisma.breBusinessRule.findMany({
        where: {
          organizationId,
          status: 'published',
          deletedAt: null,
          eventTypes: {
            hasSome: [EVENT_TYPES.COFFEE_SETTLED, EVENT_TYPES.COFFEE_SETTLEMENT_SIMULATED, 'CoffeeSettlementEvaluated'],
          },
        },
        include: { decisionTable: true },
        take: 30,
      });
      const applied = [];
      for (const rule of rules) {
        await this.bre.executeRule(rule, {
          eventType: EVENT_TYPES.COFFEE_SETTLEMENT_SIMULATED,
          payload: { sessionKey, simulation },
          actorId: userId,
          dryRun: true,
        });
        applied.push({ code: rule.ruleKey, label: rule.name ?? rule.ruleKey, source: 'bre' });
      }
      return applied;
    } catch {
      return [];
    }
  }

  private async requireSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepSettlementSession.findFirst({
      where: { organizationId, sessionKey },
    });
    if (!session) throw new NotFoundException(`Sesión ${sessionKey} no encontrada`);
    return session;
  }
}
