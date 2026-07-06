import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { IntegrationFlowService } from '@/core/eih/application/integration-flow.service';
import { IntegrationSyncService } from '@/core/eih/application/integration-sync.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { EIP_EXTERNAL_TARGETS, generateEipKey } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';
import { EipEventBusService } from './eip-event-bus.service';
import { EipEsbService } from './eip-esb.service';

@Injectable()
export class EipBridgeService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly core: CoreEngineService,
    private readonly eihFlows: IntegrationFlowService,
    private readonly eihSync: IntegrationSyncService,
    private readonly eventBus: EipEventBusService,
    private readonly esb: EipEsbService,
    private readonly audit: EipAuditService,
  ) {}

  externalTargets() {
    return EIP_EXTERNAL_TARGETS;
  }

  async bridgeModuleEvent(
    organizationId: string,
    moduleRef: string,
    eventType: string,
    payload: Record<string, unknown>,
    userId?: string,
  ) {
    const topicKey = `module.${moduleRef}`;
    await this.ensureTopic(organizationId, topicKey, `Módulo ${moduleRef}`, 'domain');
    const esbResult = await this.esb.routeMessage(organizationId, `module:${moduleRef}`, payload, false).catch(() => null);
    const eventResult = await this.eventBus.publish(organizationId, topicKey, eventType, payload, 'domain', userId);
    await this.core.emitUserAction(
      organizationId,
      'EipBridge',
      moduleRef,
      EVENT_TYPES.EIP_BRIDGE_INVOKED,
      { eventType, messageKey: eventResult.messageKey },
    );
    const seq = await this.prisma.eipInvocationLog.count({ where: { organizationId } });
    await this.prisma.eipInvocationLog.create({
      data: {
        organizationId,
        invocationKey: generateEipKey('BRG', seq + 1),
        channel: 'bridge',
        targetRef: moduleRef,
        success: true,
        requestMeta: { eventType } as object,
        responseMeta: { esb: esbResult?.messageKey, event: eventResult.messageKey } as object,
        userId,
      },
    });
    await this.audit.log(organizationId, 'EipBridge', moduleRef, 'bridge_invoked', userId, { eventType });
    return { bridged: true, moduleRef, eventType, esb: esbResult, event: eventResult };
  }

  async bridgeEihFlow(organizationId: string, flowKey: string, data: Record<string, unknown>[]) {
    const flows = await this.eihFlows.findAll(organizationId);
    const flow = flows.find((f) => f.flowKey === flowKey);
    if (!flow) return { bridged: false, reason: 'flow_not_found' };
    const result = await this.eihSync.executeFlow(organizationId, flowKey, data);
    return this.bridgeModuleEvent(organizationId, 'eih', 'EihFlowSynced', { flowKey, result });
  }

  private async ensureTopic(organizationId: string, topicKey: string, name: string, kind: 'domain' | 'system' | 'custom') {
    const existing = await this.prisma.eipEventTopic.findFirst({ where: { organizationId, topicKey } });
    if (!existing) {
      await this.eventBus.createTopic(organizationId, topicKey, name, kind);
    }
  }

  async logConfigChange(
    organizationId: string,
    entityType: string,
    entityKey: string,
    changeType: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    userId?: string,
  ) {
    const seq = await this.prisma.eipConfigChange.count({ where: { organizationId } });
    const change = await this.prisma.eipConfigChange.create({
      data: {
        organizationId,
        changeKey: generateEipKey('CFG', seq + 1),
        entityType,
        entityKey,
        changeType,
        before: before as object,
        after: after as object,
        userId,
      },
    });
    await this.audit.log(organizationId, entityType, entityKey, 'config_changed', userId, { changeType });
    return change;
  }
}
