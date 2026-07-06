import { Injectable } from '@nestjs/common';
import { EamRelSimulationType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamReliabilityKey, runSimulation, SimulationParams } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamReliabilitySimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eamRelSimulation.findMany({
      where: { organizationId },
      include: { scenarios: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    name: string,
    simulationType: EamRelSimulationType,
    baseline: SimulationParams,
    parameters: SimulationParams,
  ) {
    const seq = await this.prisma.eamRelSimulation.count({ where: { organizationId } });
    const result = runSimulation(simulationType, baseline, parameters);
    const simulation = await this.prisma.eamRelSimulation.create({
      data: {
        organizationId,
        simulationKey: generateEamReliabilityKey('SIM', seq + 1),
        name,
        simulationType,
        status: 'completed',
        baseline: baseline as object,
        result: result as object,
        createdBy: userId,
        completedAt: new Date(),
      },
    });
    await this.audit.log(organizationId, 'EamRelSimulation', simulation.simulationKey, 'simulation_run', userId, { simulationType });
    await this.integration.onSimulationRun(organizationId, simulation.simulationKey);
    return simulation;
  }

  async addScenario(
    organizationId: string,
    userId: string,
    simulationKey: string,
    name: string,
    parameters: SimulationParams,
  ) {
    const sim = await this.prisma.eamRelSimulation.findFirst({ where: { organizationId, simulationKey } });
    if (!sim) return null;
    const baseline = (sim.baseline as SimulationParams) ?? {};
    const outcomes = runSimulation(sim.simulationType, baseline, parameters);
    const seq = await this.prisma.eamRelSimulationScenario.count({ where: { organizationId } });
    const scenario = await this.prisma.eamRelSimulationScenario.create({
      data: {
        organizationId,
        scenarioKey: generateEamReliabilityKey('SCN', seq + 1),
        simulationKey,
        name,
        parameters: parameters as object,
        outcomes: outcomes as object,
      },
    });
    await this.audit.log(organizationId, 'EamRelSimulationScenario', scenario.scenarioKey, 'created', userId, { simulationKey });
    return scenario;
  }

  async compare(organizationId: string, userId: string, simulationKey: string) {
    const sim = await this.prisma.eamRelSimulation.findFirst({
      where: { organizationId, simulationKey },
      include: { scenarios: true },
    });
    if (!sim) return null;
    const baseline = (sim.baseline as SimulationParams) ?? {};
    const comparison = sim.scenarios.map((s) => ({
      scenarioKey: s.scenarioKey,
      name: s.name,
      outcomes: s.outcomes,
      delta: runSimulation(sim.simulationType, baseline, s.parameters as SimulationParams),
    }));
    return { simulation: sim, comparison, baselineResult: sim.result };
  }
}
