import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { BpmsTaskPriority, BpmsTaskStatus } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { autoAssignTask, computeDueDate, evaluateSlaStatus, generateBpmsKey } from '../domain/bpms.engine';
import { BpmsAuditService } from './bpms-audit.service';
import { BpmsIntegrationService } from './bpms-integration.service';
import { BpmsRuntimeService } from './bpms-runtime.service';

@Injectable()
export class BpmsTaskService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly audit: BpmsAuditService,
    private readonly integration: BpmsIntegrationService,
    @Inject(forwardRef(() => BpmsRuntimeService)) private readonly runtime: BpmsRuntimeService,
  ) {}

  inbox(organizationId: string, userId: string) {
    return this.prisma.bpmsTask.findMany({
      where: { organizationId, assigneeId: userId, status: { in: ['pending', 'claimed'] } },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
    });
  }

  teamInbox(organizationId: string, teamKey: string) {
    return this.prisma.bpmsTask.findMany({
      where: { organizationId, teamKey, status: { in: ['pending', 'claimed'] } },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
    });
  }

  async createFromElement(organizationId: string, userId: string, instanceKey: string, elementKey: string, title: string, priority: BpmsTaskPriority = 'medium') {
    const seq = await this.prisma.bpmsTask.count({ where: { organizationId } });
    const assigneeId = userId;
    const task = await this.prisma.bpmsTask.create({
      data: {
        organizationId,
        taskKey: generateBpmsKey('TSK', seq + 1),
        instanceKey,
        elementKey,
        title,
        priority,
        assigneeId,
        dueAt: computeDueDate(priority),
        status: 'pending',
      },
    });
    await this.audit.log(organizationId, 'BpmsTask', task.taskKey, 'task_assigned', userId, { assigneeId });
    await this.integration.onTaskAssigned(organizationId, task.taskKey, assigneeId);
    return task;
  }

  async claim(organizationId: string, userId: string, taskKey: string) {
    return this.prisma.bpmsTask.update({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      data: { status: 'claimed', assigneeId: userId, claimedAt: new Date() },
    });
  }

  async complete(organizationId: string, userId: string, taskKey: string, approved = true, signatureUrl?: string) {
    const task = await this.prisma.bpmsTask.update({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      data: { status: 'completed', completedAt: new Date(), signatureUrl },
    });
    await this.audit.log(organizationId, 'BpmsTask', taskKey, approved ? 'task_approved' : 'task_rejected', userId, {});
    await this.integration.onTaskCompleted(organizationId, taskKey, approved);
    if (approved) await this.runtime.advance(organizationId, userId, task.instanceKey);
    return task;
  }

  async delegate(organizationId: string, userId: string, taskKey: string, toUserId: string) {
    const task = await this.prisma.bpmsTask.update({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      data: { assigneeId: toUserId, status: 'delegated' },
    });
    await this.audit.log(organizationId, 'BpmsTask', taskKey, 'task_delegated', userId, { toUserId });
    await this.integration.onTaskAssigned(organizationId, taskKey, toUserId);
    return task;
  }

  async reassign(organizationId: string, userId: string, taskKey: string, toUserId: string) {
    const task = await this.prisma.bpmsTask.update({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      data: { assigneeId: toUserId, status: 'pending' },
    });
    await this.audit.log(organizationId, 'BpmsTask', taskKey, 'task_assigned', userId, { toUserId });
    return task;
  }

  async addComment(organizationId: string, userId: string, taskKey: string, body: string) {
    const seq = await this.prisma.bpmsTaskComment.count({ where: { organizationId } });
    return this.prisma.bpmsTaskComment.create({
      data: { organizationId, commentKey: generateBpmsKey('CMT', seq + 1), taskKey, body, authorId: userId },
    });
  }

  async attach(organizationId: string, userId: string, taskKey: string, title: string, storageUrl: string) {
    const seq = await this.prisma.bpmsTaskAttachment.count({ where: { organizationId } });
    return this.prisma.bpmsTaskAttachment.create({
      data: { organizationId, attachmentKey: generateBpmsKey('ATT', seq + 1), taskKey, title, storageUrl, uploadedBy: userId },
    });
  }

  async autoAssign(organizationId: string, taskKey: string, candidates: Array<{ userId: string; workload: number }>) {
    const assigneeId = autoAssignTask(candidates);
    if (!assigneeId) return null;
    return this.prisma.bpmsTask.update({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      data: { assigneeId },
    });
  }

  slaStatus(organizationId: string, taskKey: string) {
    return this.prisma.bpmsTask.findFirst({ where: { organizationId, taskKey } }).then((t) => {
      if (!t) return null;
      return evaluateSlaStatus({ startedAt: t.claimedAt ?? new Date(), dueAt: t.dueAt, completedAt: t.completedAt });
    });
  }
}
