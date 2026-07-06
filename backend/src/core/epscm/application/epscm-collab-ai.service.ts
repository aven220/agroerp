import { Injectable } from '@nestjs/common';
import { EpscmCollabAiSlotType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.epscmCollabAiSlot.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async provision(organizationId: string, slotType: EpscmCollabAiSlotType, providerConfig?: Record<string, unknown>) {
    const seq = await this.prisma.epscmCollabAiSlot.count({ where: { organizationId } });
    return this.prisma.epscmCollabAiSlot.create({
      data: {
        organizationId,
        slotKey: generateEpscmCollabKey('AI', seq + 1),
        slotType,
        status: 'pending_integration',
        providerConfig: (providerConfig ?? {}) as object,
      },
    });
  }

  async markReady(organizationId: string, slotKey: string) {
    await this.prisma.epscmCollabAiSlot.updateMany({
      where: { organizationId, slotKey },
      data: { status: 'ready' },
    });
    await this.integration.onAiSlotReady(organizationId, slotKey);
    return this.prisma.epscmCollabAiSlot.findFirst({ where: { organizationId, slotKey } });
  }

  async bootstrapArchitecture(organizationId: string) {
    const types: EpscmCollabAiSlotType[] = [
      'delay_prediction',
      'carrier_selection',
      'route_optimization',
      'stockout_prediction',
      'risk_detection',
    ];
    const slots = [];
    for (const slotType of types) {
      slots.push(await this.provision(organizationId, slotType));
    }
    return slots;
  }
}
