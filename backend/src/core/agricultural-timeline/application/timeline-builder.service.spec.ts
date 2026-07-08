import { TimelineBuilderService } from './timeline-builder.service';
import { TimelineQueryService } from './timeline-query.service';
import type { TimelineProvider } from '../interfaces/timeline-provider.interface';
import { TIMELINE_EVENT_TYPES, TIMELINE_SOURCES } from '../domain/timeline-event';

describe('TimelineBuilderService', () => {
  const queryService = new TimelineQueryService();

  it('merges providers, deduplicates and groups by year', async () => {
    const providers: TimelineProvider[] = [
      {
        key: 'a',
        fetch: async () => [
          {
            id: 'dup',
            date: '2026-03-01T10:00:00.000Z',
            title: 'A',
            description: null,
            entityId: 'p1',
            entityType: 'Producer',
            organizationId: 'org-1',
            eventType: TIMELINE_EVENT_TYPES.FORM_SUBMITTED,
            source: TIMELINE_SOURCES.FORMS,
            importance: 'normal',
            icon: 'form',
            metadata: {},
          },
        ],
      },
      {
        key: 'b',
        fetch: async () => [
          {
            id: 'dup',
            date: '2026-03-01T10:00:00.000Z',
            title: 'Duplicate',
            description: null,
            entityId: 'p1',
            entityType: 'Producer',
            organizationId: 'org-1',
            eventType: TIMELINE_EVENT_TYPES.ANALYTICS,
            source: TIMELINE_SOURCES.ANALYTICS,
            importance: 'high',
            icon: 'analytics',
            metadata: {},
          },
          {
            id: 'older',
            date: '2025-01-01T10:00:00.000Z',
            title: 'Older',
            description: null,
            entityId: 'p1',
            entityType: 'Producer',
            organizationId: 'org-1',
            eventType: TIMELINE_EVENT_TYPES.CUSTOM,
            source: TIMELINE_SOURCES.EVENTS,
            importance: 'normal',
            icon: 'event',
            metadata: {},
          },
        ],
      },
    ];

    const builder = new TimelineBuilderService(providers, queryService);
    const response = await builder.build({
      organizationId: 'org-1',
      entityType: 'Producer',
      entityId: 'p1',
      aggregateType: 'Producer',
    });

    expect(response.totalItems).toBe(2);
    expect(response.items[0].id).toBe('dup');
    expect(response.years.map((group) => group.year)).toEqual([2026, 2025]);
  });

  it('applies limit filter', async () => {
    const providers: TimelineProvider[] = [
      {
        key: 'only',
        fetch: async () =>
          [1, 2, 3].map((n) => ({
            id: `item-${n}`,
            date: `2026-03-0${n}T10:00:00.000Z`,
            title: `Item ${n}`,
            description: null,
            entityId: 'p1',
            entityType: 'Producer',
            organizationId: 'org-1',
            eventType: TIMELINE_EVENT_TYPES.CUSTOM,
            source: TIMELINE_SOURCES.EVENTS,
            importance: 'normal',
            icon: null,
            metadata: {},
          })),
      },
    ];

    const builder = new TimelineBuilderService(providers, queryService);
    const response = await builder.build(
      {
        organizationId: 'org-1',
        entityType: 'Producer',
        entityId: 'p1',
        aggregateType: 'Producer',
      },
      { limit: 2 },
    );

    expect(response.totalItems).toBe(2);
  });
});
