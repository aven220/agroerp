import { Injectable } from '@nestjs/common';
import { BpmsAutomationType } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { generateBpmsKey } from '../domain/bpms.engine';
import { BpmsAuditService } from './bpms-audit.service';
import { BpmsIntegrationService } from './bpms-integration.service';
import { BpmsRuntimeService } from './bpms-runtime.service';

@Injectable()
export class BpmsAutomationService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly audit: BpmsAuditService,
    private readonly integration: BpmsIntegrationService,
    private readonly runtime: BpmsRuntimeService,
  ) {}

  list(organizationId: string) {
    return this.prisma.bpmsAutomation.findMany({ where: { organizationId } });
  }

  async create(
    organizationId: string,
    userId: string,
    name: string,
    automationType: BpmsAutomationType,
    triggerConfig: Record<string, unknown>,
    actionConfig: Record<string, unknown>,
    processKey?: string,
  ) {
    const seq = await this.prisma.bpmsAutomation.count({ where: { organizationId } });
    return this.prisma.bpmsAutomation.create({
      data: {
        organizationId,
        automationKey: generateBpmsKey('AUT', seq + 1),
        name,
        automationType,
        processKey,
        triggerConfig: triggerConfig as object,
        actionConfig: actionConfig as object,
      },
    });
  }

  async trigger(organizationId: string, userId: string, automationKey: string, payload: Record<string, unknown> = {}) {
    const automation = await this.prisma.bpmsAutomation.findFirst({ where: { organizationId, automationKey, isActive: true } });
    if (!automation) return null;
    if (automation.processKey) {
      await this.runtime.start(organizationId, userId, automation.processKey, { ...payload, automationKey });
    }
    await this.prisma.bpmsAutomation.update({
      where: { organizationId_automationKey: { organizationId, automationKey } },
      data: { lastRunAt: new Date() },
    });
    await this.audit.log(organizationId, 'BpmsAutomation', automationKey, 'automation_triggered', userId, payload);
    await this.integration.onAutomationTriggered(organizationId, automationKey, automation.processKey ?? 'global');
    return automation;
  }

  async registerWebhook(organizationId: string, userId: string, name: string, endpointUrl: string, secret?: string) {
    const seq = await this.prisma.bpmsWebhook.count({ where: { organizationId } });
    return this.prisma.bpmsWebhook.create({
      data: { organizationId, webhookKey: generateBpmsKey('WHK', seq + 1), name, endpointUrl, secret },
    });
  }

  listWebhooks(organizationId: string) {
    return this.prisma.bpmsWebhook.findMany({ where: { organizationId } });
  }

  async invokeWebhook(organizationId: string, userId: string, webhookKey: string, payload: Record<string, unknown>) {
    const webhook = await this.prisma.bpmsWebhook.findFirst({ where: { organizationId, webhookKey, isActive: true } });
    if (!webhook) return null;
    await this.audit.log(organizationId, 'BpmsWebhook', webhookKey, 'webhook_invoked', userId, { endpointUrl: webhook.endpointUrl, payload });
    await this.integration.onWebhookInvoked(organizationId, webhookKey);
    return { webhookKey, status: 'queued', endpointUrl: webhook.endpointUrl };
  }
}

@Injectable()
export class BpmsSchedulerService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly automation: BpmsAutomationService,
  ) {}

  async runScheduled(organizationId: string, userId: string) {
    const automations = await this.prisma.bpmsAutomation.findMany({
      where: { organizationId, automationType: 'scheduled', isActive: true },
    });
    const results = [];
    for (const a of automations) {
      results.push(await this.automation.trigger(organizationId, userId, a.automationKey));
    }
    return { processed: results.length, results };
  }

  async runDataChange(organizationId: string, userId: string, entityType: string, entityKey: string) {
    const automations = await this.prisma.bpmsAutomation.findMany({
      where: { organizationId, automationType: 'data_change', isActive: true },
    });
    const results = [];
    for (const a of automations) {
      const cfg = a.triggerConfig as { entityType?: string };
      if (!cfg.entityType || cfg.entityType === entityType) {
        results.push(await this.automation.trigger(organizationId, userId, a.automationKey, { entityType, entityKey }));
      }
    }
    return { processed: results.length };
  }
}
