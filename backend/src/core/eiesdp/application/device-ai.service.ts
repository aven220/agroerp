import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class DeviceAiService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(organizationId: string) {
    const suggestions: Array<Record<string, unknown>> = [];
    const since7d = new Date(Date.now() - 7 * 86_400_000);

    const offline = await this.prisma.eiesdpDevice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { status: 'offline' },
          { lastSeenAt: { lt: new Date(Date.now() - 3_600_000) } },
        ],
      },
      take: 10,
    });
    for (const d of offline) {
      suggestions.push({
        type: 'failure_prediction',
        deviceKey: d.deviceKey,
        recommendation: 'Revisar conectividad y rotar credenciales',
      });
    }

    const lowBattery = await this.prisma.eiesdpDevice.findMany({
      where: { organizationId, batteryLevel: { lt: 20 }, deletedAt: null },
      take: 10,
    });
    for (const d of lowBattery) {
      suggestions.push({
        type: 'maintenance_predictive',
        deviceKey: d.deviceKey,
        batteryLevel: d.batteryLevel,
        recommendation: 'Programar reemplazo de batería o carga',
      });
    }

    const anomalies = await this.prisma.eiesdpTelemetryReading.groupBy({
      by: ['deviceKey', 'metricKey'],
      where: { organizationId, recordedAt: { gte: since7d } },
      _avg: { value: true },
      _max: { value: true },
    });
    for (const row of anomalies) {
      const avg = row._avg.value ?? 0;
      const max = row._max.value ?? 0;
      if (max > avg * 3 && avg > 0) {
        suggestions.push({
          type: 'anomaly_detection',
          deviceKey: row.deviceKey,
          metricKey: row.metricKey,
          avg,
          max,
          recommendation: 'Valor atípico detectado — revisar sensor o calibración',
        });
      }
    }

    const energyMeters = await this.prisma.eiesdpDevice.count({
      where: { organizationId, deviceType: 'energy_meter', status: 'active' },
    });
    if (energyMeters > 0) {
      suggestions.push({
        type: 'energy_optimization',
        devices: energyMeters,
        recommendation: 'Analizar picos de consumo en horarios no operativos',
      });
    }

    return suggestions.slice(0, 20);
  }
}
