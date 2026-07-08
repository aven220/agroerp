import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowTransitionService } from './workflow-transition.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { FORM_WORKFLOW_EVENT_TYPES } from '../events/workflow-transition.event';

describe('WorkflowEngineService', () => {
  const definitions = new WorkflowDefinitionService();
  const transitions = new WorkflowTransitionService(definitions);
  const events = {
    emit: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    getByAggregate: jest.fn().mockResolvedValue([]),
  };

  let engine: WorkflowEngineService;

  const validDefinition = {
    enabled: true,
    states: [
      { id: 'sent', name: 'Enviado' },
      { id: 'review', name: 'Revisión' },
      { id: 'approved', name: 'Aprobado' },
    ],
    transitions: [{ from: 'sent', to: 'review', action: 'SUBMIT' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new WorkflowEngineService(definitions, transitions, events as never);
  });

  it('skips when workflow is not configured', async () => {
    await engine.onSubmissionSaved({
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: 'form-1',
      formMetadata: {},
    });

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('starts workflow and executes SUBMIT transition for valid workflow', async () => {
    events.getByAggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
          occurredAt: new Date('2026-03-01T10:00:00.000Z'),
          payload: {
            stateId: 'sent',
            stateName: 'Enviado',
          },
        },
      ]);

    await engine.onSubmissionSaved({
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: 'form-1',
      formKey: 'producer-form',
      userId: 'user-1',
      formMetadata: { workflow: validDefinition },
    });

    expect(events.emit).toHaveBeenCalledTimes(2);
    expect(events.emit.mock.calls[0][0].eventType).toBe(FORM_WORKFLOW_EVENT_TYPES.STARTED);
    expect(events.emit.mock.calls[1][0].eventType).toBe(FORM_WORKFLOW_EVENT_TYPES.TRANSITION);
    expect(events.emit.mock.calls[1][0].payload).toMatchObject({
      fromStateId: 'sent',
      toStateId: 'review',
      action: 'SUBMIT',
    });
  });

  it('warns and does not throw for invalid workflow', async () => {
    const warnSpy = jest.spyOn(engine['logger'], 'warn');

    await engine.onSubmissionSaved({
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: 'form-1',
      formMetadata: {
        workflow: {
          enabled: true,
          states: [],
          transitions: [],
        },
      },
    });

    expect(events.emit).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null for invalid transition without throwing', async () => {
    events.getByAggregate.mockResolvedValue([
      {
        eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
        occurredAt: new Date('2026-03-01T10:00:00.000Z'),
        payload: { stateId: 'approved', stateName: 'Aprobado' },
      },
    ]);

    const result = await engine.executeTransition({
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: 'form-1',
      definition: validDefinition,
      action: 'SUBMIT',
    });

    expect(result).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('emits transition event for valid manual transition', async () => {
    events.getByAggregate.mockResolvedValue([
      {
        eventType: FORM_WORKFLOW_EVENT_TYPES.STARTED,
        occurredAt: new Date('2026-03-01T10:00:00.000Z'),
        payload: { stateId: 'review', stateName: 'Revisión' },
      },
    ]);

    const definition = {
      ...validDefinition,
      transitions: [
        ...validDefinition.transitions,
        { from: 'review', to: 'approved', action: 'APPROVE' },
      ],
    };

    const result = await engine.executeTransition({
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: 'form-1',
      userId: 'user-1',
      definition,
      action: 'APPROVE',
    });

    expect(result).toEqual({ stateId: 'approved', stateName: 'Aprobado' });
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: FORM_WORKFLOW_EVENT_TYPES.TRANSITION,
        payload: expect.objectContaining({
          action: 'APPROVE',
          fromStateId: 'review',
          toStateId: 'approved',
        }),
      }),
    );
  });
});

describe('WorkflowTransitionService', () => {
  const definitions = new WorkflowDefinitionService();
  const service = new WorkflowTransitionService(definitions);

  const definition = {
    enabled: true,
    states: [
      { id: 'sent', name: 'Enviado' },
      { id: 'review', name: 'Revisión' },
    ],
    transitions: [{ from: 'sent', to: 'review', action: 'SUBMIT' }],
  };

  it('validates a valid transition', () => {
    const result = service.validate(definition, 'sent', 'SUBMIT');
    expect(result.valid).toBe(true);
    expect(result.transition?.to).toBe('review');
  });

  it('rejects invalid transition', () => {
    const result = service.validate(definition, 'review', 'SUBMIT');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No transition');
  });
});

describe('WorkflowDefinitionService', () => {
  const service = new WorkflowDefinitionService();

  it('parses metadata.workflow when enabled', () => {
    const definition = service.resolveFromFormMetadata({
      workflow: {
        enabled: true,
        states: [{ id: 'sent', name: 'Enviado' }],
        transitions: [],
      },
    });

    expect(definition?.states).toHaveLength(1);
    expect(definition?.enabled).toBe(true);
  });

  it('returns null when workflow disabled', () => {
    expect(
      service.resolveFromFormMetadata({
        workflow: { enabled: false, states: [], transitions: [] },
      }),
    ).toBeNull();
  });
});
