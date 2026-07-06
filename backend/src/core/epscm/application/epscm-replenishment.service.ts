import { Injectable } from '@nestjs/common';
import { EpscmProposalStatus, EpscmReplenishmentMode, EpscmReplenishmentType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EpscmAuditService } from './epscm-audit.service';
import {
  computeReorderPoint,
  computeReplenishmentQty,
  computeSafetyStock,
  generateEpscmKey,
} from '../domain/epscm-planning.engine';

@Injectable()
export class EpscmReplenishmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  listPolicies(organizationId: string) {
    return this.prisma.epscmReplenishmentPolicy.findMany({
      where: { organizationId, isActive: true },
      take: 500,
    });
  }

  async upsertPolicy(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      warehouseKey?: string;
      minStock?: number;
      maxStock?: number;
      safetyStock?: number;
      leadTimeDays?: number;
      replenishmentMode?: EpscmReplenishmentMode;
    },
  ) {
    const avgDaily = input.minStock ? input.minStock / 30 : 1;
    const safety = input.safetyStock ?? computeSafetyStock(avgDaily, input.leadTimeDays ?? 7);
    const reorderPoint = computeReorderPoint(avgDaily, input.leadTimeDays ?? 7, safety);

    const existing = await this.prisma.epscmReplenishmentPolicy.findFirst({
      where: {
        organizationId,
        itemKey: input.itemKey,
        warehouseKey: input.warehouseKey ?? null,
      },
    });

    if (existing) {
      return this.prisma.epscmReplenishmentPolicy.update({
        where: { organizationId_policyKey: { organizationId, policyKey: existing.policyKey } },
        data: {
          minStock: input.minStock ?? existing.minStock,
          maxStock: input.maxStock ?? existing.maxStock,
          safetyStock: safety,
          reorderPoint,
          leadTimeDays: input.leadTimeDays ?? existing.leadTimeDays,
          replenishmentMode: input.replenishmentMode ?? existing.replenishmentMode,
        },
      });
    }

    const seq = await this.prisma.epscmReplenishmentPolicy.count({ where: { organizationId } });
    const policy = await this.prisma.epscmReplenishmentPolicy.create({
      data: {
        organizationId,
        policyKey: generateEpscmKey('POL', seq + 1),
        itemKey: input.itemKey,
        warehouseKey: input.warehouseKey,
        minStock: input.minStock ?? 0,
        maxStock: input.maxStock ?? 0,
        safetyStock: safety,
        reorderPoint,
        leadTimeDays: input.leadTimeDays ?? 7,
        replenishmentMode: input.replenishmentMode ?? EpscmReplenishmentMode.automatic,
      },
    });
    await this.audit.log(organizationId, 'EpscmReplenishmentPolicy', policy.policyKey, 'created', userId);
    return policy;
  }

  listProposals(organizationId: string, status?: EpscmProposalStatus) {
    return this.prisma.epscmReplenishmentProposal.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { proposedAt: 'desc' },
      take: 200,
    });
  }

  async runAutomaticReplenishment(organizationId: string, userId: string) {
    const policies = await this.listPolicies(organizationId);
    const proposals = [];

    for (const policy of policies) {
      if (policy.replenishmentMode !== EpscmReplenishmentMode.automatic) continue;

      const item = await this.prisma.eimsItem.findFirst({
        where: { organizationId, itemKey: policy.itemKey },
      });
      if (!item) continue;

      const balances = await this.prisma.eimsStockBalance.findMany({
        where: { organizationId, itemId: item.id },
      });
      const currentQty = balances.reduce((s, b) => s + b.onHandQty, 0);

      const proposedQty = computeReplenishmentQty(currentQty, policy.reorderPoint, policy.maxStock);
      if (proposedQty <= 0) continue;

      const hasBom = await this.prisma.emfgBom.count({
        where: { organizationId, itemKey: policy.itemKey, isActive: true },
      });
      const proposalType = hasBom > 0
        ? EpscmReplenishmentType.production
        : EpscmReplenishmentType.purchase;

      const seq = await this.prisma.epscmReplenishmentProposal.count({ where: { organizationId } });
      const proposal = await this.prisma.epscmReplenishmentProposal.create({
        data: {
          organizationId,
          proposalKey: generateEpscmKey('RPP', seq + 1),
          itemKey: policy.itemKey,
          warehouseKey: policy.warehouseKey,
          proposalType,
          currentQty,
          proposedQty,
          reorderPoint: policy.reorderPoint,
          mode: EpscmReplenishmentMode.automatic,
        },
      });
      proposals.push(proposal);
    }

    await this.audit.log(organizationId, 'EpscmReplenishmentProposal', 'batch', 'replenishment_proposed', userId, {
      count: proposals.length,
    });

    return proposals;
  }

  async createManualProposal(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      proposedQty: number;
      proposalType: EpscmReplenishmentType;
      warehouseKey?: string;
    },
  ) {
    const item = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey: input.itemKey },
    });
    const balances = item
      ? await this.prisma.eimsStockBalance.findMany({ where: { organizationId, itemId: item.id } })
      : [];
    const currentQty = balances.reduce((s, b) => s + b.onHandQty, 0);

    const seq = await this.prisma.epscmReplenishmentProposal.count({ where: { organizationId } });
    const proposal = await this.prisma.epscmReplenishmentProposal.create({
      data: {
        organizationId,
        proposalKey: generateEpscmKey('RPP', seq + 1),
        itemKey: input.itemKey,
        warehouseKey: input.warehouseKey,
        proposalType: input.proposalType,
        currentQty,
        proposedQty: input.proposedQty,
        mode: EpscmReplenishmentMode.manual,
      },
    });
    await this.audit.log(organizationId, 'EpscmReplenishmentProposal', proposal.proposalKey, 'replenishment_proposed', userId);
    return proposal;
  }

  approveProposal(organizationId: string, userId: string, proposalKey: string) {
    return this.prisma.epscmReplenishmentProposal.update({
      where: { organizationId_proposalKey: { organizationId, proposalKey } },
      data: { status: EpscmProposalStatus.approved },
    });
  }
}
