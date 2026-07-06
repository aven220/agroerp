import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeElapsedMinutes } from '../domain/emfg-mes.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgMesTraceabilityService } from './emfg-mes-traceability.service';

@Injectable()
export class EmfgMesOperationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly traceability: EmfgMesTraceabilityService,
  ) {}

  list(organizationId: string, orderKey: string) {
    return this.prisma.emfgOperationExecution.findMany({
      where: { organizationId, orderKey },
      orderBy: { startedAt: 'desc' },
    });
  }

  async start(
    organizationId: string,
    userId: string,
    orderKey: string,
    orderOpKey: string,
    payload: { operatorKey?: string; machineKey?: string; notes?: string },
  ) {
    const op = await this.prisma.emfgProductionOrderOperation.findUnique({
      where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
    });
    if (!op || op.orderKey !== orderKey) throw new NotFoundException('operation_not_found');
    if (!['pending', 'ready'].includes(op.status)) {
      throw new BadRequestException('operation_not_startable');
    }

    const seq = await this.prisma.emfgOperationExecution.count({ where: { organizationId } });
    const execKey = generateEmfgKey('OPX', seq + 1);
    const now = new Date();

    const [exec] = await this.prisma.$transaction([
      this.prisma.emfgOperationExecution.create({
        data: {
          organizationId,
          execKey,
          orderKey,
          orderOpKey,
          action: 'start',
          operatorKey: payload.operatorKey,
          machineKey: payload.machineKey,
          notes: payload.notes,
          userId,
          startedAt: now,
        },
      }),
      this.prisma.emfgProductionOrderOperation.update({
        where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
        data: { status: 'in_progress', actualStart: now },
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgProductionOrderOperation', orderOpKey, 'started', userId, {
      orderKey,
      operatorKey: payload.operatorKey,
      machineKey: payload.machineKey,
    });

    await this.traceability.record(organizationId, userId, orderKey, {
      eventType: 'process_step',
      details: { orderOpKey, action: 'start', name: op.name },
    });

    return exec;
  }

  async finish(
    organizationId: string,
    userId: string,
    orderKey: string,
    orderOpKey: string,
    payload: { operatorKey?: string; machineKey?: string; notes?: string },
  ) {
    const op = await this.prisma.emfgProductionOrderOperation.findUnique({
      where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
    });
    if (!op || op.orderKey !== orderKey) throw new NotFoundException('operation_not_found');
    if (op.status !== 'in_progress') throw new BadRequestException('operation_not_in_progress');

    const now = new Date();
    const minutes = op.actualStart ? computeElapsedMinutes(op.actualStart, now) : 0;
    const seq = await this.prisma.emfgOperationExecution.count({ where: { organizationId } });
    const execKey = generateEmfgKey('OPX', seq + 1);

    const [exec] = await this.prisma.$transaction([
      this.prisma.emfgOperationExecution.create({
        data: {
          organizationId,
          execKey,
          orderKey,
          orderOpKey,
          action: 'end',
          operatorKey: payload.operatorKey,
          machineKey: payload.machineKey,
          minutesSpent: minutes,
          notes: payload.notes,
          userId,
          startedAt: op.actualStart ?? now,
          endedAt: now,
        },
      }),
      this.prisma.emfgProductionOrderOperation.update({
        where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
        data: {
          status: 'completed',
          actualEnd: now,
          completedMinutes: { increment: minutes },
        },
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgProductionOrderOperation', orderOpKey, 'completed', userId, {
      orderKey,
      minutesSpent: minutes,
    });

    await this.traceability.record(organizationId, userId, orderKey, {
      eventType: 'process_step',
      details: { orderOpKey, action: 'end', name: op.name, minutesSpent: minutes },
    });

    return exec;
  }
}
