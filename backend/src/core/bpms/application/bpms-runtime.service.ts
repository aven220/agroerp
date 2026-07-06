import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { BpmsInstanceStatus, BpmsProcessInstance } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import {
  canTransitionInstance,
  generateBpmsKey,
  isAutomaticElement,
  isHumanTask,
  selectOutgoingFlows,
} from '../domain/bpms.engine';
import { BpmsAuditService } from './bpms-audit.service';
import { BpmsIntegrationService } from './bpms-integration.service';
import { BpmsTaskService } from './bpms-task.service';

@Injectable()
export class BpmsRuntimeService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly audit: BpmsAuditService,
    private readonly integration: BpmsIntegrationService,
    @Inject(forwardRef(() => BpmsTaskService)) private readonly tasks: BpmsTaskService,
  ) {}

  listInstances(organizationId: string, status?: BpmsInstanceStatus) {
    return this.prisma.bpmsProcessInstance.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  getInstance(organizationId: string, instanceKey: string) {
    return this.prisma.bpmsProcessInstance.findFirst({
      where: { organizationId, instanceKey },
      include: { variables: true, tasks: true, logs: { orderBy: { recordedAt: 'desc' }, take: 50 } },
    });
  }

  async start(organizationId: string, userId: string, processKey: string, initialContext: Record<string, unknown> = {}) {
    const version = await this.prisma.bpmsProcessVersion.findFirst({
      where: { organizationId, processKey, status: 'published' },
      orderBy: { versionNumber: 'desc' },
      include: { elements: true, flows: true },
    });
    if (!version) throw new Error('Proceso no publicado');
    const start = version.elements.find((e) => e.elementType === 'start');
    if (!start) throw new Error('Sin evento de inicio');
    const seq = await this.prisma.bpmsProcessInstance.count({ where: { organizationId } });
    const instanceKey = generateBpmsKey('INS', seq + 1);
    const instance = await this.prisma.bpmsProcessInstance.create({
      data: {
        organizationId,
        instanceKey,
        processKey,
        versionKey: version.versionKey,
        status: 'running',
        currentElement: start.elementKey,
        context: initialContext as object,
        startedBy: userId,
      },
    });
    await this.log(organizationId, instanceKey, start.elementKey, 'instance_started', { processKey });
    await this.audit.log(organizationId, 'BpmsProcessInstance', instanceKey, 'instance_started', userId, { processKey });
    const process = await this.prisma.bpmsProcess.findFirst({ where: { organizationId, processKey } });
    await this.integration.onInstanceStarted(organizationId, instanceKey, process?.moduleTarget ?? undefined);
    await this.advance(organizationId, userId, instanceKey);
    return this.getInstance(organizationId, instanceKey);
  }

  async advance(organizationId: string, userId: string, instanceKey: string): Promise<BpmsProcessInstance | null> {
    const instance = await this.prisma.bpmsProcessInstance.findFirst({
      where: { organizationId, instanceKey, status: 'running' },
    });
    if (!instance?.currentElement) return instance;
    const element = await this.prisma.bpmsProcessElement.findFirst({
      where: { organizationId, elementKey: instance.currentElement },
    });
    if (!element) return instance;
    if (isHumanTask(element.elementType)) {
      await this.tasks.createFromElement(organizationId, userId, instanceKey, element.elementKey, element.name);
      return instance;
    }
    if (isAutomaticElement(element.elementType)) {
      await this.log(organizationId, instanceKey, element.elementKey, 'service_executed', { type: element.elementType });
    }
    if (element.elementType === 'end') {
      return this.complete(organizationId, userId, instanceKey);
    }
    const flows = await this.prisma.bpmsProcessFlow.findMany({ where: { organizationId, versionKey: instance.versionKey } });
    const context = (instance.context as Record<string, unknown>) ?? {};
    const selected = selectOutgoingFlows(
      flows.map((f) => ({ flowKey: f.flowKey, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition ?? undefined })),
      element.elementKey,
      context,
      element.elementType,
    );
    if (selected.length === 0) return instance;
    const nextKey = selected[0].toElementKey;
    await this.prisma.bpmsProcessInstance.update({
      where: { organizationId_instanceKey: { organizationId, instanceKey } },
      data: { currentElement: nextKey },
    });
    return this.advance(organizationId, userId, instanceKey);
  }

  async complete(organizationId: string, userId: string, instanceKey: string) {
    const updated = await this.prisma.bpmsProcessInstance.update({
      where: { organizationId_instanceKey: { organizationId, instanceKey } },
      data: { status: 'completed', completedAt: new Date(), currentElement: null },
    });
    await this.audit.log(organizationId, 'BpmsProcessInstance', instanceKey, 'instance_completed', userId, {});
    await this.integration.onInstanceCompleted(organizationId, instanceKey);
    return updated;
  }

  async cancel(organizationId: string, userId: string, instanceKey: string) {
    const instance = await this.prisma.bpmsProcessInstance.findFirst({ where: { organizationId, instanceKey } });
    if (!instance || !canTransitionInstance(instance.status, 'cancelled')) throw new Error('No cancelable');
    const updated = await this.prisma.bpmsProcessInstance.update({
      where: { organizationId_instanceKey: { organizationId, instanceKey } },
      data: { status: 'cancelled', completedAt: new Date() },
    });
    await this.audit.log(organizationId, 'BpmsProcessInstance', instanceKey, 'instance_cancelled', userId, {});
    return updated;
  }

  async resume(organizationId: string, userId: string, instanceKey: string) {
    const instance = await this.prisma.bpmsProcessInstance.findFirst({ where: { organizationId, instanceKey } });
    if (!instance || !canTransitionInstance(instance.status, 'running')) throw new Error('No reanudable');
    await this.prisma.bpmsProcessInstance.update({
      where: { organizationId_instanceKey: { organizationId, instanceKey } },
      data: { status: 'running' },
    });
    await this.audit.log(organizationId, 'BpmsProcessInstance', instanceKey, 'instance_resumed', userId, {});
    return this.advance(organizationId, userId, instanceKey);
  }

  async setVariable(organizationId: string, userId: string, instanceKey: string, name: string, value: unknown) {
    const seq = await this.prisma.bpmsInstanceVariable.count({ where: { organizationId } });
    const row = await this.prisma.bpmsInstanceVariable.upsert({
      where: { organizationId_instanceKey_name: { organizationId, instanceKey, name } },
      create: { organizationId, variableKey: generateBpmsKey('VAR', seq + 1), instanceKey, name, value: value as object },
      update: { value: value as object },
    });
    const instance = await this.prisma.bpmsProcessInstance.findFirst({ where: { organizationId, instanceKey } });
    if (instance) {
      const ctx = { ...((instance.context as Record<string, unknown>) ?? {}), [name]: value };
      await this.prisma.bpmsProcessInstance.update({
        where: { organizationId_instanceKey: { organizationId, instanceKey } },
        data: { context: ctx as object },
      });
    }
    await this.audit.log(organizationId, 'BpmsInstanceVariable', row.variableKey, 'variable_changed', userId, { name });
    return row;
  }

  async retry(organizationId: string, userId: string, instanceKey: string) {
    const instance = await this.prisma.bpmsProcessInstance.findFirst({ where: { organizationId, instanceKey } });
    if (!instance) return null;
    await this.prisma.bpmsProcessInstance.update({
      where: { organizationId_instanceKey: { organizationId, instanceKey } },
      data: { status: 'running', retryCount: instance.retryCount + 1 },
    });
    return this.advance(organizationId, userId, instanceKey);
  }

  private async log(organizationId: string, instanceKey: string, elementKey: string, eventType: string, details: Record<string, unknown>) {
    const seq = await this.prisma.bpmsExecutionLog.count({ where: { organizationId } });
    return this.prisma.bpmsExecutionLog.create({
      data: { organizationId, logKey: generateBpmsKey('LOG', seq + 1), instanceKey, elementKey, eventType, details: details as object },
    });
  }

  history(organizationId: string, instanceKey: string) {
    return this.prisma.bpmsExecutionLog.findMany({
      where: { organizationId, instanceKey },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
