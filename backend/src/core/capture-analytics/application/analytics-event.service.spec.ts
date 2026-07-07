import { Test, TestingModule } from '@nestjs/testing';
import {
  CAPTURE_ANALYTICS_EVENT_TYPES,
  CAPTURE_PROCESSING_TYPES,
  EVENT_TYPES,
} from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { AnalyticsEventService } from '../application/analytics-event.service';
import { CaptureAnalyticsEventPublisher } from '../infrastructure/capture-analytics-event.publisher';

describe('AnalyticsEventService', () => {
  let service: AnalyticsEventService;
  let core: { emitCaptureAnalyticsEvent: jest.Mock };

  beforeEach(async () => {
    core = { emitCaptureAnalyticsEvent: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsEventService,
        CaptureAnalyticsEventPublisher,
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(AnalyticsEventService);
  });

  it('maps producer processing to PRODUCER_CREATED analytics event', async () => {
    const event = await service.emitFromProcessing({
      organizationId: 'org-1',
      userId: 'user-1',
      form: { id: 'form-1', formKey: 'producer_registration', version: 1 },
      submission: {
        id: 'sub-1',
        externalId: 'ext-1',
        gpsLocation: { lat: 4.6, lng: -74.1, accuracy: 10 },
      },
      processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      processorKey: 'producer',
      entityType: 'Producer',
      entityId: 'producer-1',
    });

    expect(event.eventType).toBe(CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED);
    expect(event.sourceForm.formKey).toBe('producer_registration');
    expect(event.entityId).toBe('producer-1');
    expect(event.location).toEqual({ lat: 4.6, lng: -74.1, accuracy: 10 });
    expect(core.emitCaptureAnalyticsEvent).toHaveBeenCalledWith(
      'org-1',
      'producer-1',
      expect.objectContaining({
        eventType: CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED,
        organizationId: 'org-1',
      }),
      expect.any(Object),
    );
  });

  it('maps farm processing to FARM_CREATED', () => {
    const event = service.buildFromProcessing({
      organizationId: 'org-1',
      userId: 'user-1',
      form: { id: 'f1', formKey: 'farm_reg', version: 2 },
      submission: { id: 'sub-2' },
      processingType: CAPTURE_PROCESSING_TYPES.FARM_CREATE,
      processorKey: 'farm',
      entityType: 'FarmUnit',
      entityId: 'farm-1',
    });

    expect(event.eventType).toBe(CAPTURE_ANALYTICS_EVENT_TYPES.FARM_CREATED);
  });

  it('maps production processing to PRODUCTION_REGISTERED', () => {
    const event = service.buildFromProcessing({
      organizationId: 'org-1',
      userId: 'user-1',
      form: { id: 'f1', formKey: 'lot_reg', version: 1 },
      submission: { id: 'sub-3' },
      processingType: CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE,
      processorKey: 'production',
      entityType: 'FieldLotProfile',
      entityId: 'lot-1',
    });

    expect(event.eventType).toBe(CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCTION_REGISTERED);
  });
});

describe('CaptureAnalyticsEventPublisher', () => {
  it('persists via CoreEngine with CaptureAnalyticsEvent type', async () => {
    const core = { emitCaptureAnalyticsEvent: jest.fn().mockResolvedValue({}) };
    const module = await Test.createTestingModule({
      providers: [
        CaptureAnalyticsEventPublisher,
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    const publisher = module.get(CaptureAnalyticsEventPublisher);
    await publisher.publish(
      {
        eventType: CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED,
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        sourceForm: { formId: 'f', formKey: 'k', formVersion: 1 },
        entityId: 'p-1',
        entityType: 'Producer',
        submissionId: 'sub-1',
      },
      undefined,
      'user-1',
    );

    expect(core.emitCaptureAnalyticsEvent).toHaveBeenCalled();
    expect(EVENT_TYPES.CAPTURE_ANALYTICS_EVENT).toBe('CaptureAnalyticsEvent');
  });
});
