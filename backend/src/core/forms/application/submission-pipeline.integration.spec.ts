import { CAPTURE_ANALYTICS_EVENT_TYPES, CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { CaptureSyncService } from '@/core/capture/application/capture-sync.service';
import { SubmissionProcessorService } from '@/core/capture-processing/application/submission-processor.service';
import { AnalyticsProvider } from '@/core/agricultural-timeline/providers/analytics.provider';
import { EntityResolutionService } from '@/core/entity-resolution/application/entity-resolution.service';
import { EntityResolverRegistry } from '@/core/entity-resolution/application/entity-resolution-registry';
import { ProducerResolver } from '@/core/entity-resolution/resolvers/producer.resolver';
import { SubmissionContextBuilder } from '@/core/submission-flow/application/submission-context.builder';
import { SubmissionDecisionService } from '@/core/submission-flow/application/submission-decision.service';
import { SubmissionFlowService } from '@/core/submission-flow/application/submission-flow.service';
import { FLOW_ACTIONS } from '@/core/submission-flow/domain/flow-context';
import { WorkflowActionExecutorService } from '@/core/workflow-actions/application/workflow-action-executor.service';
import { WORKFLOW_BUSINESS_EVENT_TYPES } from '@/core/workflow-actions/domain/workflow-action';
import { WorkflowDefinitionService } from '@/core/workflow-engine/application/workflow-definition.service';
import { WorkflowEngineService } from '@/core/workflow-engine/application/workflow-engine.service';
import { WorkflowTransitionService } from '@/core/workflow-engine/application/workflow-transition.service';
import { FORM_WORKFLOW_EVENT_TYPES } from '@/core/workflow-engine/events/workflow-transition.event';
import type { ProcessableSubmission } from '@/core/capture-processing/domain/types/processable-submission';

function buildProcessable(
  overrides: Partial<ProcessableSubmission> & { metadata?: Record<string, unknown> } = {},
): ProcessableSubmission {
  const base: ProcessableSubmission = {
    organizationId: 'org-1',
    userId: 'user-1',
    form: {
      id: 'form-1',
      formKey: 'producer_registration',
      version: 1,
      metadata: { processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE },
    },
    submission: {
      id: 'sub-1',
      organizationId: 'org-1',
      formId: 'form-1',
      formVersion: 1,
      resourceId: 'res-1',
      data: { legalName: 'Test Producer', documentNumber: '123456' },
      gpsLocation: null,
      gpsTrack: null,
      deviceInfo: null,
      context: {},
      status: 'submitted',
      syncStatus: 'pending',
      externalId: 'ext-1',
      workflowState: null,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    resource: {
      id: 'res-1',
      organizationId: 'org-1',
      resourceType: 'form_submission',
      schemaVersion: 1,
      data: {},
      attributes: {},
      metadata: {},
      status: 'submitted',
      syncStatus: 'pending',
      externalId: 'ext-1',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    draft: false,
  };

  if (overrides.metadata) {
    base.form.metadata = overrides.metadata;
  }

  return {
    ...base,
    ...overrides,
    form: { ...base.form, ...(overrides.form ?? {}) },
    submission: { ...base.submission, ...(overrides.submission ?? {}) },
  };
}

describe('Submission pipeline integration', () => {
  describe('workflow path', () => {
    const definitions = new WorkflowDefinitionService();
    const transitions = new WorkflowTransitionService(definitions);
    const events = {
      emit: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      getByAggregate: jest.fn().mockResolvedValue([]),
    };

    let engine: WorkflowEngineService;
    let actionExecutor: WorkflowActionExecutorService;
    const submissionFlow = { decide: jest.fn() };
    const submissionProcessor = { processSubmission: jest.fn().mockResolvedValue(undefined) };
    const submissionRepository = {
      findFirstByOrgAndId: jest.fn(),
      findResourceById: jest.fn(),
    };
    const forms = { findOne: jest.fn() };

    const workflowDefinition = {
      enabled: true,
      states: [
        { id: 'sent', name: 'Enviado' },
        { id: 'review', name: 'Revisión' },
        { id: 'approved', name: 'Aprobado' },
      ],
      transitions: [
        { from: 'sent', to: 'review', action: 'SUBMIT' },
        { from: 'review', to: 'approved', action: 'APPROVE' },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      actionExecutor = new WorkflowActionExecutorService(
        events as never,
        submissionFlow as never,
        submissionProcessor as never,
        submissionRepository as never,
        forms as never,
      );
      engine = new WorkflowEngineService(
        definitions,
        transitions,
        events as never,
        actionExecutor,
      );
    });

    it('form without workflow does not emit workflow events', async () => {
      await engine.onSubmissionSaved({
        organizationId: 'org-1',
        submissionId: 'sub-1',
        formId: 'form-1',
        formMetadata: { processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE },
      });

      expect(events.emit).not.toHaveBeenCalled();
      expect(submissionFlow.decide).not.toHaveBeenCalled();
    });

    it('form with workflow starts and executes SUBMIT transition', async () => {
      events.getByAggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
            occurredAt: new Date('2026-03-01T10:00:00.000Z'),
            payload: { stateId: 'sent', stateName: 'Enviado' },
          },
        ]);

      await engine.onSubmissionSaved({
        organizationId: 'org-1',
        submissionId: 'sub-1',
        formId: 'form-1',
        userId: 'user-1',
        formMetadata: { workflow: workflowDefinition },
      });

      expect(events.emit).toHaveBeenCalledTimes(2);
      expect(events.emit.mock.calls[0][0].eventType).toBe(FORM_WORKFLOW_EVENT_TYPES.STARTED);
      expect(events.emit.mock.calls[1][0].eventType).toBe(FORM_WORKFLOW_EVENT_TYPES.TRANSITION);
      expect(submissionFlow.decide).not.toHaveBeenCalled();
    });

    it('APPROVE transition dispatches submission flow processing', async () => {
      const processable = buildProcessable();
      submissionRepository.findFirstByOrgAndId.mockResolvedValue(processable.submission);
      submissionRepository.findResourceById.mockResolvedValue(processable.resource);
      forms.findOne.mockResolvedValue({
        id: 'form-1',
        formKey: 'producer_registration',
        version: 1,
        metadata: processable.form.metadata,
        schema: {},
      });
      submissionFlow.decide.mockResolvedValue({
        action: FLOW_ACTIONS.CREATE_ENTITY,
        processor: 'producer',
      });

      events.getByAggregate.mockResolvedValue([
        {
          eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
          occurredAt: new Date('2026-03-01T10:00:00.000Z'),
          payload: { stateId: 'review', stateName: 'Revisión' },
        },
      ]);

      await engine.executeTransition({
        organizationId: 'org-1',
        submissionId: 'sub-1',
        formId: 'form-1',
        userId: 'user-1',
        definition: workflowDefinition,
        action: 'APPROVE',
      });

      expect(submissionFlow.decide).toHaveBeenCalled();
      expect(submissionProcessor.processSubmission).toHaveBeenCalled();
    });

    it('REJECT transition emits business rejection event', async () => {
      const definition = {
        ...workflowDefinition,
        transitions: [
          ...workflowDefinition.transitions,
          { from: 'review', to: 'sent', action: 'REJECT' },
        ],
      };

      events.getByAggregate.mockResolvedValue([
        {
          eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
          occurredAt: new Date('2026-03-01T10:00:00.000Z'),
          payload: { stateId: 'review', stateName: 'Revisión' },
        },
      ]);

      await engine.executeTransition({
        organizationId: 'org-1',
        submissionId: 'sub-1',
        formId: 'form-1',
        userId: 'user-1',
        definition,
        action: 'REJECT',
      });

      expect(events.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: WORKFLOW_BUSINESS_EVENT_TYPES.REJECTION,
        }),
      );
    });
  });

  describe('entity resolution and submission flow', () => {
    const producers = {
      checkDuplicate: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    let submissionFlow: SubmissionFlowService;

    beforeEach(() => {
      jest.clearAllMocks();
      const producerResolver = new ProducerResolver(producers as never);
      const registry = new EntityResolverRegistry([producerResolver]);
      const entityResolution = new EntityResolutionService(registry);
      const contextBuilder = new SubmissionContextBuilder(entityResolution);
      submissionFlow = new SubmissionFlowService(
        contextBuilder,
        new SubmissionDecisionService(),
      );
    });

    it('entity resolution finds an existing producer by document', async () => {
      producers.checkDuplicate.mockResolvedValue({
        duplicate: true,
        existing: {
          id: 'producer-existing',
          producerNumber: 'PRM-1',
          legalName: 'Juan Pérez',
          lifecycleStatus: 'active',
        },
      });

      const producerResolver = new ProducerResolver(producers as never);
      const registry = new EntityResolverRegistry([producerResolver]);
      const entityResolution = new EntityResolutionService(registry);

      const resolution = await entityResolution.resolve({
        entityType: 'Producer',
        organizationId: 'org-1',
        processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
        payload: { documentNumber: '123456' },
      });

      expect(resolution.resolved).toBe(true);
      expect(resolution.entityId).toBe('producer-existing');

      const decision = await submissionFlow.decide(buildProcessable());
      expect(decision?.action).toBe(FLOW_ACTIONS.CREATE_ENTITY);
    });

    it('entity resolution with no match routes to CREATE_ENTITY for legacy forms', async () => {
      producers.checkDuplicate.mockResolvedValue({ duplicate: false, existing: null });
      producers.findAll.mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      });

      const decision = await submissionFlow.decide(buildProcessable());

      expect(decision?.action).toBe(FLOW_ACTIONS.CREATE_ENTITY);
      expect(decision?.processor).toBe('producer');
    });
  });

  describe('capture sync entrypoint', () => {
    it('delegates submissions to FormSubmissionsService.syncBatch', async () => {
      const submissions = {
        syncBatch: jest.fn().mockResolvedValue({
          results: [{ externalId: 'ext-1', status: 'created', submissionId: 'sub-1' }],
        }),
      };
      const sync = new CaptureSyncService(submissions as never);

      const response = await sync.sync('org-1', 'user-1', {
        submissions: [
          {
            formId: 'form-1',
            data: { legalName: 'Test' },
            externalId: 'ext-1',
          },
        ],
        files: [{ filename: 'photo.jpg' }],
      });

      expect(submissions.syncBatch).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        expect.objectContaining({
          submissions: [
            expect.objectContaining({ formId: 'form-1', externalId: 'ext-1' }),
          ],
        }),
        undefined,
      );
      expect(response.results).toHaveLength(1);
      expect(response.filesReceived).toBe(1);
    });
  });

  describe('timeline visibility', () => {
    it('maps capture analytics events to timeline items', async () => {
      const events = {
        getByAggregate: jest.fn().mockResolvedValue([
          {
            id: 'evt-analytics-1',
            eventType: 'CaptureAnalyticsEvent',
            occurredAt: new Date('2026-03-01T14:00:00.000Z'),
            payload: {
              eventType: CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED,
              entityType: 'Producer',
              entityId: 'producer-1',
              processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
            },
          },
        ]),
      };

      const provider = new AnalyticsProvider(events as never);
      const items = await provider.fetch({
        organizationId: 'org-1',
        entityType: 'Producer',
        entityId: 'producer-1',
        aggregateType: 'Producer',
      });

      expect(items).toHaveLength(1);
      expect(items[0].eventType).toBe('PRODUCER_CREATED');
      expect(items[0].title).toBe('Productor registrado');
    });
  });
});
