import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  compareScenarios,
  simulateNewDistributionCenter,
  simulateNewSupplier,
  simulateRouteChange,
  SimulationBaseline,
} from '../domain/epscm-collab-simulation.engine';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabSimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.epscmCollabSimulation.findMany({
      where: { organizationId },
      include: { scenarios: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, name: string, simulationType: string, baseline?: SimulationBaseline) {
    const costs = await this.prisma.epscmTmsCostEntry.aggregate({ where: { organizationId }, _sum: { amount: true } });
    const routes = await this.prisma.epscmTmsRoute.count({ where: { organizationId } });
    const dcs = await this.prisma.epscmDistributionCenter.count({ where: { organizationId } });

    const base: SimulationBaseline = baseline ?? {
      routes: routes || 1,
      costTotal: costs._sum.amount ?? 0,
      avgDeliveryHours: 24,
      dcCount: dcs || 1,
    };

    const seq = await this.prisma.epscmCollabSimulation.count({ where: { organizationId } });
    return this.prisma.epscmCollabSimulation.create({
      data: {
        organizationId,
        simulationKey: generateEpscmCollabKey('SIM', seq + 1),
        name,
        simulationType,
        baseline: base as object,
        createdBy: userId,
      },
    });
  }

  async addScenario(organizationId: string, simulationKey: string, name: string, parameters: Record<string, unknown>) {
    const sim = await this.prisma.epscmCollabSimulation.findFirst({ where: { organizationId, simulationKey } });
    if (!sim) throw new NotFoundException('Simulation not found');
    const seq = await this.prisma.epscmCollabSimulationScenario.count({ where: { organizationId } });
    return this.prisma.epscmCollabSimulationScenario.create({
      data: {
        organizationId,
        scenarioKey: generateEpscmCollabKey('SCN', seq + 1),
        simulationKey,
        name,
        parameters: parameters as object,
      },
    });
  }

  async run(organizationId: string, userId: string, simulationKey: string) {
    const sim = await this.prisma.epscmCollabSimulation.findFirst({
      where: { organizationId, simulationKey },
      include: { scenarios: true },
    });
    if (!sim) throw new NotFoundException('Simulation not found');

    const baseline = sim.baseline as SimulationBaseline;
    let outcomes: unknown;

    if (sim.simulationType === 'route_change') {
      const pct = Number((sim.scenarios[0]?.parameters as Record<string, unknown>)?.routeChangePct ?? 10);
      outcomes = simulateRouteChange(baseline, pct);
    } else if (sim.simulationType === 'new_supplier') {
      const delta = Number((sim.scenarios[0]?.parameters as Record<string, unknown>)?.newSupplierCostDelta ?? 5);
      outcomes = simulateNewSupplier(baseline, delta);
    } else if (sim.simulationType === 'new_dc') {
      const count = Number((sim.scenarios[0]?.parameters as Record<string, unknown>)?.newDcCount ?? 1);
      outcomes = simulateNewDistributionCenter(baseline, count);
    } else {
      outcomes = compareScenarios(
        baseline,
        sim.scenarios.map((s) => ({ name: s.name, parameters: s.parameters as never })),
      );
    }

    const updated = await this.prisma.epscmCollabSimulation.update({
      where: { id: sim.id },
      data: { status: 'completed', result: outcomes as object, completedAt: new Date() },
      include: { scenarios: true },
    });

    for (const scenario of sim.scenarios) {
      await this.prisma.epscmCollabSimulationScenario.update({
        where: { id: scenario.id },
        data: { outcomes: outcomes as object },
      });
    }

    await this.integration.onSimulationCompleted(organizationId, simulationKey);
    await this.audit.log(organizationId, 'EpscmCollabSimulation', simulationKey, 'collab_simulation_run', userId);
    return updated;
  }
}
