import { Injectable } from '@nestjs/common';
import { EVENT_TYPES, EiesdpTelemetryPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DeviceRegistryService } from './device-registry.service';
import { DeviceDigitalTwinService } from './device-digital-twin.service';
import { DeviceAlertService } from './device-alert.service';

@Injectable()
export class DeviceTelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly registry: DeviceRegistryService,
    private readonly twin: DeviceDigitalTwinService,
    private readonly alerts: DeviceAlertService,
  ) {}

  async ingest(organizationId: string, payload: EiesdpTelemetryPayload) {
    const device = await this.registry.findOne(organizationId, payload.deviceKey);

    const reading = await this.prisma.eiesdpTelemetryReading.create({
      data: {
        organizationId,
        deviceId: device.id,
        deviceKey: payload.deviceKey,
        metricKey: payload.metricKey,
        value: payload.value,
        valueText: payload.valueText,
        unit: payload.unit,
        latitude: payload.latitude,
        longitude: payload.longitude,
        batteryLevel: payload.batteryLevel,
        signalQuality: payload.signalQuality,
        firmwareVersion: payload.firmwareVersion,
        payload: (payload.payload ?? {}) as object,
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      },
    });

    await this.prisma.eiesdpDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        status: device.status === 'offline' ? 'active' : device.status,
        ...(payload.batteryLevel != null ? { batteryLevel: payload.batteryLevel } : {}),
        ...(payload.signalQuality != null ? { signalQuality: payload.signalQuality } : {}),
        ...(payload.firmwareVersion ? { firmwareVersion: payload.firmwareVersion } : {}),
        ...(payload.latitude != null ? { latitude: payload.latitude } : {}),
        ...(payload.longitude != null ? { longitude: payload.longitude } : {}),
      },
    });

    await this.twin.updateReported(device.id, {
      [payload.metricKey]: payload.value ?? payload.valueText,
      batteryLevel: payload.batteryLevel,
      signalQuality: payload.signalQuality,
      lastReadingAt: new Date().toISOString(),
    });

    if (payload.batteryLevel != null && payload.batteryLevel < 15) {
      await this.alerts.raise(organizationId, {
        deviceId: device.id,
        deviceKey: payload.deviceKey,
        alertKey: 'low_battery',
        severity: 'warning',
        title: 'Batería baja',
        message: `Dispositivo ${payload.deviceKey} batería ${payload.batteryLevel}%`,
      });
    }

    await this.core.emitUserAction(
      organizationId,
      'Device',
      device.id,
      EVENT_TYPES.TELEMETRY_RECEIVED,
      { deviceKey: payload.deviceKey, metricKey: payload.metricKey, value: payload.value },
    );

    return reading;
  }

  async ingestBatch(organizationId: string, payloads: EiesdpTelemetryPayload[]) {
    const results = [];
    for (const p of payloads) {
      results.push(await this.ingest(organizationId, p));
    }
    return results;
  }

  listReadings(organizationId: string, deviceKey?: string, limit = 200) {
    return this.prisma.eiesdpTelemetryReading.findMany({
      where: { organizationId, ...(deviceKey ? { deviceKey } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async dashboardMetrics(organizationId: string, sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const readings = await this.prisma.eiesdpTelemetryReading.groupBy({
      by: ['metricKey'],
      where: { organizationId, recordedAt: { gte: since } },
      _count: { id: true },
      _avg: { value: true },
    });
    return readings.map((r) => ({
      metricKey: r.metricKey,
      count: r._count.id,
      avgValue: r._avg.value,
    }));
  }
}
