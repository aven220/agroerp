import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { canApproveWarranty, generateWarrantyKey } from '../domain/escm-billing.engine';

@Injectable()
export class EscmWarrantyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, filters?: { status?: string; customerKey?: string }) {
    return this.prisma.escmWarrantyClaim.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, claimKey: string) {
    const row = await this.prisma.escmWarrantyClaim.findFirst({
      where: { organizationId, claimKey },
      include: { invoice: true },
    });
    if (!row) throw new NotFoundException(`Garantía ${claimKey} no encontrada`);
    return row;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      claimType: string;
      customerKey: string;
      invoiceKey?: string;
      orderKey?: string;
      itemKey?: string;
      description: string;
      evidenceUrls?: string[];
    },
  ) {
    if (!input.description?.trim()) throw new BadRequestException('Descripción requerida');

    let invoiceId: string | undefined;
    let invoiceKey: string | undefined;
    if (input.invoiceKey) {
      const inv = await this.prisma.escmInvoice.findFirst({
        where: { organizationId, invoiceKey: input.invoiceKey },
      });
      if (!inv) throw new NotFoundException(`Factura ${input.invoiceKey} no encontrada`);
      invoiceId = inv.id;
      invoiceKey = inv.invoiceKey;
    }

    const count = await this.prisma.escmWarrantyClaim.count({ where: { organizationId } });
    const claimKey = generateWarrantyKey(count + 1);

    const row = await this.prisma.escmWarrantyClaim.create({
      data: {
        organizationId,
        claimKey,
        status: 'draft',
        claimType: input.claimType,
        invoiceId,
        invoiceKey,
        orderKey: input.orderKey,
        customerKey: input.customerKey,
        itemKey: input.itemKey,
        description: input.description,
        evidenceUrls: (input.evidenceUrls ?? []) as object,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'WarrantyClaim', claimKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmWarrantyClaim', row.id, EVENT_TYPES.ESCM_WARRANTY_CREATED, {
      claimKey,
    });
    return row;
  }

  async submit(organizationId: string, userId: string, claimKey: string) {
    const row = await this.getOne(organizationId, claimKey);
    if (row.status !== 'draft') throw new BadRequestException('Solo borradores pueden enviarse');

    const updated = await this.prisma.escmWarrantyClaim.update({
      where: { id: row.id },
      data: { status: 'pending_approval' },
    });

    await this.audit.log(organizationId, 'WarrantyClaim', claimKey, 'submitted', userId);
    return updated;
  }

  async approve(organizationId: string, userId: string, claimKey: string, resolutionType: 'replacement' | 'repair') {
    const row = await this.getOne(organizationId, claimKey);
    if (!canApproveWarranty(row.status)) {
      throw new BadRequestException('Garantía no puede aprobarse en este estado');
    }

    const status = resolutionType === 'replacement' ? 'replacement' : 'in_repair';
    const updated = await this.prisma.escmWarrantyClaim.update({
      where: { id: row.id },
      data: {
        status,
        resolutionType,
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'WarrantyClaim', claimKey, 'approved', userId, { resolutionType });
    await this.core.emitUserAction(organizationId, 'EscmWarrantyClaim', updated.id, EVENT_TYPES.ESCM_WARRANTY_APPROVED, {
      claimKey,
      resolutionType,
    });
    return updated;
  }

  async reject(organizationId: string, userId: string, claimKey: string, reason: string) {
    const row = await this.getOne(organizationId, claimKey);
    if (!['pending_approval', 'draft'].includes(row.status)) {
      throw new BadRequestException('Garantía no puede rechazarse');
    }

    const updated = await this.prisma.escmWarrantyClaim.update({
      where: { id: row.id },
      data: { status: 'rejected', rejectedReason: reason },
    });

    await this.audit.log(organizationId, 'WarrantyClaim', claimKey, 'rejected', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmWarrantyClaim', updated.id, EVENT_TYPES.ESCM_WARRANTY_REJECTED, {
      claimKey,
      reason,
    });
    return updated;
  }

  async resolve(organizationId: string, userId: string, claimKey: string, notes?: string) {
    const row = await this.getOne(organizationId, claimKey);
    if (!['replacement', 'in_repair', 'approved'].includes(row.status)) {
      throw new BadRequestException('Garantía no está en resolución');
    }

    const updated = await this.prisma.escmWarrantyClaim.update({
      where: { id: row.id },
      data: {
        status: 'closed',
        resolvedAt: new Date(),
        resolvedBy: userId,
        metadata: { ...(row.metadata as object), resolutionNotes: notes },
      },
    });

    await this.audit.log(organizationId, 'WarrantyClaim', claimKey, 'closed', userId, { notes });
    await this.core.emitUserAction(organizationId, 'EscmWarrantyClaim', updated.id, EVENT_TYPES.ESCM_WARRANTY_CLOSED, {
      claimKey,
    });
    return updated;
  }

  history(organizationId: string, claimKey: string) {
    return this.audit.findAll(organizationId).then((logs) =>
      logs.filter(
        (l) =>
          l.entityType === 'WarrantyClaim' &&
          (l.entityKey === claimKey || (l.details as { claimKey?: string })?.claimKey === claimKey),
      ),
    );
  }
}
