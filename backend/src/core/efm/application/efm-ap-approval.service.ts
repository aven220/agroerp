import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_AP_APPROVAL_LEVELS } from '../domain/efm-ap.engine';

@Injectable()
export class EfmApApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  listPending(organizationId: string) {
    return this.prisma.efmApPayment.findMany({
      where: { organizationId, status: 'pending_approval' },
      include: {
        approvals: { where: { status: 'pending' }, orderBy: { approvalLevel: 'asc' } },
        allocations: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async initPaymentApprovals(organizationId: string, paymentId: string, paymentKey: string, amount: number) {
    const levels = DEFAULT_AP_APPROVAL_LEVELS.filter(
      (l) => l.amountLimit == null || amount <= l.amountLimit,
    );
    const maxLevel = levels.length ? Math.max(...levels.map((l) => l.level)) : 1;

    for (let level = 1; level <= maxLevel; level += 1) {
      const cfg = DEFAULT_AP_APPROVAL_LEVELS.find((l) => l.level === level);
      await this.prisma.efmApPaymentApproval.create({
        data: {
          organizationId,
          paymentId,
          paymentKey,
          approvalLevel: level,
          status: 'pending',
          amountLimit: cfg?.amountLimit ?? undefined,
          roleKey: cfg?.roleKey,
        },
      });
    }
  }

  async approvePayment(
    organizationId: string,
    paymentKey: string,
    userId: string,
    comments?: string,
    delegatedFromUserId?: string,
  ) {
    const payment = await this.prisma.efmApPayment.findFirst({
      where: { organizationId, paymentKey },
      include: { approvals: { orderBy: { approvalLevel: 'asc' } } },
    });
    if (!payment) throw new NotFoundException(`Pago ${paymentKey} no encontrado`);
    if (payment.status !== 'pending_approval') {
      throw new BadRequestException('Pago no pendiente de aprobación');
    }

    const next = payment.approvals.find((a) => a.status === 'pending');
    if (!next) throw new BadRequestException('No hay nivel de aprobación pendiente');

    await this.prisma.efmApPaymentApproval.update({
      where: { id: next.id },
      data: {
        status: delegatedFromUserId ? 'delegated' : 'approved',
        approverUserId: userId,
        delegatedFromUserId,
        comments,
        decidedAt: new Date(),
      },
    });

    const remaining = payment.approvals.filter((a) => a.id !== next.id && a.status === 'pending');
    const allApproved = remaining.length === 0;

    const updated = await this.prisma.efmApPayment.update({
      where: { id: payment.id },
      data: { status: allApproved ? 'approved' : 'pending_approval' },
      include: { approvals: true, allocations: true },
    });

    await this.audit.log(organizationId, 'EfmApPayment', paymentKey, 'approved', userId, {
      level: next.approvalLevel,
      comments,
    });
    await this.core.emitUserAction(organizationId, 'EfmApPayment', paymentKey, EVENT_TYPES.EFM_AP_PAYMENT_APPROVED, {
      level: next.approvalLevel,
    });
    return updated;
  }

  async rejectPayment(organizationId: string, paymentKey: string, userId: string, reason: string) {
    const payment = await this.prisma.efmApPayment.findFirst({
      where: { organizationId, paymentKey },
      include: { approvals: true },
    });
    if (!payment) throw new NotFoundException(`Pago ${paymentKey} no encontrado`);

    const next = payment.approvals.find((a) => a.status === 'pending');
    if (next) {
      await this.prisma.efmApPaymentApproval.update({
        where: { id: next.id },
        data: { status: 'rejected', approverUserId: userId, comments: reason, decidedAt: new Date() },
      });
    }

    const updated = await this.prisma.efmApPayment.update({
      where: { id: payment.id },
      data: { status: 'rejected', blockReason: reason },
      include: { approvals: true },
    });

    await this.audit.log(organizationId, 'EfmApPayment', paymentKey, 'rejected', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EfmApPayment', paymentKey, EVENT_TYPES.EFM_AP_PAYMENT_REJECTED, { reason });
    return updated;
  }

  getApprovalHistory(organizationId: string, paymentKey: string) {
    return this.prisma.efmApPaymentApproval.findMany({
      where: { organizationId, paymentKey },
      orderBy: { approvalLevel: 'asc' },
    });
  }
}
