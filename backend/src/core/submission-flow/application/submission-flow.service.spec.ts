import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { SubmissionFlowService } from './submission-flow.service';
import { SubmissionContextBuilder } from './submission-context.builder';
import { SubmissionDecisionService } from './submission-decision.service';
import { EntityResolutionService } from '@/core/entity-resolution/application/entity-resolution.service';
import { FLOW_ACTIONS } from '../domain/flow-context';
import type { ProcessableSubmission } from '@/core/capture-processing/domain/types/processable-submission';
import { unresolvedResult } from '@/core/entity-resolution/domain/entity-resolution.types';

describe('SubmissionFlowService', () => {
  let service: SubmissionFlowService;
  const entityResolution = {
    resolve: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    entityResolution.resolve.mockResolvedValue(unresolvedResult('Producer'));
    service = new SubmissionFlowService(
      new SubmissionContextBuilder(entityResolution as unknown as EntityResolutionService),
      new SubmissionDecisionService(),
    );
  });

  function buildInput(metadata: Record<string, unknown>): ProcessableSubmission {
    return {
      organizationId: 'org-1',
      userId: 'user-1',
      form: {
        id: 'form-1',
        formKey: 'farm_registration',
        version: 1,
        metadata,
      },
      submission: {
        id: 'sub-1',
        organizationId: 'org-1',
        formId: 'form-1',
        formVersion: 1,
        resourceId: 'res-1',
        data: { farmName: 'Finca Norte' },
        gpsLocation: null,
        gpsTrack: null,
        deviceInfo: null,
        context: {},
        status: 'submitted',
        syncStatus: 'pending',
        externalId: null,
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
        externalId: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      draft: false,
    };
  }

  it('decides CREATE_ENTITY for FARM_CREATE legacy form', async () => {
    const decision = await service.decide(
      buildInput({ processingType: CAPTURE_PROCESSING_TYPES.FARM_CREATE }),
    );
    expect(decision?.action).toBe(FLOW_ACTIONS.CREATE_ENTITY);
    expect(decision?.processor).toBe('farm');
  });
});
