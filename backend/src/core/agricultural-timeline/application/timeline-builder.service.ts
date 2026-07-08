import { Inject, Injectable, Optional } from '@nestjs/common';
import type { TimelineProvider } from '../interfaces/timeline-provider.interface';
import { TIMELINE_PROVIDERS } from '../interfaces/timeline-provider.interface';
import type {
  TimelineFilter,
  TimelineGroup,
  TimelineItem,
  TimelineQueryContext,
  TimelineResponse,
} from '../domain/timeline-event';
import { TimelineQueryService } from './timeline-query.service';

@Injectable()
export class TimelineBuilderService {
  constructor(
    @Optional() @Inject(TIMELINE_PROVIDERS) private readonly providers: TimelineProvider[] = [],
    private readonly queryService: TimelineQueryService,
  ) {}

  async build(
    context: TimelineQueryContext,
    filter: TimelineFilter = {},
  ): Promise<TimelineResponse> {
    const batches = await Promise.all(
      this.providers.map((provider) => provider.fetch(context)),
    );

    const merged = this.deduplicateItems(batches.flat());
    const sorted = merged.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const filtered = this.queryService.applyFilter(sorted, filter);

    return {
      years: this.groupByYear(filtered),
      items: filtered,
      totalItems: filtered.length,
    };
  }

  deduplicateItems(items: TimelineItem[]): TimelineItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  groupByYear(items: TimelineItem[]): TimelineGroup[] {
    const groups = new Map<number, TimelineItem[]>();

    for (const item of items) {
      const year = new Date(item.date).getFullYear();
      const bucket = groups.get(year) ?? [];
      bucket.push(item);
      groups.set(year, bucket);
    }

    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, yearItems]) => ({ year, items: yearItems }));
  }
}
