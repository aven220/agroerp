import { Injectable } from '@nestjs/common';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { EFFM_TELEMETRY_PROTOCOLS, generateEffmKey, simulateTelemetryPayload } from '../domain/effm.engine';
import { EffmAuditService } from './effm-audit.service';

@Injectable()
export class EffmTelemetryService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly audit: EffmAuditService,
  ) {}

  listConfigs(organizationId: string) {
    return this.prisma.effmTelemetryConfig.findMany({ where: { organizationId, status: 'active' } });
  }

  async registerConfig(
    organizationId: string,
    data: { protocol: string; machineId?: string; controllerRef?: string },
  ) {
    const count = await this.prisma.effmTelemetryConfig.count({ where: { organizationId } });
    const configKey = generateEffmKey('TLM', count + 1);
    return this.prisma.effmTelemetryConfig.create({ data: { organizationId, configKey, ...data } });
  }

  listReadings(organizationId: string, machineId?: string) {
    return this.prisma.effmTelemetryReading.findMany({
      where: { organizationId, ...(machineId ? { machineId } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  async ingestReading(
    organizationId: string,
    userId: string | undefined,
    data: { protocol: string; machineId?: string; configId?: string; payload: Record<string, unknown> },
  ) {
    const parsed = simulateTelemetryPayload(data.protocol, data.payload);
    const count = await this.prisma.effmTelemetryReading.count({ where: { organizationId } });
    const readingKey = generateEffmKey('RDG', count + 1);
    const row = await this.prisma.effmTelemetryReading.create({
      data: {
        organizationId, readingKey, configId: data.configId, machineId: data.machineId,
        source: data.protocol, engineHours: parsed.engineHours, rpm: parsed.rpm,
        speedKmh: parsed.speedKmh, payload: parsed as object,
      },
    });
    await this.audit.log(organizationId, 'EffmTelemetryReading', readingKey, 'telemetry_received', userId);
    if (parsed.rpm != null && parsed.rpm > 4000) {
      await this.triggerAlarm(organizationId, data.machineId, data.configId, 'high_rpm', 'critical', `RPM ${parsed.rpm}`);
    }
    return row;
  }

  listAlarms(organizationId: string) {
    return this.prisma.effmTelemetryAlarm.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async syncAutoLabor(organizationId: string, userId: string, data: { machineId?: string; sessionId?: string; eventType: string; source: string; payload?: Record<string, unknown> }) {
    const count = await this.prisma.effmAutoLaborEvent.count({ where: { organizationId } });
    const eventKey = generateEffmKey('ALB', count + 1);
    const row = await this.prisma.effmAutoLaborEvent.create({
      data: { organizationId, eventKey, ...data, payload: (data.payload ?? {}) as object },
    });
    await this.audit.log(organizationId, 'EffmAutoLaborEvent', eventKey, 'auto_labor_synced', userId);
    return row;
  }

  private async triggerAlarm(organizationId: string, machineId?: string, configId?: string, alarmType?: string, severity?: string, message?: string) {
    const count = await this.prisma.effmTelemetryAlarm.count({ where: { organizationId } });
    const alarmKey = generateEffmKey('ALM', count + 1);
    await this.prisma.effmTelemetryAlarm.create({
      data: { organizationId, alarmKey, machineId, configId, alarmType: alarmType ?? 'generic', severity: severity ?? 'medium', message: message ?? 'Alarm' },
    });
    await this.audit.log(organizationId, 'EffmTelemetryAlarm', alarmKey, 'alarm_triggered');
  }

  protocols() { return EFFM_TELEMETRY_PROTOCOLS; }
}
