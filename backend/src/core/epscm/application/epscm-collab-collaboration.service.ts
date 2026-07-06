import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmCollabTaskStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabCollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmCollabIntegrationService,
    private readonly core: CoreEngineService,
  ) {}

  listThreads(organizationId: string) {
    return this.prisma.epscmCollabThread.findMany({
      where: { organizationId },
      include: { messages: { take: 5, orderBy: { sentAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createThread(organizationId: string, userId: string, subject: string, refType?: string, refKey?: string) {
    const seq = await this.prisma.epscmCollabThread.count({ where: { organizationId } });
    return this.prisma.epscmCollabThread.create({
      data: {
        organizationId,
        threadKey: generateEpscmCollabKey('THR', seq + 1),
        subject,
        refType,
        refKey,
        createdBy: userId,
      },
    });
  }

  async postMessage(organizationId: string, userId: string, threadKey: string, body: string) {
    const seq = await this.prisma.epscmCollabMessage.count({ where: { organizationId } });
    const message = await this.prisma.epscmCollabMessage.create({
      data: {
        organizationId,
        messageKey: generateEpscmCollabKey('MSG', seq + 1),
        threadKey,
        body,
        senderId: userId,
      },
    });
    await this.audit.log(organizationId, 'EpscmCollabMessage', message.messageKey, 'collab_comment_posted', userId);
    return message;
  }

  listComments(organizationId: string, refType: string, refKey: string) {
    return this.prisma.epscmCollabComment.findMany({
      where: { organizationId, refType, refKey },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(organizationId: string, userId: string, refType: string, refKey: string, body: string) {
    const seq = await this.prisma.epscmCollabComment.count({ where: { organizationId } });
    const comment = await this.prisma.epscmCollabComment.create({
      data: {
        organizationId,
        commentKey: generateEpscmCollabKey('CMT', seq + 1),
        refType,
        refKey,
        body,
        authorId: userId,
      },
    });
    await this.audit.log(organizationId, 'EpscmCollabComment', comment.commentKey, 'collab_comment_posted', userId);
    return comment;
  }

  listTasks(organizationId: string, status?: EpscmCollabTaskStatus) {
    return this.prisma.epscmCollabTask.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(
    organizationId: string,
    userId: string,
    input: { title: string; refType?: string; refKey?: string; assigneeId?: string; dueAt?: Date },
  ) {
    const seq = await this.prisma.epscmCollabTask.count({ where: { organizationId } });
    const task = await this.prisma.epscmCollabTask.create({
      data: {
        organizationId,
        taskKey: generateEpscmCollabKey('TSK', seq + 1),
        title: input.title,
        refType: input.refType,
        refKey: input.refKey,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt,
      },
    });
    await this.core.emitUserAction(organizationId, 'EpscmCollabTask', task.taskKey, EVENT_TYPES.WORKFLOW_STARTED, {
      module: 'epscm_collab',
    });
    return task;
  }

  async completeTask(organizationId: string, userId: string, taskKey: string) {
    const task = await this.prisma.epscmCollabTask.findFirst({ where: { organizationId, taskKey } });
    if (!task) throw new NotFoundException('Task not found');
    const updated = await this.prisma.epscmCollabTask.update({
      where: { id: task.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await this.integration.onTaskCompleted(organizationId, taskKey);
    await this.audit.log(organizationId, 'EpscmCollabTask', taskKey, 'collab_task_completed', userId);
    return updated;
  }

  async trackEvent(organizationId: string, userId: string, refType: string, refKey: string, eventType: string, description?: string) {
    const seq = await this.prisma.epscmCollabTrackingEvent.count({ where: { organizationId } });
    return this.prisma.epscmCollabTrackingEvent.create({
      data: {
        organizationId,
        eventKey: generateEpscmCollabKey('TRK', seq + 1),
        refType,
        refKey,
        eventType,
        description,
        recordedBy: userId,
      },
    });
  }

  trackingHistory(organizationId: string, refType: string, refKey: string) {
    return this.prisma.epscmCollabTrackingEvent.findMany({
      where: { organizationId, refType, refKey },
      orderBy: { recordedAt: 'asc' },
    });
  }

  center(organizationId: string) {
    return Promise.all([
      this.listThreads(organizationId),
      this.listTasks(organizationId, 'open'),
      this.listTasks(organizationId, 'in_progress'),
    ]).then(([threads, openTasks, inProgressTasks]) => ({ threads, openTasks, inProgressTasks }));
  }
}
