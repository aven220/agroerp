import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import {
  generatePackingKey,
  generateWaveKey,
  groupTasksByZone,
  verifyPickQuantities,
} from '../domain/escm-logistics.engine';

@Injectable()
export class EscmPickingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  listWaves(organizationId: string, status?: string) {
    return this.prisma.escmPickWave.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createWave(
    organizationId: string,
    userId: string,
    input: {
      warehouseKey: string;
      orderKeys: string[];
      zoneKeys?: string[];
      priority?: number;
    },
  ) {
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: {
        organizationId,
        orderKey: { in: input.orderKeys },
        status: { in: ['reserved', 'in_preparation', 'ready_for_dispatch', 'approved'] },
      },
      include: { lines: true },
    });
    if (!orders.length) throw new BadRequestException('No hay pedidos elegibles para la ola');

    const count = await this.prisma.escmPickWave.count({ where: { organizationId } });
    const waveKey = generateWaveKey(count + 1);
    const wave = await this.prisma.escmPickWave.create({
      data: {
        organizationId,
        waveKey,
        warehouseKey: input.warehouseKey,
        zoneKeys: input.zoneKeys ?? [],
        orderKeys: input.orderKeys,
        priority: input.priority ?? 50,
        createdBy: userId,
      },
    });

    let taskSeq = 0;
    for (const order of orders) {
      for (const line of order.lines) {
        const pending = line.quantity - line.shippedQty;
        if (pending <= 0) continue;
        taskSeq += 1;
        const location = await this.prisma.eimsLocation.findFirst({
          where: {
            organizationId,
            warehouse: { warehouseKey: input.warehouseKey },
            isActive: true,
          },
          orderBy: { locationKey: 'asc' },
        });
        await this.prisma.escmPickTask.create({
          data: {
            organizationId,
            taskKey: `${waveKey}-T${taskSeq}`,
            waveId: wave.id,
            orderKey: order.orderKey,
            orderLineKey: line.lineKey,
            zoneKey: location?.aisle ?? input.zoneKeys?.[0] ?? 'ZONE-A',
            locationKey: location?.locationKey,
            itemKey: line.itemKey,
            quantityRequired: pending,
            metadata: { lotKey: (line.metadata as { lotKey?: string })?.lotKey },
          },
        });
      }
    }

    await this.audit.log(organizationId, 'PickWave', waveKey, 'created', userId, {
      orderKeys: input.orderKeys,
      taskCount: taskSeq,
    });
    return this.getWave(organizationId, waveKey);
  }

  async getWave(organizationId: string, waveKey: string) {
    const wave = await this.prisma.escmPickWave.findFirst({
      where: { organizationId, waveKey },
      include: { tasks: { orderBy: { zoneKey: 'asc' } } },
    });
    if (!wave) throw new NotFoundException(`Ola ${waveKey} no encontrada`);
    return { ...wave, byZone: Object.fromEntries(groupTasksByZone(wave.tasks)) };
  }

  async releaseWave(organizationId: string, userId: string, waveKey: string) {
    const wave = await this.getWave(organizationId, waveKey);
    if (wave.status !== 'draft') throw new BadRequestException('La ola ya fue liberada');
    await this.prisma.escmPickWave.update({
      where: { id: wave.id },
      data: { status: 'released', releasedAt: new Date() },
    });
    await this.audit.log(organizationId, 'PickWave', waveKey, 'released', userId, {});
    return this.getWave(organizationId, waveKey);
  }

  async pickTask(
    organizationId: string,
    userId: string,
    taskKey: string,
    input: {
      quantityPicked: number;
      lotKey?: string;
      serialKey?: string;
    },
  ) {
    const task = await this.prisma.escmPickTask.findFirst({
      where: { organizationId, taskKey },
    });
    if (!task) throw new NotFoundException(`Tarea ${taskKey} no encontrada`);
    const check = verifyPickQuantities(task.quantityRequired, input.quantityPicked);
    const status = check.ok ? 'picked' : check.short ? 'short' : 'picked';

    const updated = await this.prisma.escmPickTask.update({
      where: { id: task.id },
      data: {
        quantityPicked: input.quantityPicked,
        lotKey: input.lotKey ?? task.lotKey,
        serialKey: input.serialKey ?? task.serialKey,
        status,
        pickedBy: userId,
        pickedAt: new Date(),
      },
    });

    await this.prisma.escmPickWave.update({
      where: { id: task.waveId },
      data: { status: 'in_progress' },
    });

    await this.audit.log(organizationId, 'PickTask', taskKey, 'picked', userId, input);
    return updated;
  }

  async verifyTask(organizationId: string, userId: string, taskKey: string) {
    const task = await this.prisma.escmPickTask.findFirst({
      where: { organizationId, taskKey },
    });
    if (!task) throw new NotFoundException(`Tarea ${taskKey} no encontrada`);
    if (task.quantityPicked < task.quantityRequired) {
      throw new BadRequestException('Cantidad pickeada insuficiente');
    }
    const updated = await this.prisma.escmPickTask.update({
      where: { id: task.id },
      data: { status: 'verified' },
    });
    await this.audit.log(organizationId, 'PickTask', taskKey, 'verified', userId, {});
    return updated;
  }

  async completeWave(organizationId: string, userId: string, waveKey: string) {
    const wave = await this.getWave(organizationId, waveKey);
    const pending = wave.tasks.filter((t) => !['verified', 'picked', 'short'].includes(t.status));
    if (pending.length) throw new BadRequestException('Hay tareas pendientes en la ola');
    await this.prisma.escmPickWave.update({
      where: { id: wave.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await this.audit.log(organizationId, 'PickWave', waveKey, 'completed', userId, {});
    return this.getWave(organizationId, waveKey);
  }

  async createPacking(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    lines?: Array<{ itemKey: string; quantity: number; lotKey?: string; serialKey?: string }>,
  ) {
    const dispatch = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { lines: true },
    });
    if (!dispatch) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);

    const count = await this.prisma.escmPacking.count({ where: { organizationId } });
    const packingKey = generatePackingKey(count + 1);
    const sourceLines = lines ?? dispatch.lines.map((l) => ({
      itemKey: l.itemKey,
      quantity: l.pickedQty || l.quantity,
      lotKey: l.lotKey ?? undefined,
      serialKey: l.serialKey ?? undefined,
    }));

    const packing = await this.prisma.escmPacking.create({
      data: {
        organizationId,
        packingKey,
        dispatchId: dispatch.id,
        status: 'in_progress',
        lines: {
          create: sourceLines.map((l) => ({
            itemKey: l.itemKey,
            quantity: l.quantity,
            lotKey: l.lotKey,
            serialKey: l.serialKey,
          })),
        },
      },
      include: { lines: true },
    });

    await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: { status: 'packing', updatedBy: userId },
    });

    await this.audit.log(organizationId, 'Packing', packingKey, 'created', userId, { dispatchKey });
    return packing;
  }

  async verifyPacking(organizationId: string, userId: string, packingKey: string) {
    const packing = await this.prisma.escmPacking.findFirst({
      where: { organizationId, packingKey },
      include: { lines: true, dispatch: true },
    });
    if (!packing) throw new NotFoundException(`Packing ${packingKey} no encontrado`);

    await this.prisma.escmPackingLine.updateMany({
      where: { packingId: packing.id },
      data: { verified: true },
    });

    const updated = await this.prisma.escmPacking.update({
      where: { id: packing.id },
      data: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: userId,
        labelKey: `LBL-${packingKey}`,
      },
      include: { lines: true },
    });

    for (const line of packing.lines) {
      await this.prisma.escmDispatchLine.updateMany({
        where: {
          dispatchId: packing.dispatchId,
          itemKey: line.itemKey,
        },
        data: { packedQty: line.quantity, verified: true },
      });
    }

    await this.prisma.escmDispatch.update({
      where: { id: packing.dispatchId },
      data: { status: 'ready', updatedBy: userId },
    });

    await this.audit.log(organizationId, 'Packing', packingKey, 'verified', userId, {});
    return updated;
  }
}
