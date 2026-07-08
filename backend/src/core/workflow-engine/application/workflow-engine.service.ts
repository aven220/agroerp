import { Injectable, Logger, Optional } from '@nestjs/common';
import type { DomainEventPayload } from '@agroerp/shared';
import { EventService } from '@/core/events/application/event.service';
import { buildEventMetadata } from '@/core/engine/middleware/request-context.middleware';
import type {
  WorkflowCurrentState,
  WorkflowDefinition,
} from '../domain/workflow-definition';
import {
  FORM_WORKFLOW_AGGREGATE_TYPE,
  FORM_WORKFLOW_EVENT_TYPES,
  type WorkflowStartedEventPayload,
  type WorkflowTransitionEventPayload,
} from '../events/workflow-transition.event';
import { WorkflowActionExecutorService } from '@/core/workflow-actions/application/workflow-action-executor.service';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowTransitionService } from './workflow-transition.service';

export interface WorkflowSubmissionContext {
  organizationId: string;
  submissionId: string;
  formId: string;
  formKey?: string;
  userId?: string;
  formMetadata: unknown;
  draft?: boolean;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly definitions: WorkflowDefinitionService,
    private readonly transitions: WorkflowTransitionService,
    private readonly events: EventService,
    @Optional() private readonly actionExecutor?: WorkflowActionExecutorService,
  ) {}

  async onSubmissionSaved(context: WorkflowSubmissionContext): Promise<void> {
    if (context.draft) return;

    const definition = this.definitions.resolveFromFormMetadata(context.formMetadata);
    if (!definition) return;

    const validation = this.definitions.validate(definition);
    if (!validation.valid) {
      this.logger.warn(
        `Invalid workflow for submission ${context.submissionId}: ${validation.errors.join('; ')}`,
      );
      return;
    }

    let current = await this.getCurrentState(context.organizationId, context.submissionId);
    if (!current) {
      current = await this.startWorkflow({
        organizationId: context.organizationId,
        submissionId: context.submissionId,
        formId: context.formId,
        formKey: context.formKey,
        userId: context.userId,
        definition,
      });
    }

    const submitTransition = this.transitions.validate(definition, current.stateId, 'SUBMIT');
    if (!submitTransition.valid) {
      this.logger.debug(
        `No SUBMIT transition from ${current.stateId} for submission ${context.submissionId}`,
      );
      return;
    }

    await this.executeTransition({
      organizationId: context.organizationId,
      submissionId: context.submissionId,
      formId: context.formId,
      formKey: context.formKey,
      userId: context.userId,
      definition,
      action: 'SUBMIT',
    });
  }

  async startWorkflow(input: {
    organizationId: string;
    submissionId: string;
    formId: string;
    formKey?: string;
    userId?: string;
    definition: WorkflowDefinition;
  }): Promise<WorkflowCurrentState> {
    const initial = this.definitions.resolveInitialState(input.definition);
    if (!initial) {
      throw new Error('Workflow has no initial state');
    }

    const payload: WorkflowStartedEventPayload = {
      submissionId: input.submissionId,
      formId: input.formId,
      formKey: input.formKey,
      stateId: initial.id,
      stateName: initial.name,
    };

    await this.events.emit({
      organizationId: input.organizationId,
      aggregateType: FORM_WORKFLOW_AGGREGATE_TYPE,
      aggregateId: input.submissionId,
      eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
      payload: payload as unknown as DomainEventPayload,
      metadata: buildEventMetadata({ userId: input.userId }),
    });

    return { stateId: initial.id, stateName: initial.name };
  }

  async getCurrentState(
    organizationId: string,
    submissionId: string,
  ): Promise<WorkflowCurrentState | null> {
    const domainEvents = await this.events.getByAggregate(
      FORM_WORKFLOW_AGGREGATE_TYPE,
      submissionId,
    );

    const relevant = domainEvents
      .filter((event) => event.occurredAt instanceof Date)
      .sort((a, b) => a.occurredAt!.getTime() - b.occurredAt!.getTime());

    let current: WorkflowCurrentState | null = null;

    for (const event of relevant) {
      if (event.eventType === FORM_WORKFLOW_EVENT_TYPES.STARTED) {
        const payload = event.payload as unknown as WorkflowStartedEventPayload;
        current = {
          stateId: payload.stateId,
          stateName: payload.stateName,
        };
      }
      if (event.eventType === FORM_WORKFLOW_EVENT_TYPES.TRANSITION) {
        const payload = event.payload as unknown as WorkflowTransitionEventPayload;
        current = {
          stateId: payload.toStateId,
          stateName: payload.toStateName,
        };
      }
    }

    return current;
  }

  async executeTransition(input: {
    organizationId: string;
    submissionId: string;
    formId: string;
    formKey?: string;
    userId?: string;
    definition: WorkflowDefinition;
    action: string;
  }): Promise<WorkflowCurrentState | null> {
    const current = await this.getCurrentState(input.organizationId, input.submissionId);
    if (!current) {
      this.logger.warn(`Workflow not started for submission ${input.submissionId}`);
      return null;
    }

    const validation = this.transitions.validate(
      input.definition,
      current.stateId,
      input.action,
    );

    if (!validation.valid || !validation.transition) {
      this.logger.warn(
        `Invalid workflow transition for submission ${input.submissionId}: ${validation.error}`,
      );
      return null;
    }

    const toState = this.definitions.findState(input.definition, validation.transition.to);
    if (!toState) {
      this.logger.warn(
        `Target workflow state missing for submission ${input.submissionId}: ${validation.transition.to}`,
      );
      return null;
    }

    const payload: WorkflowTransitionEventPayload = {
      submissionId: input.submissionId,
      formId: input.formId,
      formKey: input.formKey,
      fromStateId: current.stateId,
      fromStateName: current.stateName,
      toStateId: toState.id,
      toStateName: toState.name,
      action: input.action,
      userId: input.userId,
    };

    await this.events.emit({
      organizationId: input.organizationId,
      aggregateType: FORM_WORKFLOW_AGGREGATE_TYPE,
      aggregateId: input.submissionId,
      eventType: FORM_WORKFLOW_EVENT_TYPES.TRANSITION,
      payload: payload as unknown as DomainEventPayload,
      metadata: buildEventMetadata({ userId: input.userId }),
    });

    if (this.actionExecutor) {
      try {
        await this.actionExecutor.executeAfterTransition({
          organizationId: input.organizationId,
          submissionId: input.submissionId,
          formId: input.formId,
          formKey: input.formKey,
          userId: input.userId,
          action: input.action,
          fromStateId: current.stateId,
          fromStateName: current.stateName,
          toStateId: toState.id,
          toStateName: toState.name,
        });
      } catch (err) {
        this.logger.warn(
          `Workflow action execution failed for submission ${input.submissionId}: ${(err as Error).message}`,
        );
      }
    }

    return { stateId: toState.id, stateName: toState.name };
  }
}
