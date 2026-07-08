import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { FLOW_ACTIONS } from '../domain/flow-context';
import type { FlowContext } from '../domain/flow-context';
import { SubmissionDecisionService } from './submission-decision.service';

describe('SubmissionDecisionService', () => {
  let service: SubmissionDecisionService;

  beforeEach(() => {
    service = new SubmissionDecisionService();
  });

  function baseContext(
    overrides: Partial<FlowContext> = {},
  ): FlowContext {
    return {
      submission: { id: 'sub-1', data: {}, context: {} },
      form: { id: 'form-1', formKey: 'test', version: 1, metadata: {} },
      processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      organizationId: 'org-1',
      currentUser: { id: 'user-1' },
      existingEntities: [],
      ...overrides,
    };
  }

  it('returns SKIP when processingType is missing', () => {
    const decision = service.decide(baseContext({ processingType: null }));
    expect(decision?.action).toBe(FLOW_ACTIONS.SKIP);
  });

  it('returns CREATE_ENTITY for legacy PRODUCER_CREATE without existing entity', () => {
    const decision = service.decide(baseContext());
    expect(decision?.action).toBe(FLOW_ACTIONS.CREATE_ENTITY);
    expect(decision?.processor).toBe('producer');
  });

  it('returns APPEND_CHILD for PRODUCTION_CREATE', () => {
    const decision = service.decide(
      baseContext({ processingType: CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE }),
    );
    expect(decision?.action).toBe(FLOW_ACTIONS.APPEND_CHILD);
    expect(decision?.processor).toBe('production');
  });

  it('returns REGISTER_EVENT when flow intent is register_event', () => {
    const decision = service.decide(
      baseContext({
        processingType: 'VISIT_EVENT',
        form: {
          id: 'form-1',
          formKey: 'visit',
          version: 1,
          metadata: { flowIntent: 'REGISTER_EVENT' },
        },
      }),
    );
    expect(decision?.action).toBe(FLOW_ACTIONS.REGISTER_EVENT);
  });

  it('returns UPDATE_ENTITY for non-legacy forms with existing entity', () => {
    const decision = service.decide(
      baseContext({
        processingType: 'PRODUCER_UPDATE',
        entityMapping: { targetEntity: 'Producer', mappings: [] },
        existingEntities: [{ entityType: 'Producer', id: 'p-1', source: 'producerId' }],
      }),
    );
    expect(decision?.action).toBe(FLOW_ACTIONS.UPDATE_ENTITY);
    expect(decision?.targetId).toBe('p-1');
  });
});
