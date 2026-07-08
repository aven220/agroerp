import { Injectable } from '@nestjs/common';
import type { TimelineFilter } from '../domain/timeline-event';

export interface TimelineQueryParams {
  from?: string;
  to?: string;
  types?: string;
  limit?: string;
}

@Injectable()
export class TimelineQueryService {
  parseFilter(params: TimelineQueryParams): TimelineFilter {
    const filter: TimelineFilter = {};

    if (params.from) {
      const from = new Date(params.from);
      if (!Number.isNaN(from.getTime())) filter.from = from;
    }

    if (params.to) {
      const to = new Date(params.to);
      if (!Number.isNaN(to.getTime())) filter.to = to;
    }

    if (params.types?.trim()) {
      filter.types = params.types
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean) as TimelineFilter['types'];
    }

    if (params.limit) {
      const limit = Number.parseInt(params.limit, 10);
      if (!Number.isNaN(limit) && limit > 0) {
        filter.limit = Math.min(limit, 500);
      }
    }

    return filter;
  }

  applyFilter<T extends { date: string; eventType: string }>(
    items: T[],
    filter: TimelineFilter,
  ): T[] {
    let result = items;

    if (filter.from) {
      const fromMs = filter.from.getTime();
      result = result.filter((item) => new Date(item.date).getTime() >= fromMs);
    }

    if (filter.to) {
      const toMs = filter.to.getTime();
      result = result.filter((item) => new Date(item.date).getTime() <= toMs);
    }

    if (filter.types?.length) {
      const allowed = new Set(filter.types);
      result = result.filter((item) => allowed.has(item.eventType as never));
    }

    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }
}
