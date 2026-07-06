import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { EfmTrMovementService } from './efm-tr-movement.service';
import { computeDisposalGainLoss, generateFaKey } from '../domain/efm-fixed-assets.engine';

@Injectable()
export class EfmFaLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
    private readonly movements: EfmTrMovementService,
  ) {}

  listTransfers(organizationId: string, assetKey?: string) {
    return this.prisma.efmFaTransfer.findMany({
      where: { organizationId, ...(assetKey ? { assetKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createTransfer(organizationId: string, userId: string, input: {
    assetKey: string;
    toBranchKey?: string;
    toLocationKey?: string;
    toLocationDescription?: string;
    toResponsibleUserId?: string;
    toCostCenterKey?: string;
    transferDate: string;
    reason?: string;
    autoApprove?: boolean;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey: input.assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${input.assetKey} no encontrado`);
    if (asset.status !== 'active') throw new BadRequestException('Solo activos activos pueden transferirse');

    const seq = (await this.prisma.efmFaTransfer.count({ where: { organizationId } })) + 1;
    const transfer = await this.prisma.efmFaTransfer.create({
      data: {
        organizationId,
        transferKey: generateFaKey('TRF', seq),
        assetKey: input.assetKey,
        fromBranchKey: asset.branchKey,
        toBranchKey: input.toBranchKey,
        fromLocationKey: asset.locationKey,
        toLocationKey: input.toLocationKey,
        fromResponsibleUserId: asset.responsibleUserId,
        toResponsibleUserId: input.toResponsibleUserId,
        fromCostCenterKey: asset.costCenterKey,
        toCostCenterKey: input.toCostCenterKey,
        transferDate: new Date(input.transferDate),
        reason: input.reason,
        createdBy: userId,
      },
    });

    if (input.autoApprove !== false) {
      return this.approveTransfer(organizationId, transfer.transferKey, userId);
    }
    return transfer;
  }

  async approveTransfer(organizationId: string, transferKey: string, userId: string) {
    const transfer = await this.prisma.efmFaTransfer.findFirst({ where: { organizationId, transferKey } });
    if (!transfer) throw new NotFoundException(`Transferencia ${transferKey} no encontrada`);

    await this.prisma.efmFaAsset.update({
      where: { organizationId_assetKey: { organizationId, assetKey: transfer.assetKey } },
      data: {
        branchKey: transfer.toBranchKey ?? undefined,
        locationKey: transfer.toLocationKey ?? undefined,
        responsibleUserId: transfer.toResponsibleUserId ?? undefined,
        costCenterKey: transfer.toCostCenterKey ?? undefined,
        status: 'active',
      },
    });

    const updated = await this.prisma.efmFaTransfer.update({
      where: { id: transfer.id },
      data: { status: 'completed', approvedBy: userId, approvedAt: new Date(), completedAt: new Date() },
    });

    await this.audit.log(organizationId, 'EfmFaTransfer', transferKey, 'completed', userId);
    await this.core.emitUserAction(organizationId, 'EfmFaTransfer', transferKey, EVENT_TYPES.EFM_FA_TRANSFER_COMPLETED, {
      assetKey: transfer.assetKey,
    });
    return updated;
  }

  async revalue(organizationId: string, userId: string, input: {
    assetKey: string;
    revaluationType: 'upward' | 'downward' | 'impairment';
    newNbv: number;
    revaluationDate: string;
    reason?: string;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey: input.assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${input.assetKey} no encontrado`);

    const previousNbv = asset.netBookValue;
    const adjustmentAmount = input.newNbv - previousNbv;
    const seq = (await this.prisma.efmFaRevaluation.count({ where: { organizationId } })) + 1;
    const revaluationKey = generateFaKey('REV', seq);

    let accountingRef: string | null = null;
    try {
      const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_FA_REVALUATION_POSTED, {
        assetKey: input.assetKey,
        amount: Math.abs(adjustmentAmount),
        revaluationType: input.revaluationType,
      }, userId);
      if (entry && typeof entry === 'object' && 'entryKey' in entry) {
        accountingRef = String(entry.entryKey);
      }
    } catch {
      if (Math.abs(adjustmentAmount) > 0) {
        const lines = adjustmentAmount > 0
          ? [
            { accountKey: asset.assetAccountKey ?? 'ACC-1520', debit: adjustmentAmount, credit: 0 },
            { accountKey: 'ACC-5905', debit: 0, credit: adjustmentAmount },
          ]
          : [
            { accountKey: 'ACC-5905', debit: Math.abs(adjustmentAmount), credit: 0 },
            { accountKey: asset.assetAccountKey ?? 'ACC-1520', debit: 0, credit: Math.abs(adjustmentAmount) },
          ];
        const entry = await this.engine.createEntry(organizationId, userId, {
          sourceModule: 'fixed_assets',
          sourceDocumentType: 'revaluation',
          sourceDocumentKey: revaluationKey,
          description: `Revalorización ${input.revaluationType} activo ${asset.assetTag}`,
          entryDate: input.revaluationDate,
          lines,
          autoPost: true,
        });
        accountingRef = entry.entryKey;
      }
    }

    await this.prisma.efmFaAsset.update({
      where: { id: asset.id },
      data: {
        netBookValue: input.newNbv,
        acquisitionCost: asset.acquisitionCost + (adjustmentAmount > 0 ? adjustmentAmount : 0),
      },
    });

    const row = await this.prisma.efmFaRevaluation.create({
      data: {
        organizationId,
        revaluationKey,
        assetKey: input.assetKey,
        revaluationType: input.revaluationType,
        previousNbv,
        newNbv: input.newNbv,
        adjustmentAmount,
        revaluationDate: new Date(input.revaluationDate),
        reason: input.reason,
        accountingRef,
        approvedBy: userId,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmFaRevaluation', revaluationKey, 'posted', userId, { adjustmentAmount });
    await this.core.emitUserAction(organizationId, 'EfmFaRevaluation', revaluationKey, EVENT_TYPES.EFM_FA_REVALUATION_POSTED, {
      assetKey: input.assetKey,
    });
    return row;
  }

  async addMaintenance(organizationId: string, userId: string, input: {
    assetKey: string;
    maintenanceType: 'maintenance' | 'repair';
    description: string;
    cost?: number;
    maintenanceDate: string;
    vendorKey?: string;
    isCapitalized?: boolean;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey: input.assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${input.assetKey} no encontrado`);

    const seq = (await this.prisma.efmFaMaintenance.count({ where: { organizationId } })) + 1;
    const maintenanceKey = generateFaKey('MNT', seq);
    const cost = input.cost ?? 0;

    if (input.isCapitalized && cost > 0) {
      await this.prisma.efmFaAsset.update({
        where: { id: asset.id },
        data: {
          acquisitionCost: { increment: cost },
          netBookValue: { increment: cost },
        },
      });
    }

    const row = await this.prisma.efmFaMaintenance.create({
      data: {
        organizationId,
        maintenanceKey,
        assetKey: input.assetKey,
        maintenanceType: input.maintenanceType,
        description: input.description,
        cost,
        maintenanceDate: new Date(input.maintenanceDate),
        vendorKey: input.vendorKey,
        isCapitalized: input.isCapitalized ?? false,
        createdBy: userId,
      },
    });

    if (input.maintenanceType === 'maintenance') {
      await this.prisma.efmFaAsset.update({
        where: { id: asset.id },
        data: { status: 'maintenance' },
      });
    }

    await this.audit.log(organizationId, 'EfmFaMaintenance', maintenanceKey, 'created', userId, { cost });
    await this.core.emitUserAction(organizationId, 'EfmFaMaintenance', maintenanceKey, EVENT_TYPES.EFM_FA_MAINTENANCE_RECORDED, {
      assetKey: input.assetKey,
    });
    return row;
  }

  listDisposals(organizationId: string) {
    return this.prisma.efmFaDisposal.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async dispose(organizationId: string, userId: string, input: {
    assetKey: string;
    disposalType: 'sale' | 'loss' | 'destruction' | 'retirement';
    disposalDate: string;
    proceedsAmount?: number;
    buyerName?: string;
    reason?: string;
    createTreasuryMovement?: boolean;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey: input.assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${input.assetKey} no encontrado`);
    if (['disposed', 'retired'].includes(asset.status)) {
      throw new BadRequestException('Activo ya dado de baja');
    }

    const nbvAtDisposal = asset.netBookValue;
    const proceedsAmount = input.proceedsAmount ?? 0;
    const gainLossAmount = computeDisposalGainLoss(nbvAtDisposal, proceedsAmount);
    const seq = (await this.prisma.efmFaDisposal.count({ where: { organizationId } })) + 1;
    const disposalKey = generateFaKey('DSP', seq);

    let treasuryMovementKey: string | null = null;
    if (input.createTreasuryMovement && proceedsAmount > 0 && input.disposalType === 'sale') {
      const mov = await this.movements.create(organizationId, userId, {
        movementType: 'ar_collection',
        amount: proceedsAmount,
        movementDate: input.disposalDate,
        description: `Venta activo ${asset.assetTag}`,
        sourceModule: 'fixed_assets',
        sourceDocumentKey: disposalKey,
        autoProcess: true,
      });
      treasuryMovementKey = mov.movementKey;
    }

    let accountingRef: string | null = null;
    try {
      const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_FA_DISPOSAL_POSTED, {
        assetKey: input.assetKey,
        nbvAtDisposal,
        proceedsAmount,
        gainLossAmount,
        disposalType: input.disposalType,
      }, userId);
      if (entry && typeof entry === 'object' && 'entryKey' in entry) {
        accountingRef = String(entry.entryKey);
      }
    } catch {
      const lines = [
        { accountKey: asset.depreciationAccountKey ?? 'ACC-1592', debit: asset.accumulatedDepreciation, credit: 0 },
        { accountKey: 'ACC-1110', debit: proceedsAmount, credit: 0 },
        { accountKey: asset.assetAccountKey ?? 'ACC-1520', debit: 0, credit: asset.acquisitionCost },
      ];
      if (gainLossAmount !== 0) {
        lines.push(
          gainLossAmount > 0
            ? { accountKey: 'ACC-4210', debit: 0, credit: gainLossAmount }
            : { accountKey: 'ACC-5395', debit: Math.abs(gainLossAmount), credit: 0 },
        );
      }
      const entry = await this.engine.createEntry(organizationId, userId, {
        sourceModule: 'fixed_assets',
        sourceDocumentType: 'disposal',
        sourceDocumentKey: disposalKey,
        description: `Baja activo ${asset.assetTag} (${input.disposalType})`,
        entryDate: input.disposalDate,
        lines: lines.filter((l) => l.debit > 0 || l.credit > 0),
        autoPost: true,
      });
      accountingRef = entry.entryKey;
    }

    const status = input.disposalType === 'retirement' ? 'retired' : 'disposed';
    await this.prisma.efmFaAsset.update({
      where: { id: asset.id },
      data: { status: status as never, disposedAt: new Date(), netBookValue: 0 },
    });

    const row = await this.prisma.efmFaDisposal.create({
      data: {
        organizationId,
        disposalKey,
        assetKey: input.assetKey,
        disposalType: input.disposalType as never,
        disposalDate: new Date(input.disposalDate),
        nbvAtDisposal,
        proceedsAmount,
        gainLossAmount,
        buyerName: input.buyerName,
        reason: input.reason,
        accountingRef,
        treasuryMovementKey,
        approvedBy: userId,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmFaDisposal', disposalKey, 'completed', userId, { gainLossAmount });
    await this.core.emitUserAction(organizationId, 'EfmFaDisposal', disposalKey, EVENT_TYPES.EFM_FA_DISPOSAL_POSTED, {
      assetKey: input.assetKey,
    });
    return row;
  }
}
