import { Injectable } from '@nestjs/common';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import type { TimelineProvider } from '../interfaces/timeline-provider.interface';
import {
  TIMELINE_EVENT_TYPES,
  TIMELINE_SOURCES,
  type TimelineItem,
  type TimelineQueryContext,
} from '../domain/timeline-event';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

@Injectable()
export class SubmissionProvider implements TimelineProvider {
  readonly key = 'submissions';

  constructor(private readonly submissions: FormSubmissionsService) {}

  async fetch(context: TimelineQueryContext): Promise<TimelineItem[]> {
    const all = await this.submissions.findAll(context.organizationId);
    const recordId = context.entityId;

    return all
      .filter((submission) => this.matchesEntity(submission, recordId))
      .map((submission) => this.toTimelineItem(submission, context));
  }

  private matchesEntity(
    submission: {
      data?: unknown;
      context?: unknown;
    },
    recordId: string,
  ): boolean {
    const data = asRecord(submission.data);
    const ctx = asRecord(submission.context);
    return (
      data.producerId === recordId ||
      data.producer_id === recordId ||
      data.farmId === recordId ||
      data.farm_id === recordId ||
      data.lotId === recordId ||
      data.lot_id === recordId ||
      ctx.entityId === recordId ||
      ctx.contextId === recordId
    );
  }

  private toTimelineItem(
    submission: {
      id: string;
      formId: string;
      status?: string;
      createdAt: Date;
      form?: { formKey?: string; name?: string };
    },
    context: TimelineQueryContext,
  ): TimelineItem {
    const status = (submission.status ?? 'submitted').toLowerCase();
    const approved = status.includes('approved') || status.includes('validated');

    return {
      id: `forms:submission:${submission.id}`,
      date: submission.createdAt.toISOString(),
      title: submission.form?.name ?? submission.form?.formKey ?? 'Formulario enviado',
      description: submission.status ?? null,
      entityId: context.entityId,
      entityType: context.entityType,
      organizationId: context.organizationId,
      eventType: approved
        ? TIMELINE_EVENT_TYPES.FORM_APPROVED
        : TIMELINE_EVENT_TYPES.FORM_SUBMITTED,
      source: TIMELINE_SOURCES.FORMS,
      importance: approved ? 'high' : 'normal',
      icon: 'form',
      metadata: {
        submissionId: submission.id,
        formId: submission.formId,
        formKey: submission.form?.formKey,
        status: submission.status,
      },
    };
  }
}
