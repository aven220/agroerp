import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { WorkflowDefinitionsService } from './workflow-definitions.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { CreateWorkflowDefinitionDto } from '../presentation/workflows.dto';

@Injectable()
export class WorkflowImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: WorkflowDefinitionsService,
  ) {}

  async exportDefinition(organizationId: string, definitionId: string) {
    const def = await this.definitions.findOne(organizationId, definitionId);
    const latest = def.versions[0];
    return {
      format: 'agroerp-workflow-v1',
      exportedAt: new Date().toISOString(),
      definition: {
        workflowKey: def.workflowKey,
        name: def.name,
        description: def.description,
        resourceType: def.resourceType,
        metadata: def.metadata,
        schema: latest?.definition,
        version: latest?.version,
      },
    };
  }

  async importDefinition(
    organizationId: string,
    userId: string,
    content: string,
    options?: { workflowKey?: string; publish?: boolean },
    ctx?: RequestContext,
  ) {
    let parsed: {
      definition?: CreateWorkflowDefinitionDto;
      workflowKey?: string;
      name?: string;
      description?: string;
      resourceType?: string;
      metadata?: Record<string, unknown>;
      schema?: WorkflowDefinitionSchema;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('JSON de proceso inválido');
    }

    const schema = (parsed.schema ?? parsed.definition?.definition) as WorkflowDefinitionSchema;
    if (!schema?.states?.length) {
      throw new BadRequestException('Definición de proceso sin estados');
    }

    const workflowKey =
      options?.workflowKey ??
      parsed.workflowKey ??
      parsed.definition?.workflowKey ??
      `imported-${Date.now()}`;

    const existing = await this.prisma.workflowDefinition.findFirst({
      where: { organizationId, workflowKey, deletedAt: null },
    });

    if (existing) {
      const version = await this.definitions.createVersion(
        organizationId,
        existing.id,
        userId,
        { definition: schema, changelog: 'Importado' },
        ctx,
      );
      if (options?.publish) {
        await this.definitions.publish(organizationId, version.id, userId, ctx);
      }
      return { definitionId: existing.id, versionId: version.id, imported: true, updated: true };
    }

    const created = await this.definitions.create(
      organizationId,
      userId,
      {
        workflowKey,
        name: parsed.name ?? parsed.definition?.name ?? workflowKey,
        description: parsed.description ?? parsed.definition?.description,
        resourceType: parsed.resourceType ?? parsed.definition?.resourceType,
        metadata: parsed.metadata ?? parsed.definition?.metadata,
        definition: schema,
      },
      ctx,
    );

    if (options?.publish && created.versions[0]) {
      await this.definitions.publish(organizationId, created.versions[0].id, userId, ctx);
    }

    return { definitionId: created.id, imported: true, updated: false };
  }

  async cloneDefinition(
    organizationId: string,
    userId: string,
    definitionId: string,
    newWorkflowKey: string,
    newName?: string,
    ctx?: RequestContext,
  ) {
    const exported = await this.exportDefinition(organizationId, definitionId);
    const schema = exported.definition.schema as unknown as WorkflowDefinitionSchema;
    return this.definitions.create(
      organizationId,
      userId,
      {
        workflowKey: newWorkflowKey,
        name: newName ?? `${exported.definition.name} (copia)`,
        description: exported.definition.description ?? undefined,
        resourceType: exported.definition.resourceType ?? undefined,
        metadata: exported.definition.metadata as Record<string, unknown>,
        definition: schema,
      },
      ctx,
    );
  }
}
