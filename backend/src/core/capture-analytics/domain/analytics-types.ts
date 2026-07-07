import {
  CAPTURE_ANALYTICS_EVENT_TYPES,
  CAPTURE_PROCESSING_TYPES,
  type CaptureAnalyticsEventType,
} from '@agroerp/shared';

export { CAPTURE_ANALYTICS_EVENT_TYPES, type CaptureAnalyticsEventType };

export function mapProcessingToAnalyticsEventType(
  processingType: string,
): CaptureAnalyticsEventType {
  switch (processingType) {
    case CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE:
      return CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED;
    case CAPTURE_PROCESSING_TYPES.FARM_CREATE:
      return CAPTURE_ANALYTICS_EVENT_TYPES.FARM_CREATED;
    case CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE:
      return CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCTION_REGISTERED;
    default:
      return CAPTURE_ANALYTICS_EVENT_TYPES.FORM_COMPLETED;
  }
}
