import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EventService } from '@/core/events/application/event.service';
import { AuditService } from '@/core/audit/application/audit.service';
import { SyncService } from '@/core/sync/application/sync.service';
import { RequestContext, buildEventMetadata } from '../middleware/request-context.middleware';

export interface EmitOptions {
  ctx?: Partial<RequestContext>;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  enqueueSync?: boolean;
}

@Injectable()
export class CoreEngineService {
  constructor(
    private readonly events: EventService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
  ) {}

  async emitResourceCreated(
    organizationId: string,
    resourceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Resource',
        aggregateId: resourceId,
        eventType: EVENT_TYPES.RESOURCE_CREATED,
        payload: {
          ...payload,
          newValues: options?.newValues ?? payload,
        },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitResourceUpdated(
    organizationId: string,
    resourceId: string,
    payload: Record<string, unknown>,
    options: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Resource',
        aggregateId: resourceId,
        eventType: EVENT_TYPES.RESOURCE_UPDATED,
        payload: {
          ...payload,
          oldValues: options.oldValues,
          newValues: options.newValues,
        },
        metadata: buildEventMetadata(options.ctx),
      },
      'UPDATE',
      options,
    );
  }

  async emitResourceDeleted(
    organizationId: string,
    resourceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Resource',
        aggregateId: resourceId,
        eventType: EVENT_TYPES.RESOURCE_DELETED,
        payload: {
          ...payload,
          oldValues: options?.oldValues,
        },
        metadata: buildEventMetadata(options?.ctx),
      },
      'DELETE',
      options,
    );
  }

  async emitFileUploaded(
    organizationId: string,
    fileResourceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'File',
        aggregateId: fileResourceId,
        eventType: EVENT_TYPES.FILE_UPLOADED,
        payload: {
          ...payload,
          newValues: options?.newValues ?? payload,
        },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitUserAction(
    organizationId: string,
    entityType: string,
    entityId: string,
    action: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: entityType,
        aggregateId: entityId,
        eventType: EVENT_TYPES.USER_ACTION_EXECUTED,
        payload: { action, ...payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'ACTION',
      { ...options, enqueueSync: false },
    );
  }

  async emitAuthLoggedIn(
    organizationId: string,
    userId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'User',
        aggregateId: userId,
        eventType: EVENT_TYPES.AUTH_LOGGED_IN,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'ACTION',
      { ...options, enqueueSync: false },
    );
  }

  async emitUserCreated(
    organizationId: string,
    userId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'User',
        aggregateId: userId,
        eventType: EVENT_TYPES.USER_CREATED,
        payload: { ...payload, newValues: payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitFormCreated(
    organizationId: string,
    formId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Form',
        aggregateId: formId,
        eventType: EVENT_TYPES.FORM_CREATED,
        payload: { ...payload, newValues: payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitFormPublished(
    organizationId: string,
    formId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Form',
        aggregateId: formId,
        eventType: EVENT_TYPES.FORM_PUBLISHED,
        payload: { ...payload, newValues: payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'PUBLISH',
      options,
    );
  }

  async emitFormSubmitted(
    organizationId: string,
    submissionId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FormSubmission',
        aggregateId: submissionId,
        eventType: EVENT_TYPES.FORM_SUBMITTED,
        payload: { ...payload, newValues: payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitCaptureAnalyticsEvent(
    organizationId: string,
    entityId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'CaptureAnalytics',
        aggregateId: entityId,
        eventType: EVENT_TYPES.CAPTURE_ANALYTICS_EVENT,
        payload: {
          ...payload,
          integration: 'ebiap',
          captureModule: 'capture-analytics',
        },
        metadata: buildEventMetadata(options?.ctx),
      },
      'ACTION',
      { ...options, enqueueSync: false },
    );
  }

  async emitFieldValidated(
    organizationId: string,
    formId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Form',
        aggregateId: formId,
        eventType: EVENT_TYPES.FIELD_VALIDATED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'VALIDATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitSyncCompleted(
    organizationId: string,
    entityId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FormSubmission',
        aggregateId: entityId,
        eventType: EVENT_TYPES.SYNC_COMPLETED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'SYNC',
      options,
    );
  }

  async emitWorkflowDefinitionCreated(
    organizationId: string,
    definitionId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'Workflow',
      definitionId,
      EVENT_TYPES.WORKFLOW_DEFINITION_CREATED,
      payload,
      'CREATE',
      options,
    );
  }

  async emitWorkflowVersionCreated(
    organizationId: string,
    definitionId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'Workflow',
      definitionId,
      EVENT_TYPES.WORKFLOW_VERSION_CREATED,
      payload,
      'CREATE',
      options,
    );
  }

  async emitWorkflowVersionPublished(
    organizationId: string,
    definitionId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'Workflow',
      definitionId,
      EVENT_TYPES.WORKFLOW_VERSION_PUBLISHED,
      payload,
      'PUBLISH',
      options,
    );
  }

  async emitWorkflowStarted(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_STARTED,
      payload,
      'CREATE',
      options,
    );
  }

  async emitWorkflowStateChanged(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_STATE_CHANGED,
      {
        ...payload,
        oldValues: options.oldValues,
        newValues: options.newValues,
      },
      'UPDATE',
      options,
    );
  }

  async emitWorkflowTransitionExecuted(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_TRANSITION_EXECUTED,
      payload,
      'UPDATE',
      options,
    );
  }

  async emitWorkflowCompleted(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_COMPLETED,
      payload,
      'UPDATE',
      options,
    );
  }

  async emitWorkflowCancelled(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_CANCELLED,
      payload,
      'UPDATE',
      options,
    );
  }

  async emitWorkflowSuspended(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_SUSPENDED,
      payload,
      'UPDATE',
      options,
    );
  }

  async emitWorkflowResumed(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_RESUMED,
      payload,
      'UPDATE',
      options,
    );
  }

  async emitWorkflowAssignmentCreated(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_ASSIGNMENT_CREATED,
      payload,
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitWorkflowNotificationQueued(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_NOTIFICATION_QUEUED,
      payload,
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitNotificationRuleTriggered(
    organizationId: string,
    messageId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: messageId,
        eventType: EVENT_TYPES.NOTIFICATION_RULE_TRIGGERED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitNotificationRead(
    organizationId: string,
    messageId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: messageId,
        eventType: EVENT_TYPES.NOTIFICATION_READ,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'UPDATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitNotificationAttended(
    organizationId: string,
    messageId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: messageId,
        eventType: EVENT_TYPES.NOTIFICATION_ATTENDED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'UPDATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitNotificationEscalated(
    organizationId: string,
    messageId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: messageId,
        eventType: EVENT_TYPES.NOTIFICATION_ESCALATED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'UPDATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitNotificationScheduleFired(
    organizationId: string,
    scheduleId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: scheduleId,
        eventType: EVENT_TYPES.NOTIFICATION_SCHEDULE_FIRED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitExternalEventReceived(
    organizationId: string,
    eventId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Notification',
        aggregateId: eventId,
        eventType: EVENT_TYPES.EXTERNAL_EVENT_RECEIVED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      { ...options, enqueueSync: false },
    );
  }

  async emitWorkflowActionExecuted(
    organizationId: string,
    instanceId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emitWorkflowEvent(
      organizationId,
      'WorkflowInstance',
      instanceId,
      EVENT_TYPES.WORKFLOW_ACTION_EXECUTED,
      payload,
      'ACTION',
      { ...options, enqueueSync: false },
    );
  }

  async emitProducerCreated(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_CREATED,
        payload: { ...payload, newValues: options?.newValues ?? payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitProducerUpdated(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_UPDATED,
        payload: {
          ...payload,
          oldValues: options.oldValues,
          newValues: options.newValues,
        },
        metadata: buildEventMetadata(options.ctx),
      },
      'UPDATE',
      options,
    );
  }

  async emitProducerDeleted(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_DELETED,
        payload: { ...payload, oldValues: options?.oldValues },
        metadata: buildEventMetadata(options?.ctx),
      },
      'DELETE',
      options,
    );
  }

  async emitProducerLifecycleChanged(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_LIFECYCLE_CHANGED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'LIFECYCLE',
      options,
    );
  }

  async emitProducerAssigned(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_ASSIGNED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'ASSIGN',
      options,
    );
  }

  async emitProducerMerged(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_MERGED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'MERGE',
      { ...options, enqueueSync: false },
    );
  }

  async emitProducerSynced(
    organizationId: string,
    producerId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'Producer',
        aggregateId: producerId,
        eventType: EVENT_TYPES.PRODUCER_SYNCED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'SYNC',
      options,
    );
  }

  async emitFarmCreated(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_CREATED,
        payload: { ...payload, newValues: options?.newValues ?? payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitFarmUpdated(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_UPDATED,
        payload: {
          ...payload,
          oldValues: options.oldValues,
          newValues: options.newValues,
        },
        metadata: buildEventMetadata(options.ctx),
      },
      'UPDATE',
      options,
    );
  }

  async emitFarmDeleted(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_DELETED,
        payload: { ...payload, oldValues: options?.oldValues },
        metadata: buildEventMetadata(options?.ctx),
      },
      'DELETE',
      options,
    );
  }

  async emitFarmLifecycleChanged(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_LIFECYCLE_CHANGED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'LIFECYCLE',
      options,
    );
  }

  async emitFarmGeometryRevised(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_GEOMETRY_REVISED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'GEOMETRY',
      options,
    );
  }

  async emitFarmSynced(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_SYNCED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'SYNC',
      options,
    );
  }

  async emitFarmTwinRefreshed(
    organizationId: string,
    farmUnitId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FarmUnit',
        aggregateId: farmUnitId,
        eventType: EVENT_TYPES.FARM_TWIN_REFRESHED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'REFRESH',
      { ...options, enqueueSync: false },
    );
  }

  async emitFieldLotRegistered(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_REGISTERED,
        payload: { ...payload, newValues: options?.newValues ?? payload },
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitFieldLotActivated(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_ACTIVATED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'ACTIVATE',
      options,
    );
  }

  async emitFieldLotUpdated(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_UPDATED,
        payload: { ...payload, oldValues: options.oldValues, newValues: options.newValues },
        metadata: buildEventMetadata(options?.ctx),
      },
      'UPDATE',
      options,
    );
  }

  async emitFieldLotDeleted(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_DELETED,
        payload: { ...payload, oldValues: options?.oldValues },
        metadata: buildEventMetadata(options?.ctx),
      },
      'DELETE',
      options,
    );
  }

  async emitFieldLotStatusChanged(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_STATUS_CHANGED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'LIFECYCLE',
      options,
    );
  }

  async emitFieldOperationRecorded(
    organizationId: string,
    operationId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldOperation',
        aggregateId: operationId,
        eventType: EVENT_TYPES.FIELD_OPERATION_RECORDED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'CREATE',
      options,
    );
  }

  async emitLotDigitalTwinRefreshed(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.LOT_DIGITAL_TWIN_REFRESHED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'REFRESH',
      { ...options, enqueueSync: false },
    );
  }

  async emitFieldLotSynced(
    organizationId: string,
    fieldLotId: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType: 'FieldLotProfile',
        aggregateId: fieldLotId,
        eventType: EVENT_TYPES.FIELD_LOT_SYNCED,
        payload,
        metadata: buildEventMetadata(options?.ctx),
      },
      'SYNC',
      options,
    );
  }

  private async emitWorkflowEvent(
    organizationId: string,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
    syncOperation: string,
    options?: EmitOptions,
  ) {
    return this.emit(
      {
        organizationId,
        aggregateType,
        aggregateId,
        eventType,
        payload: {
          ...payload,
          ...(options?.newValues ? { newValues: options.newValues } : {}),
        },
        metadata: buildEventMetadata(options?.ctx),
      },
      syncOperation,
      options,
    );
  }

  private async emit(
    event: DomainEvent,
    syncOperation: string,
    options?: EmitOptions,
  ) {
    const stored = await this.events.emit(event);
    await this.audit.recordFromEvent(stored);

    if (options?.enqueueSync !== false) {
      await this.sync.enqueueFromEvent(stored, syncOperation);
      if (event.aggregateType === 'Resource') {
        await this.sync.markResourcePending(event.aggregateId);
      }
      if (event.aggregateType === 'Producer') {
        await this.sync.markProducerPending(event.aggregateId);
      }
      if (event.aggregateType === 'FarmUnit') {
        await this.sync.markFarmPending(event.aggregateId);
      }
      if (event.aggregateType === 'FieldLotProfile') {
        await this.sync.markFieldLotPending(event.aggregateId);
      }
    }

    return stored;
  }
}
