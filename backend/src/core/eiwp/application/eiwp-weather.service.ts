import { Injectable, NotFoundException } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import {
  EIWP_FORECAST_HORIZONS,
  EIWP_FORECAST_PROVIDERS,
  EIWP_WEATHER_METRICS,
  estimateEtMm,
  generateEiwpKey,
} from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';

@Injectable()
export class EiwpWeatherService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  metrics() {
    return EIWP_WEATHER_METRICS;
  }

  forecastHorizons() {
    return EIWP_FORECAST_HORIZONS;
  }

  listStations(organizationId: string) {
    return this.prisma.eiwpWeatherStation.findMany({
      where: { organizationId, status: 'active' },
      include: { readings: { take: 10, orderBy: { recordedAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async registerStation(
    organizationId: string,
    data: {
      name: string;
      stationOrigin?: string;
      farmUnitId?: string;
      fieldLotId?: string;
      latitude?: number;
      longitude?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpWeatherStation.count({ where: { organizationId } });
    const stationKey = generateEiwpKey('WST', count + 1);
    return this.prisma.eiwpWeatherStation.create({
      data: {
        organizationId,
        stationKey,
        name: data.name,
        stationOrigin: data.stationOrigin ?? 'own',
        farmUnitId: data.farmUnitId,
        fieldLotId: data.fieldLotId,
        latitude: data.latitude,
        longitude: data.longitude,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listReadings(organizationId: string, stationKey?: string, metric?: string) {
    return this.prisma.eiwpWeatherReading.findMany({
      where: {
        organizationId,
        ...(stationKey ? { station: { stationKey } } : {}),
        ...(metric ? { metric } : {}),
      },
      include: { station: true },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });
  }

  async ingestReading(
    organizationId: string,
    data: { stationKey: string; metric: string; value: number; unit?: string; recordedAt?: Date },
  ) {
    const station = await this.prisma.eiwpWeatherStation.findFirst({
      where: { organizationId, stationKey: data.stationKey },
    });
    if (!station) throw new NotFoundException('Estación no encontrada');
    const count = await this.prisma.eiwpWeatherReading.count({ where: { organizationId } });
    const readingKey = generateEiwpKey('WRD', count + 1);
    const reading = await this.prisma.eiwpWeatherReading.create({
      data: {
        organizationId,
        stationId: station.id,
        readingKey,
        metric: data.metric,
        value: data.value,
        unit: data.unit,
        recordedAt: data.recordedAt ?? new Date(),
      },
    });
    await this.prisma.eiwpWeatherStation.update({
      where: { id: station.id },
      data: { lastReadingAt: reading.recordedAt },
    });
    return reading;
  }

  async ensureForecastProviders(organizationId: string) {
    for (const p of EIWP_FORECAST_PROVIDERS) {
      await this.prisma.eiwpForecastProvider.upsert({
        where: { organizationId_providerKey: { organizationId, providerKey: p.providerKey } },
        create: {
          organizationId,
          providerKey: p.providerKey,
          name: p.name,
          vendor: p.vendor,
          capabilities: p.capabilities,
        },
        update: {},
      });
    }
    return this.prisma.eiwpForecastProvider.findMany({ where: { organizationId } });
  }

  listForecasts(organizationId: string, horizon?: string) {
    return this.prisma.eiwpForecast.findMany({
      where: { organizationId, ...(horizon ? { horizon } : {}) },
      include: { provider: true },
      orderBy: { validFrom: 'desc' },
      take: 200,
    });
  }

  async registerForecast(
    organizationId: string,
    userId: string | undefined,
    data: {
      horizon: string;
      fieldLotId?: string;
      farmUnitId?: string;
      validFrom: Date;
      validTo: Date;
      payload: Record<string, unknown>;
      providerKey?: string;
    },
  ) {
    const count = await this.prisma.eiwpForecast.count({ where: { organizationId } });
    const forecastKey = generateEiwpKey('FCST', count + 1);
    const provider = data.providerKey
      ? await this.prisma.eiwpForecastProvider.findFirst({
          where: { organizationId, providerKey: data.providerKey },
        })
      : null;
    const row = await this.prisma.eiwpForecast.create({
      data: {
        organizationId,
        forecastKey,
        providerId: provider?.id,
        horizon: data.horizon,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        validFrom: data.validFrom,
        validTo: data.validTo,
        payload: data.payload as object,
        status: 'completed',
      },
    });
    await this.audit.log(organizationId, 'EiwpForecast', forecastKey, 'forecast_ingested', userId, {
      horizon: data.horizon,
    });
    return row;
  }

  async latestClimateSnapshot(organizationId: string) {
    const readings = await this.prisma.eiwpWeatherReading.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
    const snap: Record<string, number> = {};
    for (const r of readings) {
      if (snap[r.metric] == null) snap[r.metric] = r.value;
    }
    const temperatureC = snap.temperature ?? 25;
    const humidityPct = snap.humidity ?? 60;
    if (snap.evapotranspiration == null) {
      snap.evapotranspiration = estimateEtMm(temperatureC, humidityPct);
    }
    return { metrics: snap, stations: await this.listStations(organizationId) };
  }
}
