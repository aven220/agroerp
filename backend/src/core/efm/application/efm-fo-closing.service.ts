import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmPeriodService } from './efm-period.service';
import { EfmAuditService } from './efm-audit.service';
import {
  DEFAULT_FO_CLOSING_CHECKLIST,
  evaluateClosingChecklist,
  generateFoKey,
  resolveClosingType,
  type ClosingValidationResult,
} from '../domain/efm-financial-ops.engine';
import type { EfmFoClosingType } from '@prisma/client';

export type StartClosingInput = {
  periodKey: string;
  closingType?: EfmFoClosingType;
  companyKey?: string;
  branchKey?: string;
};

@Injectable()
export class EfmFoClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: EfmPeriodService,
    private readonly audit: EfmAuditService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string, filters?: { periodKey?: string; status?: string }) {
    return this.prisma.efmFoClosingRun.findMany({
      where: {
        organizationId,
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { checklists: true, logs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async get(organizationId: string, closingKey: string) {
    const run = await this.prisma.efmFoClosingRun.findFirst({
      where: { organizationId, closingKey },
      include: { checklists: true, logs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!run) throw new NotFoundException(`Cierre ${closingKey} no encontrado`);
    return run;
  }

  async initChecklistTemplate(organizationId: string) {
    return DEFAULT_FO_CLOSING_CHECKLIST;
  }

  async start(organizationId: string, userId: string, input: StartClosingInput) {
    const period = await this.prisma.efmAccountingPeriod.findFirst({
      where: { organizationId, periodKey: input.periodKey },
    });
    if (!period) throw new NotFoundException(`Período ${input.periodKey} no encontrado`);
    if (period.status === 'locked') throw new BadRequestException('Período bloqueado');

    const closingType = input.closingType ?? resolveClosingType(period.periodNumber);
    const seq = (await this.prisma.efmFoClosingRun.count({ where: { organizationId } })) + 1;
    const closingKey = generateFoKey('CLOSE', seq);

    const run = await this.prisma.efmFoClosingRun.create({
      data: {
        organizationId,
        closingKey,
        closingType,
        status: 'validating',
        fiscalYear: Number(input.periodKey.slice(0, 4)),
        periodKey: input.periodKey,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        startedAt: new Date(),
        createdBy: userId,
      },
    });

    let chkSeq = 1;
    for (const item of DEFAULT_FO_CLOSING_CHECKLIST) {
      await this.prisma.efmFoClosingChecklist.create({
        data: {
          organizationId,
          checklistKey: generateFoKey('CHK', chkSeq++),
          closingKey,
          itemCode: item.itemCode,
          itemName: item.itemName,
          isRequired: item.isRequired,
          status: 'pending',
        },
      });
    }

    await this.log(organizationId, closingKey, 'started', `Cierre ${closingType} iniciado`, userId);
    await this.audit.log(organizationId, 'EfmFoClosingRun', closingKey, 'started', userId, { periodKey: input.periodKey });

    return this.validate(organizationId, closingKey, userId);
  }

  async validate(organizationId: string, closingKey: string, userId: string) {
    const run = await this.get(organizationId, closingKey);
    const results = await this.runValidations(organizationId, run.periodKey, run.companyKey ?? undefined, run.branchKey ?? undefined);

    for (const result of results) {
      await this.prisma.efmFoClosingChecklist.updateMany({
        where: { organizationId, closingKey, itemCode: result.itemCode },
        data: {
          status: result.passed ? 'passed' : 'failed',
          resultMessage: result.message,
          completedAt: new Date(),
          completedBy: userId,
        },
      });
    }

    const evaluation = evaluateClosingChecklist(results);
    const status = evaluation.passed ? 'in_progress' : 'failed';

    await this.prisma.efmFoClosingRun.update({
      where: { id: run.id },
      data: { validationPassed: evaluation.passed, status },
    });

    await this.log(
      organizationId,
      closingKey,
      'validated',
      evaluation.passed ? 'Validaciones aprobadas' : `Validaciones fallidas: ${evaluation.failedRequired.join(', ')}`,
      userId,
    );

    return this.get(organizationId, closingKey);
  }

  async complete(organizationId: string, closingKey: string, userId: string) {
    const run = await this.get(organizationId, closingKey);
    if (!run.validationPassed) {
      throw new BadRequestException('Debe aprobar validaciones previas al cierre');
    }

    await this.periods.closePeriod(organizationId, run.periodKey, userId);

    if (run.closingType === 'quarterly' || run.closingType === 'annual') {
      await this.periods.lockPeriod(organizationId, run.periodKey, userId);
    }

    const updated = await this.prisma.efmFoClosingRun.update({
      where: { id: run.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    await this.log(organizationId, closingKey, 'completed', 'Cierre contable completado', userId);
    await this.audit.log(organizationId, 'EfmFoClosingRun', closingKey, 'completed', userId);

    await this.core.emitUserAction(organizationId, 'EfmFoClosingRun', closingKey, EVENT_TYPES.EFM_FO_CLOSING_COMPLETED, {
      closingKey,
      periodKey: run.periodKey,
      closingType: run.closingType,
    });

    return updated;
  }

  async reopen(organizationId: string, closingKey: string, userId: string, reason: string) {
    const run = await this.get(organizationId, closingKey);
    if (run.status !== 'completed') throw new BadRequestException('Solo se puede reabrir un cierre completado');

    await this.periods.reopenPeriod(organizationId, run.periodKey, userId);

    const updated = await this.prisma.efmFoClosingRun.update({
      where: { id: run.id },
      data: { status: 'reopened', reopenedAt: new Date(), reopenedBy: userId, metadata: { reason } as object },
    });

    await this.log(organizationId, closingKey, 'reopened', reason, userId);
    await this.audit.log(organizationId, 'EfmFoClosingRun', closingKey, 'reopened', userId, { reason });

    await this.core.emitUserAction(organizationId, 'EfmFoClosingRun', closingKey, EVENT_TYPES.EFM_FO_PERIOD_REOPENED, {
      closingKey,
      periodKey: run.periodKey,
      reason,
    });

    return updated;
  }

  async lockPeriod(organizationId: string, periodKey: string, userId: string) {
    const result = await this.periods.lockPeriod(organizationId, periodKey, userId);
    await this.audit.log(organizationId, 'EfmAccountingPeriod', periodKey, 'locked_via_foc', userId);
    return result;
  }

  private async runValidations(
    organizationId: string,
    periodKey: string,
    companyKey?: string,
    branchKey?: string,
  ): Promise<ClosingValidationResult[]> {
    const entryWhere: Record<string, unknown> = {
      organizationId,
      periodKey,
      ...(companyKey ? { companyKey } : {}),
      ...(branchKey ? { branchKey } : {}),
    };

    const unposted = await this.prisma.efmJournalEntry.count({
      where: { ...entryWhere, status: { in: ['draft', 'pending_approval', 'approved'] } },
    });

    const draftVouchers = await this.prisma.efmJournalEntry.count({
      where: { ...entryWhere, status: 'draft' },
    });

    const trialBalance = await this.prisma.efmJournalLine.aggregate({
      where: { entry: { ...entryWhere, status: 'posted' } },
      _sum: { debit: true, credit: true },
    });
    const trialBalanced = Math.abs((trialBalance._sum.debit ?? 0) - (trialBalance._sum.credit ?? 0)) < 0.01;

    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    const priorPeriodsOpen = period
      ? await this.prisma.efmAccountingPeriod.count({
          where: {
            organizationId,
            fiscalYearKey: period.fiscalYearKey,
            periodNumber: { lt: period.periodNumber },
            status: 'open',
          },
        })
      : 0;

    const pendingRecon = await this.prisma.efmTrReconciliation.count({
      where: { organizationId, status: { in: ['open', 'in_progress'] } },
    });

    const pendingExceptions = await this.prisma.efmBgException.count({
      where: { organizationId, status: 'pending' },
    });

    const depreciationPending = await this.prisma.efmFaDepreciationRun.count({
      where: { organizationId, periodKey, status: { in: ['draft', 'processing'] } },
    });

    const apOpen = await this.prisma.efmApPayable.count({
      where: { organizationId, status: { in: ['open', 'partial'] } },
    });

    return [
      { itemCode: 'CHK-UNPOSTED', passed: unposted === 0, message: unposted === 0 ? 'OK' : `${unposted} asientos sin contabilizar` },
      { itemCode: 'CHK-DRAFT-VOUCH', passed: draftVouchers === 0, message: draftVouchers === 0 ? 'OK' : `${draftVouchers} comprobantes en borrador` },
      { itemCode: 'CHK-TRIAL-BAL', passed: trialBalanced, message: trialBalanced ? 'OK' : 'Balance de prueba descuadrado' },
      { itemCode: 'CHK-PERIOD-LOCK', passed: priorPeriodsOpen === 0, message: priorPeriodsOpen === 0 ? 'OK' : `${priorPeriodsOpen} períodos anteriores abiertos` },
      { itemCode: 'CHK-BANK-REC', passed: pendingRecon === 0, message: pendingRecon === 0 ? 'OK' : `${pendingRecon} conciliaciones pendientes` },
      { itemCode: 'CHK-BUDGET-EXC', passed: pendingExceptions === 0, message: pendingExceptions === 0 ? 'OK' : `${pendingExceptions} excepciones presupuestales` },
      { itemCode: 'CHK-DEPRECIATION', passed: depreciationPending === 0, message: depreciationPending === 0 ? 'OK' : `${depreciationPending} depreciaciones pendientes` },
      { itemCode: 'CHK-AR-AP', passed: apOpen < 10000, message: `CxP abiertas: ${apOpen}` },
    ];
  }

  private async log(organizationId: string, closingKey: string, action: string, message: string, userId: string) {
    const seq = (await this.prisma.efmFoClosingLog.count({ where: { organizationId, closingKey } })) + 1;
    return this.prisma.efmFoClosingLog.create({
      data: {
        organizationId,
        logKey: generateFoKey('LOG', seq),
        closingKey,
        action,
        message,
        userId,
      },
    });
  }
}
