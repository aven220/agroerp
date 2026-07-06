import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES, EihFieldMappingDefinition, EihIntegrationFlowDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { IntegrationAuditService } from './integration-audit.service';
import { IntegrationConnectorService } from './integration-connector.service';
import { resolveRoute } from '../domain/route.engine';

@Injectable()
export class IntegrationFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: IntegrationAuditService,
    private readonly connectors: IntegrationConnectorService,
  ) {}

  findAll(organizationId: string, status?: string) {
    return this.prisma.eihIntegrationFlow.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'published' } : {}),
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        fieldMappings: true,
        transformRules: true,
        sourceConnector: true,
        targetConnector: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, flowKey: string) {
    const flow = await this.prisma.eihIntegrationFlow.findFirst({
      where: { organizationId, flowKey },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        fieldMappings: true,
        transformRules: true,
        sourceConnector: true,
        targetConnector: true,
      },
    });
    if (!flow) throw new NotFoundException(`Flujo ${flowKey} no encontrado`);
    return flow;
  }

  async create(organizationId: string, userId: string, dto: EihIntegrationFlowDefinition) {
    const existing = await this.prisma.eihIntegrationFlow.findFirst({
      where: { organizationId, flowKey: dto.flowKey },
    });
    if (existing) throw new BadRequestException(`Flujo ${dto.flowKey} ya existe`);

    let sourceConnectorId: string | undefined;
    let targetConnectorId: string | undefined;
    if (dto.sourceConnectorKey) {
      const src = await this.connectors.findOne(organizationId, dto.sourceConnectorKey);
      sourceConnectorId = src.id;
    }
    if (dto.targetConnectorKey) {
      const tgt = await this.connectors.findOne(organizationId, dto.targetConnectorKey);
      targetConnectorId = tgt.id;
    }

    return this.prisma.eihIntegrationFlow.create({
      data: {
        organizationId,
        flowKey: dto.flowKey,
        name: dto.name,
        description: dto.description,
        sourceConnectorId,
        targetConnectorId,
        syncMode: (dto.syncMode ?? 'scheduled') as 'scheduled',
        scheduleCron: dto.scheduleCron,
        routingRules: (dto.routingRules ?? []) as object,
        validationRules: (dto.validationRules ?? []) as object,
        definition: (dto.definition ?? {}) as object,
        createdBy: userId,
      },
    });
  }

  async publish(organizationId: string, userId: string, flowKey: string) {
    const flow = await this.findOne(organizationId, flowKey);
    if (!flow.steps.length) throw new BadRequestException('El flujo requiere al menos un paso');
    const updated = await this.prisma.eihIntegrationFlow.update({
      where: { id: flow.id },
      data: { status: 'published', publishedAt: new Date(), version: { increment: 1 } },
    });
    await this.audit.log(organizationId, 'flow', flowKey, 'publish', userId);
    await this.core.emitUserAction(
      organizationId,
      'IntegrationFlow',
      flow.id,
      EVENT_TYPES.INTEGRATION_FLOW_PUBLISHED,
      { flowKey },
    );
    return updated;
  }

  async addStep(flowId: string, data: {
    stepKey: string; name: string; stepOrder: number; stepType: string; config?: Record<string, unknown>;
  }) {
    return this.prisma.eihFlowStep.upsert({
      where: { flowId_stepKey: { flowId, stepKey: data.stepKey } },
      update: {
        name: data.name,
        stepOrder: data.stepOrder,
        stepType: data.stepType,
        config: (data.config ?? {}) as object,
      },
      create: {
        flowId,
        stepKey: data.stepKey,
        name: data.name,
        stepOrder: data.stepOrder,
        stepType: data.stepType,
        config: (data.config ?? {}) as object,
      },
    });
  }

  async setFieldMappings(organizationId: string, flowKey: string, mappings: EihFieldMappingDefinition[]) {
    const flow = await this.findOne(organizationId, flowKey);
    await this.prisma.eihFieldMapping.deleteMany({ where: { flowId: flow.id } });
    for (const m of mappings) {
      await this.prisma.eihFieldMapping.create({
        data: {
          flowId: flow.id,
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform,
          isRequired: m.isRequired ?? false,
          defaultValue: m.defaultValue,
        },
      });
    }
    return this.findOne(organizationId, flowKey);
  }

  resolveFlowRoute(flowKey: string, organizationId: string, context: Record<string, unknown>) {
    return this.findOne(organizationId, flowKey).then((flow) => {
      const rules = flow.routingRules as Array<{ field?: string; operator?: 'eq'; value?: string; targetStepKey?: string }>;
      const defaultStep = flow.steps[0]?.stepKey ?? 'start';
      return resolveRoute(rules, context, defaultStep);
    });
  }
}
