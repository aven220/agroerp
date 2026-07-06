import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsMovementService } from '@/core/eims/application/eims-movement.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmNoteService } from './escm-note.service';
import { canProcessReturn, generateReturnKey } from '../domain/escm-billing.engine';

type ReturnLineInput = {
  itemKey: string;
  quantity: number;
  lotKey?: string;
  serialKey?: string;
  reason?: string;
};

@Injectable()
export class EscmReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly movements: EimsMovementService,
    private readonly notes: EscmNoteService,
  ) {}

  list(organizationId: string, filters?: { status?: string; customerKey?: string; returnType?: string }) {
    return this.prisma.escmReturn.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.returnType ? { returnType: filters.returnType as never } : {}),
      },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, returnKey: string) {
    const row = await this.prisma.escmReturn.findFirst({
      where: { organizationId, returnKey },
      include: { lines: true, invoice: true, creditNotes: true },
    });
    if (!row) throw new NotFoundException(`Devolución ${returnKey} no encontrada`);
    return row;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      returnType: string;
      customerKey: string;
      invoiceKey?: string;
      orderKey?: string;
      dispatchKey?: string;
      warehouseKey?: string;
      reason: string;
      lines: ReturnLineInput[];
      notes?: string;
    },
  ) {
    if (!input.lines?.length) throw new BadRequestException('Líneas requeridas');
    if (!input.reason?.trim()) throw new BadRequestException('Motivo requerido');

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

    const count = await this.prisma.escmReturn.count({ where: { organizationId } });
    const returnKey = generateReturnKey(count + 1);

    const row = await this.prisma.escmReturn.create({
      data: {
        organizationId,
        returnKey,
        status: 'draft',
        returnType: input.returnType as never,
        invoiceId,
        invoiceKey,
        orderKey: input.orderKey,
        dispatchKey: input.dispatchKey,
        customerKey: input.customerKey,
        warehouseKey: input.warehouseKey,
        reason: input.reason,
        notes: input.notes,
        createdBy: userId,
        lines: {
          create: input.lines.map((l) => ({
            itemKey: l.itemKey,
            quantity: l.quantity,
            lotKey: l.lotKey,
            serialKey: l.serialKey,
            reason: l.reason,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'Return', returnKey, 'created', userId, {
      returnType: input.returnType,
    });
    await this.core.emitUserAction(organizationId, 'EscmReturn', row.id, EVENT_TYPES.ESCM_RETURN_CREATED, {
      returnKey,
      returnType: input.returnType,
    });
    return row;
  }

  async submit(organizationId: string, userId: string, returnKey: string) {
    const row = await this.getOne(organizationId, returnKey);
    if (row.status !== 'draft') throw new BadRequestException('Solo borradores pueden enviarse');

    const updated = await this.prisma.escmReturn.update({
      where: { id: row.id },
      data: { status: 'submitted' },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'Return', returnKey, 'submitted', userId);
    return updated;
  }

  async approve(organizationId: string, userId: string, returnKey: string) {
    const row = await this.getOne(organizationId, returnKey);
    if (row.status !== 'submitted') throw new BadRequestException('Devolución no está pendiente de aprobación');

    const updated = await this.prisma.escmReturn.update({
      where: { id: row.id },
      data: { status: 'approved', approvedAt: new Date(), approvedBy: userId },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'Return', returnKey, 'approved', userId);
    await this.core.emitUserAction(organizationId, 'EscmReturn', updated.id, EVENT_TYPES.ESCM_RETURN_APPROVED, {
      returnKey,
    });
    return updated;
  }

  async reject(organizationId: string, userId: string, returnKey: string, reason: string) {
    const row = await this.getOne(organizationId, returnKey);
    if (!['submitted', 'approved'].includes(row.status)) {
      throw new BadRequestException('Devolución no puede rechazarse');
    }

    const updated = await this.prisma.escmReturn.update({
      where: { id: row.id },
      data: { status: 'rejected', rejectedReason: reason },
    });

    await this.audit.log(organizationId, 'Return', returnKey, 'rejected', userId, { reason });
    return updated;
  }

  async process(organizationId: string, userId: string, returnKey: string) {
    const row = await this.getOne(organizationId, returnKey);
    if (!canProcessReturn(row.status)) {
      throw new BadRequestException('Devolución debe estar aprobada para procesarse');
    }
    if (!row.warehouseKey) throw new BadRequestException('Bodega de reingreso requerida');

    for (const line of row.lines) {
      await this.movements.post(organizationId, userId, {
        movementType: 'return',
        itemKey: line.itemKey,
        quantity: line.quantity,
        toWarehouseKey: row.warehouseKey,
        lotKey: line.lotKey ?? undefined,
        serialNumber: line.serialKey ?? undefined,
        documentKey: returnKey,
        documentType: 'escm_return',
        reason: row.reason,
        sourceRef: returnKey,
        source: 'escm',
      });

      await this.prisma.escmReturnLine.update({
        where: { id: line.id },
        data: { restockedQty: line.quantity },
      });
    }

    const updated = await this.prisma.escmReturn.update({
      where: { id: row.id },
      data: { status: 'processed', processedAt: new Date() },
      include: { lines: true },
    });

    await this.notes.createFromReturn(organizationId, userId, returnKey);

    await this.audit.log(organizationId, 'Return', returnKey, 'processed', userId);
    await this.core.emitUserAction(organizationId, 'EscmReturn', updated.id, EVENT_TYPES.ESCM_RETURN_PROCESSED, {
      returnKey,
    });
    return updated;
  }
}
