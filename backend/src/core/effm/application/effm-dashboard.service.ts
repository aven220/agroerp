import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { EFFM_MODULE_SLOTS, aggregateEffmIndicators } from '../domain/effm.engine';
import { EffmFuelService } from './effm-fuel.service';
import { EffmMachineService } from './effm-machine.service';
import { EffmOperationService } from './effm-operation.service';

@Injectable()
export class EffmBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EFFM_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'effm' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EffmModule', moduleRef, EVENT_TYPES.EFFM_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EffmPerformanceService {
  constructor(private readonly prisma: EffmPrismaService) {}

  async fleetKpis(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const sessions = await this.prisma.effmOperationSession.findMany({
      where: { organizationId, startedAt: { gte: since30d }, status: 'completed' },
    });
    const fuel = await this.prisma.effmFuelRecord.aggregate({
      where: { organizationId, recordedAt: { gte: since30d } },
      _sum: { liters: true, cost: true },
    });
    const totalHours = sessions.reduce((s, r) => s + (r.hoursWorked ?? 0), 0);
    const productiveHours = sessions.reduce((s, r) => s + Math.max(0, (r.hoursWorked ?? 0) - (r.unproductiveMinutes ?? 0) / 60), 0);
    const idleMinutes = sessions.reduce((s, r) => s + (r.idleMinutes ?? 0), 0);
    const areaCoveredHa = sessions.reduce((s, r) => s + (r.areaCoveredHa ?? 0), 0);
    const { computePerformanceKpis } = await import('../domain/effm.engine');
    return computePerformanceKpis({
      totalHours, productiveHours, idleMinutes,
      areaCoveredHa, fuelLiters: fuel._sum.liters ?? 0, fuelCost: fuel._sum.cost ?? 0,
    });
  }

  async machinePerformance(organizationId: string, machineKey: string) {
    const machine = await this.prisma.effmMachine.findFirst({ where: { organizationId, machineKey } });
    if (!machine) return null;
    const sessions = await this.prisma.effmOperationSession.findMany({ where: { organizationId, machineId: machine.id, status: 'completed' } });
    const fuel = await this.prisma.effmFuelRecord.aggregate({ where: { organizationId, machineId: machine.id }, _sum: { liters: true, cost: true } });
    const totalHours = sessions.reduce((s, r) => s + (r.hoursWorked ?? 0), 0);
    const areaCoveredHa = sessions.reduce((s, r) => s + (r.areaCoveredHa ?? 0), 0);
    const idleMinutes = sessions.reduce((s, r) => s + (r.idleMinutes ?? 0), 0);
    const { computePerformanceKpis } = await import('../domain/effm.engine');
    return { machineKey, sessions: sessions.length, ...computePerformanceKpis({ totalHours, productiveHours: totalHours, idleMinutes, areaCoveredHa, fuelLiters: fuel._sum.liters ?? 0, fuelCost: fuel._sum.cost ?? 0 }) };
  }

  async operatorPerformance(organizationId: string, employeeRef: string) {
    const assignments = await this.prisma.effmOperatorAssignment.findMany({ where: { organizationId, employeeRef } });
    const assignmentIds = assignments.map((a) => a.id);
    const sessions = await this.prisma.effmOperationSession.findMany({
      where: { organizationId, assignmentId: { in: assignmentIds }, status: 'completed' },
    });
    const totalHours = sessions.reduce((s, r) => s + (r.hoursWorked ?? 0), 0);
    const areaCoveredHa = sessions.reduce((s, r) => s + (r.areaCoveredHa ?? 0), 0);
    return { employeeRef, sessions: sessions.length, totalHours: Math.round(totalHours * 100) / 100, areaCoveredHa };
  }
}

@Injectable()
export class EffmDashboardService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly performance: EffmPerformanceService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [activeMachines, activeImplements, operations30d, fuelLiters30d, telemetryReadings30d, activeAlarms] =
      await Promise.all([
        this.prisma.effmMachine.count({ where: { organizationId, status: { in: ['active', 'in_use'] } } }),
        this.prisma.effmImplement.count({ where: { organizationId, status: 'active' } }),
        this.prisma.effmOperationSession.count({ where: { organizationId, startedAt: { gte: since30d } } }),
        this.prisma.effmFuelRecord.aggregate({ where: { organizationId, recordedAt: { gte: since30d } }, _sum: { liters: true } }),
        this.prisma.effmTelemetryReading.count({ where: { organizationId, recordedAt: { gte: since30d } } }),
        this.prisma.effmTelemetryAlarm.count({ where: { organizationId, isActive: true } }),
      ]);
    const kpis = await this.performance.fleetKpis(organizationId);
    const indicators = aggregateEffmIndicators({
      activeMachines, activeImplements, operations30d,
      fuelLiters30d: fuelLiters30d._sum.liters ?? 0,
      telemetryReadings30d, activeAlarms, utilizationPct: kpis.utilizationPct,
    });
    return {
      indicators,
      performance: kpis,
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EffmOfflineService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly dashboard: EffmDashboardService,
    private readonly operation: EffmOperationService,
    private readonly fuel: EffmFuelService,
    private readonly machine: EffmMachineService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const [dash, machines, assignments] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.machine.listMachines(organizationId),
      this.machine.listAssignments(organizationId),
    ]);
    return { authorized: true, dashboard: dash, machines: machines.slice(0, 30), assignments: assignments.slice(0, 20), syncedAt: new Date().toISOString(), userId };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.effmOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.effmOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.operations as Array<Record<string, unknown>>) ?? []) {
      if (row.action === 'start') results.push(await this.operation.startOperation(organizationId, userId, row as never));
      else if (row.sessionKey) results.push(await this.operation.endOperation(organizationId, userId, row.sessionKey as string, row as never));
    }
    for (const row of (payload.fuel as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.fuel.recordFuel(organizationId, userId, row as never));
    }
    for (const row of (payload.incidents as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.machine.recordIncident(organizationId, userId, row as never));
    }
    await this.prisma.effmOfflineBatch.update({ where: { id: batch.id }, data: { status: 'completed', syncedAt: new Date() } });
    return { synced: true, count: results.length };
  }
}
