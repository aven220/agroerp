import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class DeviceAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async raise(organizationId: string, data: {
    deviceId?: string;
    deviceKey?: string;
    alertKey: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message?: string;
    payload?: Record<string, unknown>;
  }) {
    const alert = await this.prisma.eiesdpAlert.create({
      data: {
        organizationId,
        deviceId: data.deviceId,
        deviceKey: data.deviceKey,
        alertKey: data.alertKey,
        severity: data.severity,
        title: data.title,
        message: data.message,
        payload: (data.payload ?? {}) as object,
      },
    });

    if (data.deviceId) {
      await this.prisma.eiesdpDeviceEvent.create({
        data: {
          organizationId,
          deviceId: data.deviceId,
          deviceKey: data.deviceKey ?? '',
          kind: 'alarm',
          eventType: data.alertKey,
          severity: data.severity,
          message: data.message,
          payload: (data.payload ?? {}) as object,
        },
      });
      await this.core.emitUserAction(
        organizationId,
        'Device',
        data.deviceId,
        EVENT_TYPES.DEVICE_ALARM_RAISED,
        { alertKey: data.alertKey, severity: data.severity },
      );
    }
    return alert;
  }

  findAll(organizationId: string, unacknowledgedOnly = true) {
    return this.prisma.eiesdpAlert.findMany({
      where: { organizationId, ...(unacknowledgedOnly ? { isAcknowledged: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  acknowledge(organizationId: string, alertId: string) {
    return this.prisma.eiesdpAlert.updateMany({
      where: { id: alertId, organizationId },
      data: { isAcknowledged: true, acknowledgedAt: new Date() },
    });
  }

  listEvents(organizationId: string, deviceKey?: string) {
    return this.prisma.eiesdpDeviceEvent.findMany({
      where: { organizationId, ...(deviceKey ? { deviceKey } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: 300,
    });
  }
}
