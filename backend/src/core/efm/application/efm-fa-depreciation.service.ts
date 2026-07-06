import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { computePeriodDepreciation, generateFaKey } from '../domain/efm-fixed-assets.engine';

@Injectable()
export class EfmFaDepreciationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  listRuns(organizationId: string, filters?: { periodKey?: string; runType?: string; status?: string }) {
    return this.prisma.efmFaDepreciationRun.findMany({
      where: {
        organizationId,
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.runType ? { runType: filters.runType } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: { take: 5 } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  getRun(organizationId: string, runKey: string) {
    return this.prisma.efmFaDepreciationRun.findFirst({
      where: { organizationId, runKey },
      include: { lines: { include: { asset: true } } },
    });
  }

  listLines(organizationId: string, filters?: { assetKey?: string; periodKey?: string; entryType?: string }) {
    return this.prisma.efmFaDepreciationLine.findMany({
      where: {
        organizationId,
        ...(filters?.assetKey ? { assetKey: filters.assetKey } : {}),
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.entryType ? { entryType: filters.entryType } : {}),
      },
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async runDepreciation(organizationId: string, userId: string, input: {
    periodKey: string;
    runType?: 'depreciation' | 'amortization';
    assetKeys?: string[];
    reprocess?: boolean;
    reprocessReason?: string;
    periodUnits?: number;
  }) {
    const runType = input.runType ?? 'depreciation';
    const isAmort = runType === 'amortization';

    const assets = await this.prisma.efmFaAsset.findMany({
      where: {
        organizationId,
        status: 'active',
        isIntangible: isAmort,
        ...(input.assetKeys?.length ? { assetKey: { in: input.assetKeys } } : {}),
        ...(isAmort ? {} : { isIntangible: false }),
      },
    });

    if (!assets.length) throw new BadRequestException('No hay activos elegibles para el proceso');

    const existingRun = await this.prisma.efmFaDepreciationRun.findFirst({
      where: { organizationId, periodKey: input.periodKey, runType, status: 'posted' },
    });
    if (existingRun && !input.reprocess) {
      throw new BadRequestException(`Ya existe un proceso ${runType} posteado para ${input.periodKey}. Use reprocess=true`);
    }

    const runSeq = (await this.prisma.efmFaDepreciationRun.count({ where: { organizationId } })) + 1;
    const runKey = generateFaKey(isAmort ? 'AMR' : 'DEP', runSeq);

    const run = await this.prisma.efmFaDepreciationRun.create({
      data: {
        organizationId,
        runKey,
        periodKey: input.periodKey,
        runType,
        status: 'processing',
        isReprocess: Boolean(input.reprocess),
        reprocessReason: input.reprocessReason,
        createdBy: userId,
      },
    });

    let totalAmount = 0;
    let lineSeq = (await this.prisma.efmFaDepreciationLine.count({ where: { organizationId } })) + 1;
    const lines: Array<{ assetKey: string; amount: number }> = [];

    for (const asset of assets) {
      if (asset.usefulLifeMonths <= 0 || asset.assetClass === 'land') continue;

      const existingLine = await this.prisma.efmFaDepreciationLine.findFirst({
        where: { organizationId, assetKey: asset.assetKey, periodKey: input.periodKey, entryType: runType },
      });
      if (existingLine && !input.reprocess) continue;

      const result = computePeriodDepreciation({
        acquisitionCost: asset.acquisitionCost,
        residualValue: asset.residualValue,
        usefulLifeMonths: asset.usefulLifeMonths,
        accumulatedDepreciation: asset.accumulatedDepreciation,
        depreciationMethod: asset.depreciationMethod,
        unitsOfProduction: asset.unitsOfProduction,
        unitsUsed: asset.unitsUsed,
        periodUnits: input.periodUnits,
      });

      if (result.amount <= 0) continue;

      const lineKey = generateFaKey('DLN', lineSeq++);
      await this.prisma.efmFaDepreciationLine.create({
        data: {
          organizationId,
          lineKey,
          runKey,
          assetKey: asset.assetKey,
          periodKey: input.periodKey,
          entryType: runType,
          amount: result.amount,
          openingNbv: result.openingNbv,
          closingNbv: result.closingNbv,
          method: asset.depreciationMethod,
          status: 'pending',
        },
      });

      totalAmount += result.amount;
      lines.push({ assetKey: asset.assetKey, amount: result.amount });
    }

    if (!lines.length) {
      await this.prisma.efmFaDepreciationRun.update({
        where: { id: run.id },
        data: { status: 'voided', assetCount: 0 },
      });
      throw new BadRequestException('No se generaron líneas de depreciación/amortización');
    }

    return this.postRun(organizationId, runKey, userId, totalAmount, lines.length);
  }

  async postRun(organizationId: string, runKey: string, userId: string, totalAmount?: number, assetCount?: number) {
    const run = await this.prisma.efmFaDepreciationRun.findFirst({
      where: { organizationId, runKey },
      include: { lines: true },
    });
    if (!run) throw new NotFoundException(`Proceso ${runKey} no encontrado`);
    if (run.status === 'posted') return run;

    const amount = totalAmount ?? run.lines.reduce((s, l) => s + l.amount, 0);
    const count = assetCount ?? run.lines.length;
    const eventType = run.runType === 'amortization'
      ? EVENT_TYPES.EFM_FA_AMORTIZATION_POSTED
      : EVENT_TYPES.EFM_FA_DEPRECIATION_POSTED;

    let accountingRef: string | null = null;
    try {
      const entry = await this.engine.generateFromEvent(organizationId, eventType, {
        runKey,
        amount,
        periodKey: run.periodKey,
        runType: run.runType,
      }, userId);
      if (entry && typeof entry === 'object' && 'entryKey' in entry) {
        accountingRef = String(entry.entryKey);
      }
    } catch {
      const expenseKey = run.runType === 'amortization' ? 'ACC-5165' : 'ACC-5160';
      const accumKey = run.runType === 'amortization' ? 'ACC-1620' : 'ACC-1592';
      const entry = await this.engine.createEntry(organizationId, userId, {
        sourceModule: 'fixed_assets',
        sourceDocumentType: run.runType,
        sourceDocumentKey: runKey,
        description: `${run.runType === 'amortization' ? 'Amortización' : 'Depreciación'} período ${run.periodKey}`,
        entryDate: new Date().toISOString().slice(0, 10),
        lines: [
          { accountKey: expenseKey, debit: amount, credit: 0 },
          { accountKey: accumKey, debit: 0, credit: amount },
        ],
        autoPost: true,
      });
      accountingRef = entry.entryKey;
    }

    for (const line of run.lines) {
      await this.prisma.efmFaAsset.update({
        where: { organizationId_assetKey: { organizationId, assetKey: line.assetKey } },
        data: {
          accumulatedDepreciation: { increment: line.amount },
          netBookValue: line.closingNbv,
          lastDepreciationDate: new Date(),
        },
      });
      await this.prisma.efmFaDepreciationLine.update({
        where: { id: line.id },
        data: { status: 'posted', accountingRef },
      });
    }

    const updated = await this.prisma.efmFaDepreciationRun.update({
      where: { id: run.id },
      data: {
        status: 'posted',
        totalAmount: amount,
        assetCount: count,
        accountingRef,
        processedAt: new Date(),
        processedBy: userId,
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmFaDepreciationRun', runKey, 'posted', userId, { amount, accountingRef });
    await this.core.emitUserAction(organizationId, 'EfmFaDepreciationRun', runKey, eventType, { amount, accountingRef });
    return updated;
  }
}
