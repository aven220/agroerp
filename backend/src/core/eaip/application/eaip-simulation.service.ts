import { Injectable, NotFoundException } from '@nestjs/common';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { EAIP_SIMULATION_TYPES, generateEaipKey, runSimulationProjection } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipSimulationService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly audit: EaipAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eaipSimulation.findMany({
      where: { organizationId },
      include: { scenarios: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: { simulationType: string; name: string; baseScenario?: Record<string, unknown>; scenarios?: Array<{ name: string; parameters: Record<string, unknown> }> },
  ) {
    const count = await this.prisma.eaipSimulation.count({ where: { organizationId } });
    const simulationKey = generateEaipKey('SIM', count + 1);
    const base = data.baseScenario ?? { yieldPerHa: 5000, costPerHa: 2000, areaHa: 10 };
    const simulation = await this.prisma.eaipSimulation.create({
      data: {
        organizationId, simulationKey, simulationType: data.simulationType, name: data.name,
        baseScenario: base as object, status: 'running', createdBy: userId,
      },
    });
    const scenarioResults = [];
    for (const [i, sc] of (data.scenarios ?? [{ name: 'Base', parameters: {} }]).entries()) {
      const scenarioKey = `${simulationKey}-S${String(i + 1).padStart(2, '0')}`;
      const results = runSimulationProjection(base as { yieldPerHa?: number; costPerHa?: number; areaHa?: number }, sc.parameters as never);
      const row = await this.prisma.eaipSimulationScenario.create({
        data: {
          organizationId, scenarioKey, simulationId: simulation.id, name: sc.name,
          parameters: sc.parameters as object, results: results as object,
          yieldProjection: results.yieldProjection, costProjection: results.costProjection,
        },
      });
      scenarioResults.push(row);
    }
    const economicImpact = scenarioResults.reduce((acc, s) => {
      const r = s.results as { margin?: number };
      return { totalMargin: (acc.totalMargin ?? 0) + (r.margin ?? 0), scenarios: (acc.scenarios ?? 0) + 1 };
    }, {} as { totalMargin?: number; scenarios?: number });
    await this.prisma.eaipSimulation.update({
      where: { id: simulation.id },
      data: { status: 'completed', economicImpact: economicImpact as object },
    });
    await this.audit.log(organizationId, 'EaipSimulation', simulationKey, 'simulation_run', userId);
    return this.prisma.eaipSimulation.findUnique({ where: { id: simulation.id }, include: { scenarios: true } });
  }

  async compare(organizationId: string, simulationKey: string) {
    const sim = await this.prisma.eaipSimulation.findFirst({
      where: { organizationId, simulationKey },
      include: { scenarios: true },
    });
    if (!sim) throw new NotFoundException('Simulation not found');
    return {
      simulationKey,
      scenarios: sim.scenarios.map((s) => ({
        name: s.name, yieldProjection: s.yieldProjection, costProjection: s.costProjection, results: s.results,
      })),
      economicImpact: sim.economicImpact,
    };
  }

  simulationTypes() { return EAIP_SIMULATION_TYPES; }
}
