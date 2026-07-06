import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkflowDefinitionSchema,
  WorkflowStateDefinition,
} from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  CreateWorkflowDefinitionDto,
  CreateWorkflowVersionDto,
  UpdateWorkflowVersionDto,
} from '../presentation/workflows.dto';

@Injectable()
export class WorkflowDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 3 },
        _count: { select: { instances: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!def) throw new NotFoundException('Workflow definition not found');
    return def;
  }

  async findPublishedByKey(organizationId: string, workflowKey: string) {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { organizationId, workflowKey, deletedAt: null, active: true },
    });
    if (!def) throw new NotFoundException('Workflow not found');

    const version = await this.prisma.workflowVersion.findFirst({
      where: { definitionId: def.id, status: 'published' },
      orderBy: { version: 'desc' },
    });
    if (!version) throw new NotFoundException('No published workflow version');

    return { definition: def, version };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateWorkflowDefinitionDto,
    ctx?: RequestContext,
  ) {
    const existing = await this.prisma.workflowDefinition.findFirst({
      where: { organizationId, workflowKey: dto.workflowKey, deletedAt: null },
    });
    if (existing) throw new ConflictException('Workflow key already exists');

    const schema = this.normalizeSchema(dto.definition, 1);

    const definition = await this.prisma.workflowDefinition.create({
      data: {
        organizationId,
        workflowKey: dto.workflowKey,
        name: dto.name,
        description: dto.description,
        resourceType: dto.resourceType,
        metadata: (dto.metadata ?? {}) as object,
        createdBy: userId,
        versions: {
          create: {
            version: 1,
            status: 'draft',
            definition: schema as object,
            createdBy: userId,
          },
        },
      },
      include: { versions: true },
    });

    await this.core.emitWorkflowDefinitionCreated(
      organizationId,
      definition.id,
      { workflowKey: definition.workflowKey, name: definition.name },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return definition;
  }

  async createVersion(
    organizationId: string,
    definitionId: string,
    userId: string,
    dto: CreateWorkflowVersionDto,
    ctx?: RequestContext,
  ) {
    const def = await this.findOne(organizationId, definitionId);
    const latest = def.versions[0];
    const nextVersion = (latest?.version ?? 0) + 1;
    const schema = this.normalizeSchema(
      dto.definition ?? (latest?.definition as unknown as WorkflowDefinitionSchema),
      nextVersion,
    );

    const version = await this.prisma.workflowVersion.create({
      data: {
        definitionId: def.id,
        version: nextVersion,
        status: 'draft',
        definition: schema as object,
        changelog: dto.changelog,
        createdBy: userId,
      },
    });

    await this.core.emitWorkflowVersionCreated(
      organizationId,
      def.id,
      { versionId: version.id, version: version.version },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return version;
  }

  async updateVersion(
    organizationId: string,
    versionId: string,
    userId: string,
    dto: UpdateWorkflowVersionDto,
  ) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId, workflowDefinition: { organizationId } },
      include: { workflowDefinition: true },
    });
    if (!version) throw new NotFoundException('Workflow version not found');
    if (version.status !== 'draft') {
      throw new BadRequestException('Only draft versions can be updated');
    }

    const schema = dto.definition
      ? this.normalizeSchema(dto.definition, version.version)
      : undefined;

    return this.prisma.workflowVersion.update({
      where: { id: versionId },
      data: {
        definition: schema ? (schema as object) : undefined,
        changelog: dto.changelog,
      },
    });
  }

  async publish(
    organizationId: string,
    versionId: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId, workflowDefinition: { organizationId } },
      include: { workflowDefinition: true },
    });
    if (!version) throw new NotFoundException('Workflow version not found');

    const schema = version.definition as unknown as WorkflowDefinitionSchema;
    this.validateSchema(schema);

    await this.prisma.workflowVersion.updateMany({
      where: {
        definitionId: version.definitionId,
        status: 'published',
      },
      data: { status: 'deprecated' },
    });

    const published = await this.prisma.workflowVersion.update({
      where: { id: versionId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
      },
    });

    await this.core.emitWorkflowVersionPublished(
      organizationId,
      version.definitionId,
      {
        versionId: published.id,
        version: published.version,
        workflowKey: version.workflowDefinition.workflowKey,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return published;
  }

  async bootstrap(organizationId: string) {
    const definitions = await this.prisma.workflowDefinition.findMany({
      where: { organizationId, deletedAt: null, active: true },
      include: {
        versions: {
          where: { status: 'published' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const published = definitions
      .filter((def) => def.versions.length > 0)
      .map((def) => ({ definition: def, version: def.versions[0] }));

    const categories = new Set<string>();
    for (const item of published) {
      const schema = item.version.definition as { settings?: { processCategory?: string } };
      if (schema.settings?.processCategory) {
        categories.add(schema.settings.processCategory);
      }
    }

    return {
      definitions: published,
      categories: Array.from(categories),
    };
  }

  private normalizeSchema(
    input: WorkflowDefinitionSchema,
    version: number,
  ): WorkflowDefinitionSchema {
    const states = input.states ?? [];
    if (!states.length) {
      throw new BadRequestException('Workflow must define at least one state');
    }

    const initialStates = states.filter((s) => s.type === 'initial');
    if (initialStates.length !== 1) {
      throw new BadRequestException('Workflow must have exactly one initial state');
    }

    return {
      ...input,
      version,
      states,
      transitions: input.transitions ?? [],
      rules: input.rules ?? [],
    };
  }

  private validateSchema(schema: WorkflowDefinitionSchema) {
    const stateKeys = new Set(schema.states.map((s) => s.key));

    for (const transition of schema.transitions) {
      if (transition.from !== '*' && !stateKeys.has(transition.from)) {
        throw new BadRequestException(
          `Transition ${transition.key}: unknown from state ${transition.from}`,
        );
      }
      if (!stateKeys.has(transition.to)) {
        throw new BadRequestException(
          `Transition ${transition.key}: unknown to state ${transition.to}`,
        );
      }
    }

    const hasFinal = schema.states.some((s) => s.type === 'final');
    if (!hasFinal) {
      throw new BadRequestException('Workflow must define at least one final state');
    }
  }

  getInitialState(schema: WorkflowDefinitionSchema): WorkflowStateDefinition {
    return schema.states.find((s) => s.type === 'initial')!;
  }

  async deactivate(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { active: false },
    });
  }

  async activate(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { active: true },
    });
  }
}
