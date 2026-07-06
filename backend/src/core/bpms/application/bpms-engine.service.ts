import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Prisma } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { generateBpmsKey } from '../domain/bpms.engine';
import { BpmsProcessService } from './bpms-process.service';
import { BpmsDesignerService } from './bpms-designer.service';
import { BpmsRuntimeService } from './bpms-runtime.service';
import { BpmsTaskService } from './bpms-task.service';
import { BpmsAutomationService, BpmsSchedulerService } from './bpms-automation.service';
import { BpmsMonitoringService, BpmsTemplateService } from './bpms-monitoring.service';
import { BpmsIntegrationService } from './bpms-integration.service';

type OfflineOp = {
  type: 'task_complete' | 'task_delegate' | 'task_attach' | 'condition_reading';
  payload: Record<string, unknown>;
};

@Injectable()
export class BpmsOfflineService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly integration: BpmsIntegrationService,
    @Inject(forwardRef(() => BpmsTaskService)) private readonly tasks: BpmsTaskService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.bpmsOfflineBatch.count({ where: { organizationId } });
    return this.prisma.bpmsOfflineBatch.create({
      data: { organizationId, batchKey: generateBpmsKey('OFF', seq + 1), deviceId, createdBy: userId, payload: operations as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.bpmsOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.bpmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.bpmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'task_complete':
        return this.tasks.complete(organizationId, userId, String(p.taskKey), p.approved !== false, p.signatureUrl ? String(p.signatureUrl) : undefined);
      case 'task_delegate':
        return this.tasks.delegate(organizationId, userId, String(p.taskKey), String(p.toUserId));
      case 'task_attach':
        return this.tasks.attach(organizationId, userId, String(p.taskKey), String(p.title), String(p.storageUrl));
      default:
        return null;
    }
  }

  mobileSync(organizationId: string, userId: string) {
    return Promise.all([
      this.tasks.inbox(organizationId, userId),
      this.prisma.bpmsProcessInstance.findMany({ where: { organizationId, status: 'running' }, take: 20 }),
    ]).then(([tasks, instances]) => ({ tasks, instances }));
  }
}

@Injectable()
export class BpmsEngineService {
  private readonly logger = new Logger(BpmsEngineService.name);

  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly processes: BpmsProcessService,
    private readonly designer: BpmsDesignerService,
    private readonly runtime: BpmsRuntimeService,
    private readonly tasks: BpmsTaskService,
    private readonly automation: BpmsAutomationService,
    private readonly scheduler: BpmsSchedulerService,
    private readonly monitoring: BpmsMonitoringService,
    private readonly templates: BpmsTemplateService,
    private readonly integration: BpmsIntegrationService,
  ) {}

  async center(organizationId: string, userId: string) {
    try {
      const [processes, instances, automations, dashboard, templates] = await Promise.all([
        this.processes.list(organizationId),
        this.runtime.listInstances(organizationId, 'running'),
        this.automation.list(organizationId),
        this.monitoring.dashboard(organizationId),
        this.templates.list(organizationId),
      ]);
      const inbox = await this.tasks.inbox(organizationId, userId);
      return { processes, instances, automations, dashboard, templates, inbox };
    } catch (error) {
      if (this.isBpmsSchemaUnavailable(error)) {
        this.logger.warn('BPMS schema unavailable; returning empty center payload');
        return {
          processes: [],
          instances: [],
          automations: [],
          dashboard: { indicators: {}, activeInstances: [], failedInstances: [] },
          templates: [],
          inbox: [],
        };
      }
      throw error;
    }
  }

  private isBpmsSchemaUnavailable(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P1014')
    );
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.templates.seed(organizationId);
    const exists = await this.prisma.bpmsProcess.findFirst({ where: { organizationId } });
    if (!exists) {
      const process = await this.processes.create(organizationId, userId, 'PROC-APPROVAL', 'Aprobación estándar', 'purchasing', 'Flujo de aprobación genérico');
      const ver = await this.prisma.bpmsProcessVersion.findFirst({ where: { organizationId, processKey: process.processKey }, orderBy: { versionNumber: 'desc' } });
      if (ver) {
        await this.designer.saveDiagram(organizationId, ver.versionKey, [
          { elementKey: 'start', elementType: 'start', name: 'Inicio', posX: 80, posY: 120 },
          { elementKey: 'approve', elementType: 'user_task', name: 'Aprobar', posX: 250, posY: 120 },
          { elementKey: 'end', elementType: 'end', name: 'Fin', posX: 420, posY: 120 },
        ], [
          { fromElementKey: 'start', toElementKey: 'approve' },
          { fromElementKey: 'approve', toElementKey: 'end' },
        ]);
        await this.processes.publish(organizationId, userId, ver.versionKey);
      }
      await this.automation.create(organizationId, userId, 'Auto inicio compras', 'module_event', { module: 'purchasing', event: 'order_created' }, { action: 'start_process', processKey: 'PROC-APPROVAL' }, 'PROC-APPROVAL');
    }
    await this.monitoring.compute(organizationId);
    return this.center(organizationId, userId);
  }
}
