import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkflowDefinitionSchema,
  WorkflowTransitionDefinition,
} from '@agroerp/shared';
import { WorkflowInstanceStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { AccessControlService } from '@/core/identity/application/access-control.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { WorkflowDefinitionsService } from './workflow-definitions.service';
import { WorkflowRuleEngine } from './workflow-rule.engine';
import { WorkflowAssignmentResolver } from './workflow-assignment.resolver';
import { WorkflowActionExecutor } from './workflow-action.executor';
import { WorkflowFormBridgeService } from './workflow-form-bridge.service';
import { WorkflowNotificationDispatcher } from './workflow-notification.dispatcher';
import {
  ExecuteTransitionDto,
  StartWorkflowInstanceDto,
  SyncTransitionsDto,
} from '../presentation/workflows.dto';

@Injectable()
export class WorkflowInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly definitions: WorkflowDefinitionsService,
    private readonly rules: WorkflowRuleEngine,
    private readonly assignments: WorkflowAssignmentResolver,
    private readonly actions: WorkflowActionExecutor,
    private readonly accessControl: AccessControlService,
    private readonly formBridge: WorkflowFormBridgeService,
    private readonly notificationDispatcher: WorkflowNotificationDispatcher,
  ) {}

  findAll(
    organizationId: string,
    filters?: { status?: string; workflowKey?: string; assigneeId?: string },
  ) {
    return this.prisma.workflowInstance.findMany({
      where: {
        organizationId,
        ...(filters?.status
          ? { status: filters.status as WorkflowInstanceStatus }
          : {}),
        ...(filters?.workflowKey
          ? { workflowDefinition: { workflowKey: filters.workflowKey } }
          : {}),
        ...(filters?.assigneeId
          ? {
              assignments: {
                some: { userId: filters.assigneeId, status: 'pending' },
              },
            }
          : {}),
      },
      include: {
        workflowDefinition: { select: { workflowKey: true, name: true } },
        workflowVersion: { select: { version: true } },
        assignments: { where: { status: 'pending' } },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
  }

  async findOne(organizationId: string, id: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id, organizationId },
      include: {
        workflowDefinition: true,
        workflowVersion: true,
        history: { orderBy: { occurredAt: 'desc' }, take: 50 },
        comments: { orderBy: { createdAt: 'desc' } },
        attachments: true,
        assignments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    return instance;
  }

  async start(
    organizationId: string,
    userId: string,
    dto: StartWorkflowInstanceDto,
    ctx?: RequestContext,
  ) {
    const { definition, version } = dto.versionId
      ? await this.resolveVersionById(organizationId, dto.versionId)
      : await this.definitions.findPublishedByKey(organizationId, dto.workflowKey!);

    if (dto.externalId) {
      const existing = await this.prisma.workflowInstance.findFirst({
        where: { organizationId, externalId: dto.externalId },
      });
      if (existing) return this.findOne(organizationId, existing.id);
    }

    const schema = version.definition as unknown as WorkflowDefinitionSchema;
    const initialState = this.definitions.getInitialState(schema);

    let resource = null;
    if (dto.resourceId) {
      resource = await this.prisma.resource.findFirst({
        where: { id: dto.resourceId, organizationId, deletedAt: null },
      });
    }

    const instance = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowInstance.create({
        data: {
          organizationId,
          definitionId: definition.id,
          versionId: version.id,
          versionNumber: version.version,
          resourceId: dto.resourceId,
          resourceType: dto.resourceType ?? definition.resourceType,
          currentState: initialState.key,
          status: 'active',
          context: (dto.context ?? {}) as object,
          priority: dto.priority ?? 'normal',
          startedBy: userId,
          externalId: dto.externalId,
          syncStatus: dto.externalId ? 'pending' : 'synced',
        },
      });

      await tx.workflowHistory.create({
        data: {
          instanceId: created.id,
          organizationId,
          fromState: null,
          toState: initialState.key,
          transitionKey: '__start__',
          actorId: userId,
          payload: { context: dto.context } as object,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
          deviceId: ctx?.deviceId,
        },
      });

      await this.createAssignmentsForStateTx(
        tx,
        created.id,
        organizationId,
        schema,
        initialState.key,
        {
          resource: resource
            ? { ownerId: resource.ownerId, data: resource.data as Record<string, unknown> }
            : null,
          variables: dto.context,
          startedBy: userId,
        },
      );

      return created;
    });

    await this.core.emitWorkflowStarted(
      organizationId,
      instance.id,
      {
        definitionId: definition.id,
        workflowKey: definition.workflowKey,
        version: version.version,
        currentState: initialState.key,
        resourceId: dto.resourceId,
      },
      { ctx: { ...ctx, userId, organizationId }, newValues: instance as unknown as Record<string, unknown> },
    );

    return this.findOne(organizationId, instance.id);
  }

  async executeTransition(
    organizationId: string,
    instanceId: string,
    userId: string,
    dto: ExecuteTransitionDto,
    ctx?: RequestContext,
    options?: { skipPermissionCheck?: boolean },
  ) {
    const instance = await this.findOne(organizationId, instanceId);

    if (instance.status === 'completed' || instance.status === 'cancelled') {
      throw new BadRequestException('Workflow instance is closed');
    }
    if (instance.status === 'suspended') {
      throw new BadRequestException('Workflow instance is suspended');
    }

    const schema = instance.workflowVersion.definition as unknown as WorkflowDefinitionSchema;
    const transition = this.findTransition(schema, instance.currentState, dto.transitionKey);

    if (!transition) {
      throw new BadRequestException(
        `Transition ${dto.transitionKey} not allowed from state ${instance.currentState}`,
      );
    }

    const resource = instance.resourceId
      ? await this.prisma.resource.findFirst({
          where: { id: instance.resourceId, organizationId },
        })
      : null;

    const evalCtx = {
      instance: instance as unknown as Record<string, unknown>,
      resource: resource as unknown as Record<string, unknown> | null,
      transition: transition as unknown as Record<string, unknown>,
      actor: { id: userId },
      variables: {
        ...(instance.context as object),
        ...(dto.variables ?? {}),
      },
    };

    if (!this.rules.evaluate(transition.conditions, evalCtx)) {
      throw new ForbiddenException('Transition conditions not met');
    }

    if (!this.rules.evaluate(transition.validations, evalCtx)) {
      throw new BadRequestException('Transition validations failed');
    }

    if (schema.rules?.length) {
      for (const ruleDef of schema.rules) {
        if (ruleDef.scope === 'global' || (ruleDef.scope === 'transition' && ruleDef.scopeRef === transition.key)) {
          if (!this.rules.evaluate(ruleDef.rule, evalCtx)) {
            throw new ForbiddenException(`Regla de negocio fallida: ${ruleDef.key}`);
          }
        }
      }
    }

    const toStateDef = schema.states.find((s) => s.key === transition.to);
    if (toStateDef?.forms) {
      const formCheck = await this.formBridge.validateStateForms(
        organizationId,
        schema,
        transition.to,
        dto.variables?.formSubmissionId as string | undefined,
      );
      if (!formCheck.valid) {
        throw new BadRequestException(formCheck.errors.join('; '));
      }
    }

    this.validateRequirements(transition, dto);

    if (!options?.skipPermissionCheck) {
      await this.checkTransitionPermission(
        organizationId,
        userId,
        transition,
        instance,
      );
    }

    const toState = schema.states.find((s) => s.key === transition.to);
    const isFinal = toState?.type === 'final';
    const isCancelled = toState?.type === 'cancelled';

    const pendingAssignees = !isFinal && !isCancelled
      ? await this.resolveAssigneesForState(
          organizationId,
          schema,
          transition.to,
          {
            resource: resource
              ? { ownerId: resource.ownerId, data: resource.data as Record<string, unknown> }
              : null,
            variables: evalCtx.variables as Record<string, unknown>,
            startedBy: userId,
          },
        )
      : [];

    const { history, newAssignments } = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.workflowInstance.updateMany({
        where: { id: instanceId, version: instance.version },
        data: {
          currentState: transition.to,
          context: {
            ...(instance.context as object),
            ...(dto.variables ?? {}),
          } as object,
          priority: transition.priority ?? instance.priority,
          dueAt: transition.dueInHours
            ? new Date(Date.now() + transition.dueInHours * 3600000)
            : instance.dueAt,
          version: { increment: 1 },
          status: isFinal ? 'completed' : isCancelled ? 'cancelled' : 'active',
          completedAt: isFinal || isCancelled ? new Date() : undefined,
          syncStatus: dto.externalId ? 'pending' : 'synced',
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Concurrent modification detected');
      }

      await tx.workflowAssignment.updateMany({
        where: { instanceId, status: 'pending' },
        data: { status: 'completed', completedAt: new Date() },
      });

      const historyRecord = await tx.workflowHistory.create({
        data: {
          instanceId,
          organizationId,
          fromState: instance.currentState,
          toState: transition.to,
          transitionKey: transition.key,
          actorId: userId,
          comment: dto.comment,
          payload: {
            variables: dto.variables,
            gpsLocation: dto.gpsLocation,
            signatureFileId: dto.signatureFileId,
          } as object,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
          deviceId: ctx?.deviceId,
        },
      });

      const createdAssignments: Array<{ id: string; userId: string }> = [];
      if (pendingAssignees.length > 0) {
        const state = schema.states.find((s) => s.key === transition.to);
        for (const assigneeId of pendingAssignees) {
          const assignment = await tx.workflowAssignment.create({
            data: {
              instanceId,
              organizationId,
              userId: assigneeId,
              stateKey: transition.to,
              transitionKey: transition.key,
              dueAt: state?.slaHours
                ? new Date(Date.now() + state.slaHours * 3600000)
                : undefined,
            },
          });
          createdAssignments.push({ id: assignment.id, userId: assignment.userId });
        }
      }

      return { history: historyRecord, newAssignments: createdAssignments };
    });

    for (const assignment of newAssignments) {
      await this.core.emitWorkflowAssignmentCreated(
        organizationId,
        instanceId,
        { assignmentId: assignment.id, userId: assignment.userId, stateKey: transition.to },
        {},
      );
    }

    const execCtx = {
      organizationId,
      instanceId,
      transitionKey: transition.key,
      fromState: instance.currentState,
      toState: transition.to,
      resourceId: instance.resourceId,
      variables: evalCtx.variables as Record<string, unknown>,
      actorId: userId,
      ctx,
    };

    await this.actions.executeActions(transition.actions, execCtx);
    await this.actions.queueNotifications(transition.notifications, execCtx, resource);

    await this.core.emitWorkflowStateChanged(
      organizationId,
      instanceId,
      {
        fromState: instance.currentState,
        toState: transition.to,
        transitionKey: transition.key,
        historyId: history.id,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: { currentState: instance.currentState },
        newValues: { currentState: transition.to },
      },
    );

    await this.core.emitWorkflowTransitionExecuted(
      organizationId,
      instanceId,
      {
        fromState: instance.currentState,
        toState: transition.to,
        transitionKey: transition.key,
        historyId: history.id,
        actorId: userId,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    await this.notificationDispatcher.dispatchPending(organizationId, 50);

    if (isFinal) {
      await this.core.emitWorkflowCompleted(organizationId, instanceId, {}, { ctx });
    }
    if (isCancelled) {
      await this.core.emitWorkflowCancelled(organizationId, instanceId, { reason: dto.comment }, { ctx });
    }

    return this.findOne(organizationId, instanceId);
  }

  async suspend(organizationId: string, instanceId: string, userId: string, ctx?: RequestContext) {
    const instance = await this.findOne(organizationId, instanceId);
    if (instance.status !== 'active') {
      throw new BadRequestException('Only active instances can be suspended');
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'suspended', suspendedAt: new Date(), suspendedBy: userId },
    });

    await this.core.emitWorkflowSuspended(organizationId, instanceId, {}, { ctx });
    return this.findOne(organizationId, instanceId);
  }

  async resume(organizationId: string, instanceId: string, userId: string, ctx?: RequestContext) {
    const instance = await this.findOne(organizationId, instanceId);
    if (instance.status !== 'suspended') {
      throw new BadRequestException('Instance is not suspended');
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'active', suspendedAt: null, suspendedBy: null },
    });

    await this.core.emitWorkflowResumed(organizationId, instanceId, {}, { ctx });
    return this.findOne(organizationId, instanceId);
  }

  async cancel(
    organizationId: string,
    instanceId: string,
    userId: string,
    reason?: string,
    ctx?: RequestContext,
  ) {
    const instance = await this.findOne(organizationId, instanceId);
    if (instance.status === 'completed' || instance.status === 'cancelled') {
      throw new BadRequestException('Instance already closed');
    }

    const schema = instance.workflowVersion.definition as unknown as WorkflowDefinitionSchema;
    const cancelState = schema.states.find((s) => s.type === 'cancelled');

    if (cancelState) {
      const cancelTransition = schema.transitions.find(
        (t) =>
          (t.from === instance.currentState || t.from === '*') &&
          t.to === cancelState.key,
      );
      if (cancelTransition) {
        return this.executeTransition(
          organizationId,
          instanceId,
          userId,
          { transitionKey: cancelTransition.key, comment: reason },
          ctx,
          { skipPermissionCheck: true },
        );
      }
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    await this.core.emitWorkflowCancelled(organizationId, instanceId, { reason }, { ctx });
    return this.findOne(organizationId, instanceId);
  }

  async addComment(
    organizationId: string,
    instanceId: string,
    userId: string,
    content: string,
  ) {
    await this.findOne(organizationId, instanceId);
    return this.prisma.workflowComment.create({
      data: { instanceId, userId, content },
    });
  }

  async queueOfflineTransition(
    organizationId: string,
    instanceId: string,
    userId: string,
    dto: ExecuteTransitionDto,
    deviceId?: string,
  ) {
    await this.findOne(organizationId, instanceId);

    if (!dto.externalId) {
      throw new BadRequestException('externalId required for offline transitions');
    }

    const existing = await this.prisma.workflowTransitionQueue.findFirst({
      where: { organizationId, externalId: dto.externalId },
    });
    if (existing) return existing;

    return this.prisma.workflowTransitionQueue.create({
      data: {
        instanceId,
        organizationId,
        transitionKey: dto.transitionKey,
        payload: dto as object,
        actorId: userId,
        externalId: dto.externalId,
        deviceId,
        syncStatus: 'pending',
      },
    });
  }

  async syncTransitions(organizationId: string, userId: string, dto: SyncTransitionsDto, ctx?: RequestContext) {
    const results = [];

    for (const item of dto.transitions) {
      try {
        let instanceId = item.instanceId;

        if (item.start) {
          const started = await this.start(organizationId, userId, item.start, ctx);
          instanceId = started.id;
        }

        if (!instanceId) continue;

        const result = await this.executeTransition(
          organizationId,
          instanceId,
          userId,
          item,
          ctx,
        );

        if (item.externalId) {
          await this.prisma.workflowTransitionQueue.updateMany({
            where: { organizationId, externalId: item.externalId },
            data: { syncStatus: 'synced', processedAt: new Date() },
          });
        }

        results.push({ externalId: item.externalId, success: true, instanceId: result.id });
      } catch (err) {
        results.push({
          externalId: item.externalId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { results };
  }

  async getInbox(organizationId: string, userId: string) {
    return this.prisma.workflowAssignment.findMany({
      where: { organizationId, userId, status: { in: ['pending', 'escalated'] } },
      include: {
        instance: {
          include: {
            workflowDefinition: { select: { workflowKey: true, name: true } },
            workflowVersion: { select: { version: true } },
          },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getHistory(organizationId: string, instanceId: string) {
    await this.findOne(organizationId, instanceId);
    return this.prisma.workflowHistory.findMany({
      where: { instanceId, organizationId },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
  }

  async reassignTask(
    organizationId: string,
    assignmentId: string,
    newUserId: string,
    actorId: string,
  ) {
    const assignment = await this.prisma.workflowAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    if (assignment.status !== 'pending' && assignment.status !== 'escalated') {
      throw new BadRequestException('Solo tareas pendientes pueden reasignarse');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: { reassigned: true, reassignedBy: actorId },
        },
      });

      return tx.workflowAssignment.create({
        data: {
          instanceId: assignment.instanceId,
          organizationId,
          userId: newUserId,
          stateKey: assignment.stateKey,
          transitionKey: assignment.transitionKey,
          dueAt: assignment.dueAt,
          metadata: { reassignedFrom: assignment.userId, reassignedBy: actorId },
        },
      });
    });
  }

  async escalateTask(organizationId: string, assignmentId: string, actorId: string) {
    const assignment = await this.prisma.workflowAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');

    return this.prisma.workflowAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'escalated',
        metadata: { escalatedBy: actorId, escalatedAt: new Date().toISOString() },
      },
    });
  }

  async addAttachment(
    organizationId: string,
    instanceId: string,
    userId: string,
    fileId: string,
    transitionId?: string,
  ) {
    await this.findOne(organizationId, instanceId);
    return this.prisma.workflowAttachment.create({
      data: { instanceId, fileId, uploadedBy: userId, transitionId },
    });
  }

  private async resolveVersionById(organizationId: string, versionId: string) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId, workflowDefinition: { organizationId } },
      include: { workflowDefinition: true },
    });
    if (!version) throw new NotFoundException('Workflow version not found');
    return { definition: version.workflowDefinition, version };
  }

  private findTransition(
    schema: WorkflowDefinitionSchema,
    currentState: string,
    transitionKey: string,
  ): WorkflowTransitionDefinition | undefined {
    return schema.transitions.find(
      (t) =>
        t.key === transitionKey &&
        (t.from === currentState || t.from === '*'),
    );
  }

  private validateRequirements(
    transition: WorkflowTransitionDefinition,
    dto: ExecuteTransitionDto,
  ) {
    const req = transition.requirements;
    if (!req) return;

    if (req.comment && !dto.comment?.trim()) {
      throw new BadRequestException('Comment required for this transition');
    }
    if (req.gps && !dto.gpsLocation) {
      throw new BadRequestException('GPS location required for this transition');
    }
    if (req.signature && !dto.signatureFileId) {
      throw new BadRequestException('Signature required for this transition');
    }
  }

  private async checkTransitionPermission(
    organizationId: string,
    userId: string,
    transition: WorkflowTransitionDefinition,
    instance: { startedBy: string | null },
  ) {
    const access = await this.accessControl.resolveUserAccess(userId, organizationId);

    const required = transition.permissions?.length
      ? transition.permissions
      : ['workflow:execute'];

    const allowed = await this.accessControl.authorize(
      {
        userId,
        organizationId,
        roles: access.roles,
        permissions: access.permissions,
        resource: 'workflow',
        action: 'execute',
      },
      required,
    );

    if (!allowed) {
      throw new ForbiddenException('Not authorized for this transition');
    }

    const assignees = await this.assignments.resolve(transition.participants, {
      organizationId,
      startedBy: instance.startedBy ?? undefined,
    });

    if (assignees.length > 0 && !assignees.includes(userId) && !access.roles.includes('admin')) {
      throw new ForbiddenException('User is not assigned to this transition');
    }
  }

  private async resolveAssigneesForState(
    organizationId: string,
    schema: WorkflowDefinitionSchema,
    stateKey: string,
    ctx: {
      resource?: { ownerId?: string | null; data?: Record<string, unknown> } | null;
      variables?: Record<string, unknown>;
      startedBy?: string;
    },
  ): Promise<string[]> {
    const outgoing = schema.transitions.filter(
      (t) => t.from === stateKey || t.from === '*',
    );

    const userIds = new Set<string>();
    for (const t of outgoing) {
      const resolved = await this.assignments.resolve(t.participants, {
        organizationId,
        resource: ctx.resource ?? undefined,
        variables: ctx.variables,
        startedBy: ctx.startedBy,
      });
      resolved.forEach((id) => userIds.add(id));
    }

    return [...userIds];
  }

  private async createAssignmentsForStateTx(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    instanceId: string,
    organizationId: string,
    schema: WorkflowDefinitionSchema,
    stateKey: string,
    ctx: {
      resource?: { ownerId?: string | null; data?: Record<string, unknown> } | null;
      variables?: Record<string, unknown>;
      startedBy?: string;
    },
    transitionKey?: string,
  ) {
    const state = schema.states.find((s) => s.key === stateKey);
    const userIds = await this.resolveAssigneesForState(
      organizationId,
      schema,
      stateKey,
      ctx,
    );

    for (const userId of userIds) {
      await tx.workflowAssignment.create({
        data: {
          instanceId,
          organizationId,
          userId,
          stateKey,
          transitionKey,
          dueAt: state?.slaHours
            ? new Date(Date.now() + state.slaHours * 3600000)
            : undefined,
        },
      });
    }
  }

  private async createAssignmentsForState(
    instanceId: string,
    organizationId: string,
    schema: WorkflowDefinitionSchema,
    stateKey: string,
    ctx: {
      resource?: { ownerId?: string | null; data?: Record<string, unknown> } | null;
      variables?: Record<string, unknown>;
      startedBy?: string;
    },
    transitionKey?: string,
  ) {
    const state = schema.states.find((s) => s.key === stateKey);
    const outgoing = schema.transitions.filter(
      (t) => t.from === stateKey || t.from === '*',
    );

    const userIds = new Set<string>();
    for (const t of outgoing) {
      const resolved = await this.assignments.resolve(t.participants, {
        organizationId,
        resource: ctx.resource ?? undefined,
        variables: ctx.variables,
        startedBy: ctx.startedBy,
      });
      resolved.forEach((id) => userIds.add(id));
    }

    for (const userId of userIds) {
      const assignment = await this.prisma.workflowAssignment.create({
        data: {
          instanceId,
          organizationId,
          userId,
          stateKey,
          transitionKey,
          dueAt: state?.slaHours
            ? new Date(Date.now() + state.slaHours * 3600000)
            : undefined,
        },
      });

      await this.core.emitWorkflowAssignmentCreated(
        organizationId,
        instanceId,
        { assignmentId: assignment.id, userId, stateKey },
        {},
      );
    }
  }

  private async createHistory(params: {
    instanceId: string;
    organizationId: string;
    fromState: string | null;
    toState: string;
    transitionKey: string;
    actorId?: string;
    comment?: string;
    payload?: Record<string, unknown>;
    ctx?: RequestContext;
  }) {
    return this.prisma.workflowHistory.create({
      data: {
        instanceId: params.instanceId,
        organizationId: params.organizationId,
        fromState: params.fromState,
        toState: params.toState,
        transitionKey: params.transitionKey,
        actorId: params.actorId,
        comment: params.comment,
        payload: (params.payload ?? {}) as object,
        ipAddress: params.ctx?.ipAddress,
        userAgent: params.ctx?.userAgent,
        deviceId: params.ctx?.deviceId,
      },
    });
  }
}
