import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class BpmsIntegrationService {
  constructor(private readonly core: CoreEngineService) {}

  async onProcessPublished(organizationId: string, processKey: string) {
    await this.core.emitUserAction(organizationId, 'BpmsProcess', processKey, EVENT_TYPES.BPMS_PROCESS_PUBLISHED, { integration: 'documents' });
  }

  async onInstanceStarted(organizationId: string, instanceKey: string, moduleTarget?: string) {
    await this.core.emitUserAction(organizationId, 'BpmsProcessInstance', instanceKey, EVENT_TYPES.BPMS_INSTANCE_STARTED, { moduleTarget, integration: 'workflow' });
  }

  async onInstanceCompleted(organizationId: string, instanceKey: string) {
    await this.core.emitUserAction(organizationId, 'BpmsProcessInstance', instanceKey, EVENT_TYPES.BPMS_INSTANCE_COMPLETED, { integration: 'bi' });
  }

  async onTaskAssigned(organizationId: string, taskKey: string, assigneeId: string) {
    await this.core.emitUserAction(organizationId, 'BpmsTask', taskKey, EVENT_TYPES.BPMS_TASK_ASSIGNED, { assigneeId, integration: 'notifications' });
  }

  async onTaskCompleted(organizationId: string, taskKey: string, approved: boolean) {
    await this.core.emitUserAction(organizationId, 'BpmsTask', taskKey, approved ? EVENT_TYPES.BPMS_TASK_APPROVED : EVENT_TYPES.BPMS_TASK_REJECTED, { integration: 'iam' });
  }

  async onAutomationTriggered(organizationId: string, automationKey: string, moduleTarget: string) {
    await this.core.emitUserAction(organizationId, 'BpmsAutomation', automationKey, EVENT_TYPES.BPMS_AUTOMATION_TRIGGERED, { moduleTarget, integration: 'bi' });
  }

  async onDashboardRefresh(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'BpmsIndicatorSnapshot', 'batch', EVENT_TYPES.BPMS_DASHBOARD_REFRESH, { integration: 'dashboard' });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'BpmsOfflineBatch', batchKey, EVENT_TYPES.BPMS_OFFLINE_SYNCED, { integration: 'mobile' });
  }

  async onWebhookInvoked(organizationId: string, webhookKey: string) {
    await this.core.emitUserAction(organizationId, 'BpmsWebhook', webhookKey, EVENT_TYPES.BPMS_WEBHOOK_INVOKED, { integration: 'eims' });
  }
}
