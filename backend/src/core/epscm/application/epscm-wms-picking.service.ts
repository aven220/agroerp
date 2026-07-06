import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmWmsPickMode, EpscmWmsPickStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  computePickVariance,
  generateEpscmWmsKey,
  groupPickTasksByZone,
  sortPickTasksByPriority,
} from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';

@Injectable()
export class EpscmWmsPickingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmWmsIntegrationService,
  ) {}

  listWaves(organizationId: string, warehouseKey?: string) {
    return this.prisma.epscmWmsPickWave.findMany({
      where: { organizationId, ...(warehouseKey ? { warehouseKey } : {}) },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listTasks(organizationId: string, status?: EpscmWmsPickStatus, orderKey?: string) {
    return this.prisma.epscmWmsPickTask.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        ...(orderKey ? { orderKey } : {}),
      },
      orderBy: [{ priority: 'desc' }, { taskKey: 'asc' }],
    });
  }

  async createWave(
    organizationId: string,
    userId: string,
    warehouseKey: string,
    pickMode: EpscmWmsPickMode,
    orderKeys: string[],
    priority = 50,
  ) {
    const seq = await this.prisma.epscmWmsPickWave.count({ where: { organizationId } });
    const waveKey = generateEpscmWmsKey('WAVE', seq + 1);
    const wave = await this.prisma.epscmWmsPickWave.create({
      data: {
        organizationId,
        waveKey,
        warehouseKey,
        pickMode,
        priority,
        status: 'pending',
      },
    });

    for (const orderKey of orderKeys) {
      const lines = await this.prisma.escmSalesOrderLine.findMany({
        where: { order: { organizationId, orderKey } },
        take: 50,
      });
      for (const line of lines) {
        const tseq = await this.prisma.epscmWmsPickTask.count({ where: { organizationId } });
        await this.prisma.epscmWmsPickTask.create({
          data: {
            organizationId,
            taskKey: generateEpscmWmsKey('PICK', tseq + 1),
            waveKey,
            orderKey,
            itemKey: line.itemKey,
            pickMode,
            requestedQty: Number(line.quantity),
            priority,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'EpscmWmsPickWave', waveKey, 'created', userId);
    return this.prisma.epscmWmsPickWave.findFirst({
      where: { organizationId, waveKey },
      include: { tasks: true },
    });
  }

  async releaseWave(organizationId: string, userId: string, waveKey: string) {
    const wave = await this.prisma.epscmWmsPickWave.findFirst({ where: { organizationId, waveKey } });
    if (!wave) throw new NotFoundException('Wave not found');
    await this.prisma.epscmWmsPickWave.update({
      where: { id: wave.id },
      data: { status: 'in_progress', releasedAt: new Date() },
    });
    await this.prisma.epscmWmsPickTask.updateMany({
      where: { organizationId, waveKey, status: 'pending' },
      data: { status: 'in_progress' },
    });
    await this.audit.log(organizationId, 'EpscmWmsPickWave', waveKey, 'updated', userId, { released: true });
    return this.listWaves(organizationId, wave.warehouseKey);
  }

  async createManualTask(
    organizationId: string,
    userId: string,
    input: { orderKey: string; itemKey: string; locationKey?: string; requestedQty: number; priority?: number },
  ) {
    const seq = await this.prisma.epscmWmsPickTask.count({ where: { organizationId } });
    const task = await this.prisma.epscmWmsPickTask.create({
      data: {
        organizationId,
        taskKey: generateEpscmWmsKey('PICK', seq + 1),
        orderKey: input.orderKey,
        itemKey: input.itemKey,
        locationKey: input.locationKey,
        pickMode: 'manual',
        requestedQty: input.requestedQty,
        priority: input.priority ?? 50,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsPickTask', task.taskKey, 'created', userId);
    return task;
  }

  async confirmPick(
    organizationId: string,
    userId: string,
    taskKey: string,
    pickedQty: number,
    pickerKey?: string,
  ) {
    const task = await this.prisma.epscmWmsPickTask.findFirst({ where: { organizationId, taskKey } });
    if (!task) throw new NotFoundException('Pick task not found');
    const varianceQty = computePickVariance(task.requestedQty, pickedQty);
    const status: EpscmWmsPickStatus = varianceQty !== 0 ? 'variance' : 'completed';
    const updated = await this.prisma.epscmWmsPickTask.update({
      where: { id: task.id },
      data: {
        pickedQty,
        varianceQty,
        status,
        pickerKey,
        pickedAt: new Date(),
      },
    });
    await this.integration.onPickCompleted(organizationId, taskKey, task.orderKey);
    await this.audit.log(organizationId, 'EpscmWmsPickTask', taskKey, 'wms_picked', userId, { pickedQty, varianceQty });
    return updated;
  }

  panel(organizationId: string, warehouseKey?: string) {
    return this.listTasks(organizationId, 'in_progress').then(async (tasks) => {
      const locations = await this.prisma.epscmWmsLocation.findMany({
        where: { organizationId, ...(warehouseKey ? { warehouseKey } : {}) },
        select: { locationKey: true, zoneKey: true },
      });
      const zoneMap = new Map(locations.map((l) => [l.locationKey, l.zoneKey ?? 'UNASSIGNED']));
      const sorted = sortPickTasksByPriority(tasks);
      const byZone = groupPickTasksByZone(sorted, zoneMap);
      return {
        tasks: sorted,
        byZone: Object.fromEntries(byZone),
        openCount: tasks.length,
      };
    });
  }

  async confirmByBarcode(organizationId: string, userId: string, barcode: string, pickedQty: number) {
    const task = await this.prisma.epscmWmsPickTask.findFirst({
      where: {
        organizationId,
        status: { in: ['pending', 'in_progress'] },
        OR: [{ taskKey: barcode }, { itemKey: barcode }, { orderKey: barcode }],
      },
    });
    if (!task) throw new NotFoundException('Pick task not found for barcode');
    return this.confirmPick(organizationId, userId, task.taskKey, pickedQty, userId);
  }
}
