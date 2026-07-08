import { WorkflowActionExecutorService } from './workflow-action-executor.service';
import {
  WORKFLOW_ACTION_AGGREGATE_TYPE,
  WORKFLOW_BUSINESS_EVENT_TYPES,
} from '../domain/workflow-action';

describe('WorkflowActionExecutorService', () => {
  const events = {
    emit: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  };
  const submissionFlow = {
    decide: jest.fn().mockResolvedValue({ action: 'CREATE_ENTITY', processor: 'farm' }),
  };
  const submissionProcessor = {
    processSubmission: jest.fn().mockResolvedValue(undefined),
  };
  const submissionRepository = {
    findFirstByOrgAndId: jest.fn(),
    findResourceById: jest.fn(),
  };
  const forms = {
    findOne: jest.fn(),
  };

  let executor: WorkflowActionExecutorService;

  const baseContext = {
    organizationId: 'org-1',
    submissionId: 'sub-1',
    formId: 'form-1',
    formKey: 'producer-form',
    userId: 'user-1',
    fromStateId: 'review',
    fromStateName: 'Revisión',
    toStateId: 'approved',
    toStateName: 'Aprobado',
  };

  const submission = {
    id: 'sub-1',
    organizationId: 'org-1',
    formId: 'form-1',
    formVersion: 1,
    resourceId: 'res-1',
    data: { name: 'Test' },
    createdBy: 'user-1',
  };

  const resource = {
    id: 'res-1',
    organizationId: 'org-1',
    resourceType: 'form_submission',
    schemaVersion: 1,
    data: {},
    attributes: {},
    metadata: {},
    status: 'submitted',
    syncStatus: 'pending',
    externalId: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const form = {
    id: 'form-1',
    formKey: 'producer-form',
    version: 1,
    metadata: { processingType: 'FARM_CREATE' },
    schema: { fields: [] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    submissionRepository.findFirstByOrgAndId.mockResolvedValue(submission);
    submissionRepository.findResourceById.mockResolvedValue(resource);
    forms.findOne.mockResolvedValue(form);

    executor = new WorkflowActionExecutorService(
      events as never,
      submissionFlow as never,
      submissionProcessor as never,
      submissionRepository as never,
      forms as never,
    );
  });

  it('does nothing for action without mapping', async () => {
    await executor.executeAfterTransition({
      ...baseContext,
      action: 'UNKNOWN_ACTION',
    });

    expect(events.emit).not.toHaveBeenCalled();
    expect(submissionFlow.decide).not.toHaveBeenCalled();
    expect(submissionProcessor.processSubmission).not.toHaveBeenCalled();
  });

  it('APPROVE executes submission flow', async () => {
    await executor.executeAfterTransition({
      ...baseContext,
      action: 'APPROVE',
    });

    expect(submissionFlow.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        userId: 'user-1',
        draft: false,
        submission: expect.objectContaining({ id: 'sub-1' }),
      }),
    );
    expect(submissionProcessor.processSubmission).toHaveBeenCalled();
  });

  it('REJECT generates rejection event', async () => {
    await executor.executeAfterTransition({
      ...baseContext,
      action: 'REJECT',
      toStateId: 'rejected',
      toStateName: 'Rechazado',
    });

    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: WORKFLOW_ACTION_AGGREGATE_TYPE,
        aggregateId: 'sub-1',
        eventType: WORKFLOW_BUSINESS_EVENT_TYPES.REJECTION,
        payload: expect.objectContaining({
          action: 'REJECT',
          fromStateId: 'review',
          toStateId: 'rejected',
        }),
      }),
    );
    expect(submissionFlow.decide).not.toHaveBeenCalled();
  });

  it('logs warning and does not throw when submission flow fails', async () => {
    const warnSpy = jest.spyOn(executor['logger'], 'warn');
    submissionFlow.decide.mockRejectedValue(new Error('flow failed'));

    await expect(
      executor.executeAfterTransition({
        ...baseContext,
        action: 'APPROVE',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Workflow action APPROVE failed for submission sub-1'),
    );
  });
});
