import { Test, TestingModule } from '@nestjs/testing';
import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { AnalyticsEventService } from '@/core/capture-analytics/application/analytics-event.service';
import { SubmissionProcessorService } from '../application/submission-processor.service';
import {
  CAPTURE_SUBMISSION_PROCESSORS,
  type SubmissionProcessor,
} from '../domain/processors/submission-processor.interface';
import type { ProcessableSubmission } from '../domain/types/processable-submission';

function buildSubmission(
  overrides: Partial<ProcessableSubmission> & {
    metadata?: Record<string, unknown>;
  } = {},
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
      data: { legalName: 'Test Producer', documentNumber: '123' },
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

  return { ...base, ...overrides, form: { ...base.form, ...(overrides.form ?? {}) } };
}

describe('SubmissionProcessorService', () => {
  let service: SubmissionProcessorService;
  let producerProcessor: jest.Mocked<SubmissionProcessor>;
  let core: { emitUserAction: jest.Mock };
  let analyticsEvents: { emitFromProcessing: jest.Mock };

  beforeEach(async () => {
    producerProcessor = {
      key: 'producer',
      canProcess: jest.fn().mockReturnValue(true),
      process: jest.fn().mockResolvedValue({
        processorKey: 'producer',
        processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
        entityType: 'Producer',
        entityId: 'producer-1',
      }),
    };

    core = { emitUserAction: jest.fn().mockResolvedValue({}) };
    analyticsEvents = {
      emitFromProcessing: jest.fn().mockResolvedValue({
        eventType: 'PRODUCER_CREATED',
        entityId: 'producer-1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionProcessorService,
        {
          provide: CAPTURE_SUBMISSION_PROCESSORS,
          useValue: [producerProcessor],
        },
        { provide: CoreEngineService, useValue: core },
        { provide: AnalyticsEventService, useValue: analyticsEvents },
      ],
    }).compile();

    service = module.get(SubmissionProcessorService);
  });

  it('skips draft submissions', async () => {
    const result = await service.processSubmission(
      buildSubmission({ draft: true }),
    );

    expect(result.processed).toBe(false);
    expect(result.skippedReason).toBe('draft');
    expect(producerProcessor.process).not.toHaveBeenCalled();
  });

  it('skips when form has no processingType metadata', async () => {
    const result = await service.processSubmission(
      buildSubmission({ metadata: {} }),
    );

    expect(result.processed).toBe(false);
    expect(result.skippedReason).toBe('no_processing_type');
    expect(producerProcessor.process).not.toHaveBeenCalled();
  });

  it('routes to matching processor and emits action', async () => {
    const input = buildSubmission();
    const result = await service.processSubmission(input);

    expect(producerProcessor.canProcess).toHaveBeenCalledWith(input);
    expect(producerProcessor.process).toHaveBeenCalledWith(input);
    expect(result.processed).toBe(true);
    expect(result.processorKey).toBe('producer');
    expect(result.entityId).toBe('producer-1');
    expect(core.emitUserAction).toHaveBeenCalledWith(
      'org-1',
      'Producer',
      'producer-1',
      'CaptureSubmissionProcessed',
      expect.objectContaining({
        submissionId: 'sub-1',
        processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      }),
      expect.any(Object),
    );
    expect(analyticsEvents.emitFromProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        entityId: 'producer-1',
        processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      }),
      undefined,
    );
  });

  it('does not throw when processor fails (caller handles)', async () => {
    producerProcessor.process.mockRejectedValue(new Error('ERP down'));

    await expect(service.processSubmission(buildSubmission())).rejects.toThrow('ERP down');
  });
});

describe('resolveProcessingType routing', () => {
  it('identifies processor by metadata.processingType not formKey', async () => {
    const farmProcessor: jest.Mocked<SubmissionProcessor> = {
      key: 'farm',
      canProcess: jest.fn().mockReturnValue(false),
      process: jest.fn(),
    };
    const producer: jest.Mocked<SubmissionProcessor> = {
      key: 'producer',
      canProcess: jest.fn().mockImplementation((s) =>
        (s.form.metadata as { processingType?: string })?.processingType ===
        CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      ),
      process: jest.fn().mockResolvedValue({
        processorKey: 'producer',
        processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
        entityType: 'Producer',
        entityId: 'p-1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionProcessorService,
        {
          provide: CAPTURE_SUBMISSION_PROCESSORS,
          useValue: [farmProcessor, producer],
        },
        { provide: CoreEngineService, useValue: { emitUserAction: jest.fn() } },
        {
          provide: AnalyticsEventService,
          useValue: { emitFromProcessing: jest.fn() },
        },
      ],
    }).compile();

    const svc = module.get(SubmissionProcessorService);
    await svc.processSubmission(
      buildSubmission({
        form: {
          id: 'f',
          formKey: 'totally_unrelated_key',
          version: 1,
          metadata: { processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE },
        },
      }),
    );

    expect(producer.process).toHaveBeenCalled();
    expect(farmProcessor.process).not.toHaveBeenCalled();
  });
});
