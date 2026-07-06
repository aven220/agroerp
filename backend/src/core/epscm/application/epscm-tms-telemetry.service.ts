import { Injectable } from '@nestjs/common';
import { EpscmTmsTelemetrySlotType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsTelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.epscmTmsTelemetrySlot.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async provisionSlot(
    organizationId: string,
    slotType: EpscmTmsTelemetrySlotType,
    vehicleKey?: string,
    tripKey?: string,
    providerConfig?: Record<string, unknown>,
  ) {
    const seq = await this.prisma.epscmTmsTelemetrySlot.count({ where: { organizationId } });
    const slot = await this.prisma.epscmTmsTelemetrySlot.create({
      data: {
        organizationId,
        slotKey: generateEpscmTmsKey('TEL', seq + 1),
        slotType,
        vehicleKey,
        tripKey,
        status: 'pending_integration',
        providerConfig: (providerConfig ?? {}) as object,
      },
    });
    return slot;
  }

  async markReady(organizationId: string, slotKey: string) {
    const slot = await this.prisma.epscmTmsTelemetrySlot.updateMany({
      where: { organizationId, slotKey },
      data: { status: 'ready' },
    });
    await this.integration.onTelemetrySlotReady(organizationId, slotKey);
    return slot;
  }

  async bootstrapArchitecture(organizationId: string, vehicleKey?: string) {
    const types: EpscmTmsTelemetrySlotType[] = ['gps', 'telemetry', 'iot_temperature', 'speed', 'vehicle_event'];
    const slots = [];
    for (const slotType of types) {
      slots.push(await this.provisionSlot(organizationId, slotType, vehicleKey));
    }
    return slots;
  }
}
