import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { computeOperationMinutes, generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgRoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string, itemKey?: string) {
    return this.prisma.emfgRouting.findMany({
      where: { organizationId, ...(itemKey ? { itemKey } : {}), isActive: true },
      include: { operations: { orderBy: { sequence: 'asc' } } },
    });
  }

  get(organizationId: string, routingKey: string) {
    return this.prisma.emfgRouting.findUnique({
      where: { organizationId_routingKey: { organizationId, routingKey } },
      include: { operations: { orderBy: { sequence: 'asc' } } },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    itemKey: string; name: string; version?: string; isDefault?: boolean;
  }) {
    const seq = await this.prisma.emfgRouting.count({ where: { organizationId } });
    const routingKey = generateEmfgKey('RT', seq + 1);
    const routing = await this.prisma.emfgRouting.create({
      data: {
        organizationId,
        routingKey,
        itemKey: payload.itemKey,
        name: payload.name,
        version: payload.version ?? '1.0',
        isDefault: payload.isDefault ?? true,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EmfgRouting', routingKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EmfgRouting', routingKey, EVENT_TYPES.EMFG_ROUTING_CREATED, { routingKey });
    return routing;
  }

  async addOperation(organizationId: string, userId: string, routingKey: string, payload: {
    workCenterKey: string; name: string; sequence: number;
    setupMinutes?: number; runMinutesPerUnit?: number; machineKey?: string;
  }) {
    const routing = await this.get(organizationId, routingKey);
    if (!routing) throw new NotFoundException('Routing not found');
    const seq = await this.prisma.emfgRoutingOperation.count({ where: { organizationId, routingKey } });
    const operationKey = generateEmfgKey('OP', seq + 1);
    const op = await this.prisma.emfgRoutingOperation.create({
      data: {
        organizationId,
        operationKey,
        routingKey,
        workCenterKey: payload.workCenterKey,
        sequence: payload.sequence,
        name: payload.name,
        setupMinutes: payload.setupMinutes ?? 0,
        runMinutesPerUnit: payload.runMinutesPerUnit ?? 0,
        machineKey: payload.machineKey,
      },
    });
    await this.audit.log(organizationId, 'EmfgRoutingOperation', operationKey, 'created', userId, { routingKey });
    return op;
  }

  computeStandardTimes(routingKey: string, organizationId: string, plannedQty: number) {
    return this.get(organizationId, routingKey).then((routing) => {
      if (!routing) throw new NotFoundException('Routing not found');
      return routing.operations.map((op) => ({
        operationKey: op.operationKey,
        workCenterKey: op.workCenterKey,
        sequence: op.sequence,
        runMinutes: computeOperationMinutes(plannedQty, op.setupMinutes, op.runMinutesPerUnit),
      }));
    });
  }

  async seedDefaults(organizationId: string, userId: string, itemKey: string, workCenterKey: string) {
    const existing = await this.prisma.emfgRouting.findFirst({ where: { organizationId, itemKey } });
    if (existing) return this.get(organizationId, existing.routingKey);
    const routing = await this.create(organizationId, userId, { itemKey, name: `Ruta ${itemKey}` });
    await this.addOperation(organizationId, userId, routing.routingKey, {
      workCenterKey,
      name: 'Preparación',
      sequence: 10,
      setupMinutes: 30,
      runMinutesPerUnit: 0.5,
    });
    await this.addOperation(organizationId, userId, routing.routingKey, {
      workCenterKey,
      name: 'Producción',
      sequence: 20,
      setupMinutes: 15,
      runMinutesPerUnit: 1.2,
    });
    await this.addOperation(organizationId, userId, routing.routingKey, {
      workCenterKey,
      name: 'Empaque',
      sequence: 30,
      setupMinutes: 10,
      runMinutesPerUnit: 0.3,
    });
    return this.get(organizationId, routing.routingKey);
  }
}
