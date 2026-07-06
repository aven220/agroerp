import { Injectable } from '@nestjs/common';
import { EmfgIntelligenceSimulationStatus, EmfgIntelligenceSimulationType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgAuditService } from './emfg-audit.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import {
  compareScenarios,
  runBomSimulation,
  runCapacitySimulation,
  runDemandSimulation,
  runRoutingSimulation,
  runShiftSimulation,
} from '../domain/emfg-intelligence.engine';

@Injectable()
export class EmfgIntelligenceSimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  list(organizationId: string, authorizedOnly = false) {
    return this.prisma.emfgIntelligenceSimulation.findMany({
      where: {
        organizationId,
        ...(authorizedOnly ? { isAuthorized: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  get(organizationId: string, simulationKey: string) {
    return this.prisma.emfgIntelligenceSimulation.findUniqueOrThrow({
      where: { organizationId_simulationKey: { organizationId, simulationKey } },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      name: string;
      simulationType: EmfgIntelligenceSimulationType;
      inputParams: Record<string, unknown>;
      isAuthorized?: boolean;
    },
  ) {
    const seq = await this.prisma.emfgIntelligenceSimulation.count({ where: { organizationId } });
    return this.prisma.emfgIntelligenceSimulation.create({
      data: {
        organizationId,
        simulationKey: generateEmfgKey('SIM', seq + 1),
        name: input.name,
        simulationType: input.simulationType,
        inputParams: input.inputParams as object,
        isAuthorized: input.isAuthorized ?? false,
        createdBy: userId,
        status: EmfgIntelligenceSimulationStatus.draft,
      },
    });
  }

  async run(organizationId: string, userId: string, simulationKey: string) {
    const sim = await this.get(organizationId, simulationKey);
    await this.prisma.emfgIntelligenceSimulation.update({
      where: { organizationId_simulationKey: { organizationId, simulationKey } },
      data: { status: EmfgIntelligenceSimulationStatus.running },
    });

    const params = sim.inputParams as Record<string, unknown>;
    let baseScenario: Record<string, unknown> = {};
    let resultScenario: Record<string, unknown> = {};

    switch (sim.simulationType) {
      case EmfgIntelligenceSimulationType.demand_increase: {
        const orders = await this.prisma.emfgProductionOrder.findMany({
          where: { organizationId, status: { in: ['released', 'in_progress', 'draft'] } },
          take: 200,
        });
        const pct = Number(params.demandIncreasePct ?? 10);
        const results = runDemandSimulation(
          orders.map((o) => ({ orderKey: o.orderKey, plannedQty: o.plannedQty })),
          pct,
        );
        baseScenario = { totalPlannedQty: orders.reduce((s, o) => s + o.plannedQty, 0) };
        resultScenario = {
          totalSimulatedQty: results.reduce((s, r) => s + r.simulatedQty, 0),
          demandIncreasePct: pct,
          orders: results,
        };
        break;
      }
      case EmfgIntelligenceSimulationType.capacity_change: {
        const caps = await this.prisma.emfgResourceShiftCapacity.findMany({
          where: { organizationId },
          take: 50,
        });
        const installed = caps.reduce((s, c) => s + c.installedMinutes, 0);
        const additional = Number(params.additionalCapacity ?? 0);
        const result = runCapacitySimulation(installed, additional);
        baseScenario = { installedCapacity: result.baseCapacity };
        resultScenario = result as unknown as Record<string, unknown>;
        break;
      }
      case EmfgIntelligenceSimulationType.shift_addition: {
        const currentShifts = Number(params.currentShifts ?? 2);
        const additionalShifts = Number(params.additionalShifts ?? 1);
        const minutesPerShift = Number(params.minutesPerShift ?? 480);
        const result = runShiftSimulation(currentShifts, additionalShifts, minutesPerShift);
        baseScenario = { shifts: currentShifts, minutes: result.baseMinutes };
        resultScenario = result as unknown as Record<string, unknown>;
        break;
      }
      case EmfgIntelligenceSimulationType.routing_change: {
        const ops = await this.prisma.emfgProductionOrderOperation.findMany({
          where: { organizationId },
          take: 100,
        });
        const deltaPct = Number(params.runMinutesDeltaPct ?? 0);
        const results = runRoutingSimulation(
          ops.map((o) => ({ operationKey: o.orderOpKey, runMinutes: o.runMinutes })),
          deltaPct,
        );
        baseScenario = { operationCount: ops.length };
        resultScenario = { runMinutesDeltaPct: deltaPct, operations: results };
        break;
      }
      case EmfgIntelligenceSimulationType.bom_change: {
        const orderKey = String(params.orderKey ?? '');
        const materials = orderKey
          ? await this.prisma.emfgProductionOrderMaterial.findMany({ where: { organizationId, orderKey } })
          : await this.prisma.emfgBomLine.findMany({ where: { organizationId }, take: 50 });
        const deltaPct = Number(params.quantityDeltaPct ?? 0);
        const lines = materials.map((m) => {
          if ('requiredQty' in m) {
            return { componentKey: m.componentKey, quantity: m.requiredQty };
          }
          return { componentKey: m.componentKey, quantity: m.quantity };
        });
        const results = runBomSimulation(lines, deltaPct);
        baseScenario = { lineCount: lines.length };
        resultScenario = { quantityDeltaPct: deltaPct, lines: results };
        break;
      }
    }

    const updated = await this.prisma.emfgIntelligenceSimulation.update({
      where: { organizationId_simulationKey: { organizationId, simulationKey } },
      data: {
        status: EmfgIntelligenceSimulationStatus.completed,
        baseScenario: baseScenario as object,
        resultScenario: resultScenario as object,
        computedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'EmfgIntelligenceSimulation', simulationKey, 'simulation_run', userId, {
      simulationType: sim.simulationType,
    });

    return updated;
  }

  async compare(organizationId: string, userId: string, simulationKeys: string[]) {
    const sims = await this.prisma.emfgIntelligenceSimulation.findMany({
      where: { organizationId, simulationKey: { in: simulationKeys } },
    });
    if (sims.length < 2) {
      return { comparison: [], message: 'At least 2 simulations required' };
    }

    const base = sims[0].resultScenario as Record<string, unknown>;
    const scenarios = sims.slice(1).map((s) => ({
      name: s.name,
      result: s.resultScenario as Record<string, unknown>,
    }));
    const comparison = compareScenarios(base, scenarios);

    for (const sim of sims) {
      await this.prisma.emfgIntelligenceSimulation.update({
        where: { organizationId_simulationKey: { organizationId, simulationKey: sim.simulationKey } },
        data: { comparison: { comparedAt: new Date().toISOString(), items: comparison } as object },
      });
    }

    await this.audit.log(organizationId, 'EmfgIntelligenceSimulation', 'compare', 'simulation_run', userId, {
      keys: simulationKeys,
    });

    return { comparison, comparedAt: new Date().toISOString() };
  }

  authorize(organizationId: string, userId: string, simulationKey: string) {
    return this.prisma.emfgIntelligenceSimulation.update({
      where: { organizationId_simulationKey: { organizationId, simulationKey } },
      data: { isAuthorized: true, metadata: { authorizedBy: userId, authorizedAt: new Date().toISOString() } },
    });
  }
}
