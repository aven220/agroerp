import { Injectable } from '@nestjs/common';
import { EamIotSlotStatus, EamPredictiveSlotType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamPredictiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listSlots(organizationId: string) {
    return this.prisma.eamPredictiveSlot.findMany({ where: { organizationId } });
  }

  async registerSlot(
    organizationId: string,
    userId: string,
    slotType: EamPredictiveSlotType,
    providerConfig: Record<string, unknown> = {},
  ) {
    const seq = await this.prisma.eamPredictiveSlot.count({ where: { organizationId } });
    const slot = await this.prisma.eamPredictiveSlot.create({
      data: {
        organizationId,
        slotKey: generateEamReliabilityKey('PRD', seq + 1),
        slotType,
        status: 'pending_integration',
        providerConfig: providerConfig as object,
      },
    });
    await this.audit.log(organizationId, 'EamPredictiveSlot', slot.slotKey, 'created', userId, { slotType });
    return slot;
  }

  async bootstrapSlots(organizationId: string, userId: string) {
    const types: EamPredictiveSlotType[] = [
      'failure_prediction',
      'wear_prediction',
      'rul_estimation',
      'maintenance_recommendation',
      'anomaly_detection',
      'work_order_suggestion',
    ];
    for (const slotType of types) {
      const exists = await this.prisma.eamPredictiveSlot.findFirst({ where: { organizationId, slotType } });
      if (!exists) {
        await this.registerSlot(organizationId, userId, slotType, { modelProvider: 'external' });
      }
    }
    return this.listSlots(organizationId);
  }

  async activateSlot(organizationId: string, userId: string, slotKey: string) {
    const slot = await this.prisma.eamPredictiveSlot.update({
      where: { organizationId_slotKey: { organizationId, slotKey } },
      data: { status: 'ready' as EamIotSlotStatus },
    });
    await this.audit.log(organizationId, 'EamPredictiveSlot', slotKey, 'predictive_slot_ready', userId, {});
    await this.integration.onPredictiveSlotReady(organizationId, slotKey);
    return slot;
  }

  async requestSuggestion(organizationId: string, userId: string, assetKey: string) {
    const slot = await this.prisma.eamPredictiveSlot.findFirst({
      where: { organizationId, slotType: 'work_order_suggestion' },
    });
    if (slot) {
      await this.integration.onSuggestedWorkOrder(organizationId, assetKey, slot.slotKey);
    }
    return { assetKey, slotKey: slot?.slotKey, status: 'pending_external_model', message: 'Sugerencia delegada a proveedor IA externo' };
  }
}
