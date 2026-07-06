import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  DEFAULT_APPROVAL_POLICIES,
  evaluateApprovalPolicies,
  nextApprovalLevel,
  type ApprovalPolicy,
} from '../domain/escm-approval.engine';
import { generateApprovalKey } from '../domain/escm-order.engine';
import { checkCreditAvailable } from '../domain/escm-pricing.engine';

@Injectable()
export class EscmOrderApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async listPolicies(organizationId: string, userId?: string) {
    const rows = await this.prisma.escmOrderApprovalPolicy.findMany({
      where: { organizationId },
      orderBy: { triggerType: 'asc' },
    });
    if (!rows.length) return this.seedPolicies(organizationId, userId);
    return rows;
  }

  async seedPolicies(organizationId: string, userId?: string) {
    const created = [];
    for (const [idx, policy] of DEFAULT_APPROVAL_POLICIES.entries()) {
      const policyKey = `POL-${policy.triggerType.toUpperCase()}`;
      const row = await this.prisma.escmOrderApprovalPolicy.upsert({
        where: { organizationId_policyKey: { organizationId, policyKey } },
        update: {},
        create: {
          organizationId,
          policyKey,
          name: `Política ${policy.triggerType}`,
          triggerType: policy.triggerType,
          thresholdValue: policy.thresholdValue,
          thresholdPct: policy.thresholdPct,
          approvalLevels: policy.approvalLevels,
          isActive: policy.isActive,
          ...(userId ? { createdBy: userId } : {}),
        },
      });
      created.push(row);
    }
    return created;
  }

  async upsertPolicy(
    organizationId: string,
    userId: string,
    input: {
      policyKey?: string;
      name: string;
      triggerType: string;
      thresholdValue?: number;
      thresholdPct?: number;
      approvalLevels?: number;
      isActive?: boolean;
    },
  ) {
    const policyKey = input.policyKey ?? `POL-${input.triggerType.toUpperCase()}-${Date.now()}`.slice(0, 120);
    return this.prisma.escmOrderApprovalPolicy.upsert({
      where: { organizationId_policyKey: { organizationId, policyKey } },
      update: {
        name: input.name,
        triggerType: input.triggerType,
        thresholdValue: input.thresholdValue,
        thresholdPct: input.thresholdPct,
        approvalLevels: input.approvalLevels ?? 1,
        isActive: input.isActive ?? true,
      },
      create: {
        organizationId,
        policyKey,
        name: input.name,
        triggerType: input.triggerType,
        thresholdValue: input.thresholdValue,
        thresholdPct: input.thresholdPct,
        approvalLevels: input.approvalLevels ?? 1,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  async evaluateForOrder(
    organizationId: string,
    order: {
      totalAmount: number;
      discountAmount: number;
      subtotal: number;
      customerKey: string;
      metadata?: Record<string, unknown>;
    },
    userId?: string,
  ) {
    const policies = (await this.listPolicies(organizationId, userId)) as ApprovalPolicy[];
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: order.customerKey, deletedAt: null },
    });
    const creditExceeded = customer
      ? !checkCreditAvailable(customer.creditLimit ?? 0, customer.creditUsed, order.totalAmount)
      : false;
    const discountPct =
      order.subtotal > 0 ? Number(((order.discountAmount / order.subtotal) * 100).toFixed(2)) : 0;
    const hasExceptionalTerms = Boolean((order.metadata as { exceptionalTerms?: boolean })?.exceptionalTerms);
    return evaluateApprovalPolicies({
      orderTotal: order.totalAmount,
      discountPct,
      creditExceeded,
      hasExceptionalTerms,
      policies,
    });
  }

  async createApprovalChain(
    organizationId: string,
    userId: string,
    orderId: string,
    orderKey: string,
    requirement: { triggers: string[]; maxLevels: number; reasons: string[] },
  ) {
    const approvals = [];
    for (let level = 1; level <= requirement.maxLevels; level += 1) {
      const count = await this.prisma.escmOrderApproval.count({ where: { organizationId } });
      const approvalKey = generateApprovalKey(count + 1);
      const row = await this.prisma.escmOrderApproval.create({
        data: {
          organizationId,
          approvalKey,
          orderId,
          orderKey,
          level,
          status: level === 1 ? 'pending' : 'pending',
          triggerType: requirement.triggers[0] ?? 'manual',
          metadata: { reasons: requirement.reasons, triggers: requirement.triggers },
        },
      });
      approvals.push(row);
    }
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'approval_chain_created', userId, {
      levels: requirement.maxLevels,
      triggers: requirement.triggers,
    });
    return approvals;
  }

  listPending(organizationId: string, userId?: string) {
    return this.prisma.escmOrderApproval.findMany({
      where: {
        organizationId,
        status: 'pending',
        ...(userId ? { assignedUserId: userId } : {}),
      },
      include: { order: { include: { customer: true } } },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
  }

  async approve(
    organizationId: string,
    userId: string,
    approvalKey: string,
    comments?: string,
  ) {
    const approval = await this.prisma.escmOrderApproval.findFirst({
      where: { organizationId, approvalKey },
      include: { order: true },
    });
    if (!approval) throw new NotFoundException(`Aprobación ${approvalKey} no encontrada`);
    if (approval.status !== 'pending') {
      throw new BadRequestException('La aprobación ya fue procesada');
    }

    await this.prisma.escmOrderApproval.update({
      where: { id: approval.id },
      data: {
        status: 'approved',
        decidedBy: userId,
        decidedAt: new Date(),
        comments,
      },
    });

    const order = approval.order;
    const pendingAtLevel = await this.prisma.escmOrderApproval.count({
      where: { orderId: order.id, status: 'pending' },
    });

    if (pendingAtLevel === 0) {
      await this.prisma.escmSalesOrder.update({
        where: { id: order.id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userId,
          requiresApproval: false,
          updatedBy: userId,
        },
      });
      await this.logStatus(organizationId, order.id, order.orderKey, 'pending_approval', 'approved', userId, comments);
      await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_APPROVED, {
        orderKey: order.orderKey,
        approvalKey,
      });
    } else {
      const nextPending = await this.prisma.escmOrderApproval.findFirst({
        where: { orderId: order.id, status: 'pending' },
        orderBy: { level: 'asc' },
      });
      if (nextPending) {
        const { nextLevel } = nextApprovalLevel(approval.level, order.approvalLevel, 'approved');
        await this.prisma.escmSalesOrder.update({
          where: { id: order.id },
          data: { approvalLevel: nextLevel, updatedBy: userId },
        });
      }
    }

    await this.audit.log(organizationId, 'SalesOrder', order.orderKey, 'approval_granted', userId, {
      approvalKey,
      level: approval.level,
      comments,
    });
    return this.prisma.escmOrderApproval.findFirst({ where: { id: approval.id } });
  }

  async reject(
    organizationId: string,
    userId: string,
    approvalKey: string,
    comments?: string,
  ) {
    const approval = await this.prisma.escmOrderApproval.findFirst({
      where: { organizationId, approvalKey },
      include: { order: true },
    });
    if (!approval) throw new NotFoundException(`Aprobación ${approvalKey} no encontrada`);
    if (approval.status !== 'pending') {
      throw new BadRequestException('La aprobación ya fue procesada');
    }

    await this.prisma.escmOrderApproval.update({
      where: { id: approval.id },
      data: {
        status: 'rejected',
        decidedBy: userId,
        decidedAt: new Date(),
        comments,
      },
    });

    await this.prisma.escmOrderApproval.updateMany({
      where: { orderId: approval.orderId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    await this.prisma.escmSalesOrder.update({
      where: { id: approval.orderId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: comments,
        updatedBy: userId,
      },
    });

    await this.logStatus(organizationId, approval.orderId, approval.orderKey, 'pending_approval', 'rejected', userId, comments);
    await this.audit.log(organizationId, 'SalesOrder', approval.orderKey, 'approval_rejected', userId, {
      approvalKey,
      comments,
    });
    await this.core.emitUserAction(organizationId, 'EscmSalesOrder', approval.orderId, EVENT_TYPES.ESCM_ORDER_REJECTED, {
      orderKey: approval.orderKey,
      approvalKey,
      reason: comments,
    });
    return approval;
  }

  private async logStatus(
    organizationId: string,
    orderId: string,
    orderKey: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
    reason?: string,
  ) {
    await this.prisma.escmOrderStatusLog.create({
      data: {
        organizationId,
        orderId,
        orderKey,
        fromStatus,
        toStatus,
        changedBy: userId,
        reason,
      },
    });
  }
}
