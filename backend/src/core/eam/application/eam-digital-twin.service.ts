import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamDigitalTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listSlots(organizationId: string, assetKey?: string) {
    return this.prisma.eamDigitalTwinSlot.findMany({
      where: { organizationId, ...(assetKey ? { assetKey } : {}) },
      include: { states: { orderBy: { syncedAt: 'desc' }, take: 1 } },
    });
  }

  async registerSlot(organizationId: string, userId: string, assetKey: string, syncConfig: Record<string, unknown> = {}) {
    const seq = await this.prisma.eamDigitalTwinSlot.count({ where: { organizationId } });
    const slot = await this.prisma.eamDigitalTwinSlot.create({
      data: {
        organizationId,
        slotKey: generateEamReliabilityKey('DTW', seq + 1),
        assetKey,
        status: 'pending_integration',
        syncConfig: syncConfig as object,
      },
    });
    await this.audit.log(organizationId, 'EamDigitalTwinSlot', slot.slotKey, 'created', userId, { assetKey });
    return slot;
  }

  async syncState(
    organizationId: string,
    userId: string,
    slotKey: string,
    telemetry: Record<string, unknown>,
    virtualState: Record<string, unknown>,
  ) {
    const slot = await this.prisma.eamDigitalTwinSlot.findFirst({ where: { organizationId, slotKey } });
    if (!slot) return null;
    const seq = await this.prisma.eamDigitalTwinState.count({ where: { organizationId } });
    const state = await this.prisma.eamDigitalTwinState.create({
      data: {
        organizationId,
        stateKey: generateEamReliabilityKey('DTS', seq + 1),
        slotKey,
        telemetry: telemetry as object,
        virtualState: virtualState as object,
      },
    });
    await this.prisma.eamDigitalTwinSlot.update({
      where: { organizationId_slotKey: { organizationId, slotKey } },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EamDigitalTwinState', state.stateKey, 'digital_twin_sync', userId, { slotKey });
    await this.integration.onDigitalTwinSync(organizationId, state.stateKey, slot.assetKey);
    return state;
  }

  history(organizationId: string, slotKey: string, limit = 50) {
    return this.prisma.eamDigitalTwinState.findMany({
      where: { organizationId, slotKey },
      orderBy: { syncedAt: 'desc' },
      take: limit,
    });
  }
}
