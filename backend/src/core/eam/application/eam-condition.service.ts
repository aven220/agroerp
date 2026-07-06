import { Injectable } from '@nestjs/common';
import { EamConditionMetricKind } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  computeConditionTrend,
  evaluateConditionThreshold,
  generateEamReliabilityKey,
  STANDARD_CONDITION_METRICS,
} from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamConditionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listProfiles(organizationId: string, assetType?: string) {
    return this.prisma.eamAssetMetricProfile.findMany({
      where: { organizationId, ...(assetType ? { assetType } : {}), isActive: true },
    });
  }

  async createProfile(
    organizationId: string,
    userId: string,
    assetType: string,
    metricKind: EamConditionMetricKind,
    label: string,
    unit?: string,
    warnThreshold?: number,
    critThreshold?: number,
  ) {
    const seq = await this.prisma.eamAssetMetricProfile.count({ where: { organizationId } });
    const profile = await this.prisma.eamAssetMetricProfile.create({
      data: {
        organizationId,
        profileKey: generateEamReliabilityKey('MPR', seq + 1),
        assetType,
        metricKind,
        label,
        unit,
        warnThreshold,
        critThreshold,
      },
    });
    await this.audit.log(organizationId, 'EamAssetMetricProfile', profile.profileKey, 'created', userId, { assetType, metricKind });
    return profile;
  }

  async seedStandardProfiles(organizationId: string, userId: string, assetType: string) {
    const labels: Record<string, string> = {
      temperature: 'Temperatura',
      vibration: 'Vibración',
      pressure: 'Presión',
      humidity: 'Humedad',
      voltage: 'Voltaje',
      current: 'Corriente',
      rpm: 'RPM',
      operating_hours: 'Horas de operación',
      motor_hours: 'Horas de motor',
      work_cycles: 'Ciclos de trabajo',
    };
    const units: Record<string, string> = {
      temperature: '°C',
      vibration: 'mm/s',
      pressure: 'bar',
      humidity: '%',
      voltage: 'V',
      current: 'A',
      rpm: 'rpm',
      operating_hours: 'h',
      motor_hours: 'h',
      work_cycles: 'cycles',
    };
    for (const kind of STANDARD_CONDITION_METRICS) {
      const exists = await this.prisma.eamAssetMetricProfile.findFirst({
        where: { organizationId, assetType, metricKind: kind },
      });
      if (!exists) {
        await this.createProfile(organizationId, userId, assetType, kind, labels[kind] ?? kind, units[kind]);
      }
    }
    return this.listProfiles(organizationId, assetType);
  }

  listReadings(organizationId: string, assetKey?: string, metricKind?: EamConditionMetricKind, limit = 100) {
    return this.prisma.eamConditionReading.findMany({
      where: {
        organizationId,
        ...(assetKey ? { assetKey } : {}),
        ...(metricKind ? { metricKind } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async recordReading(
    organizationId: string,
    userId: string,
    assetKey: string,
    metricKind: EamConditionMetricKind,
    value: number,
    unit?: string,
    source = 'manual',
  ) {
    const seq = await this.prisma.eamConditionReading.count({ where: { organizationId } });
    const reading = await this.prisma.eamConditionReading.create({
      data: {
        organizationId,
        readingKey: generateEamReliabilityKey('RDG', seq + 1),
        assetKey,
        metricKind,
        value,
        unit,
        source,
        recordedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EamConditionReading', reading.readingKey, 'condition_reading', userId, { assetKey, metricKind, value });
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId, assetKey } });
    const profile = await this.prisma.eamAssetMetricProfile.findFirst({
      where: { organizationId, assetType: asset?.assetType ? String(asset.assetType) : 'default', metricKind, isActive: true },
    });
    const status = evaluateConditionThreshold(value, profile?.warnThreshold, profile?.critThreshold);
    if (status !== 'normal') {
      const alertSeq = await this.prisma.eamRelAlert.count({ where: { organizationId } });
      const alert = await this.prisma.eamRelAlert.create({
        data: {
          organizationId,
          alertKey: generateEamReliabilityKey('ALT', alertSeq + 1),
          assetKey,
          title: `Lectura ${status}: ${metricKind}`,
          body: `Valor ${value} fuera de rango para activo ${assetKey}`,
          severity: status === 'critical' ? 'critical' : 'warning',
        },
      });
      await this.integration.onAlertRaised(organizationId, alert.alertKey, alert.severity);
    }
    await this.integration.onConditionReading(organizationId, reading.readingKey, assetKey);
    return reading;
  }

  async trend(organizationId: string, assetKey: string, metricKind: EamConditionMetricKind) {
    const readings = await this.prisma.eamConditionReading.findMany({
      where: { organizationId, assetKey, metricKind },
      orderBy: { recordedAt: 'asc' },
      take: 200,
    });
    return computeConditionTrend(readings.map((r) => ({ recordedAt: r.recordedAt, value: r.value })));
  }
}
