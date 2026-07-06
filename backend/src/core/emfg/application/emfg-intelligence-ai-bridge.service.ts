import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EmfgIntelligenceAiCapability } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';

const AI_CAPABILITIES: EmfgIntelligenceAiCapability[] = [
  'demand_forecast',
  'failure_prediction',
  'schedule_optimization',
  'waste_prediction',
  'maintenance_prediction',
];

@Injectable()
export class EmfgIntelligenceAiBridgeService {
  private readonly logger = new Logger(EmfgIntelligenceAiBridgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async ensureSlots(organizationId: string) {
    const existing = await this.prisma.emfgIntelligenceAiSlot.findMany({ where: { organizationId } });
    const existingCaps = new Set(existing.map((s) => s.capability));
    const created = [];

    for (const capability of AI_CAPABILITIES) {
      if (existingCaps.has(capability)) continue;
      const seq = await this.prisma.emfgIntelligenceAiSlot.count({ where: { organizationId } });
      const slot = await this.prisma.emfgIntelligenceAiSlot.create({
        data: {
          organizationId,
          slotKey: generateEmfgKey('AIS', seq + 1),
          capability,
          isEnabled: false,
          config: { status: 'prepared', modelProvider: null },
        },
      });
      created.push(slot);
    }

    return [...existing, ...created];
  }

  async listCapabilities(organizationId: string) {
    const slots = await this.ensureSlots(organizationId);
    return slots.map((s) => ({
      slotKey: s.slotKey,
      capability: s.capability,
      isEnabled: s.isEnabled,
      providerRef: s.providerRef,
      status: s.isEnabled ? 'ready' : 'prepared',
      config: s.config,
    }));
  }

  async requestCapability(
    organizationId: string,
    userId: string,
    capability: EmfgIntelligenceAiCapability,
    payload: Record<string, unknown>,
  ) {
    const slots = await this.ensureSlots(organizationId);
    const slot = slots.find((s) => s.capability === capability);
    if (!slot) {
      return { status: 'not_found', capability };
    }

    await this.prisma.emfgIntelligenceAiSlot.update({
      where: { organizationId_slotKey: { organizationId, slotKey: slot.slotKey } },
      data: { lastRequestAt: new Date() },
    });

    if (!slot.isEnabled) {
      return {
        status: 'prepared',
        capability,
        slotKey: slot.slotKey,
        message: 'AI slot prepared — external model provider not configured',
        payload,
      };
    }

    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceAiSlot', slot.slotKey, EVENT_TYPES.EMFG_INTELLIGENCE_AI_REQUESTED, {
      capability,
      userId,
      integration: 'ai',
      payload,
    });

    this.logger.log(`AI request queued for ${capability}`);
    return { status: 'queued', capability, slotKey: slot.slotKey };
  }
}
