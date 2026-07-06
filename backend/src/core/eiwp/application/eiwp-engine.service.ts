import { Injectable } from '@nestjs/common';
import {
  EIWP_AUTOMATION_DEVICE_TYPES,
  EIWP_FORECAST_HORIZONS,
  EIWP_IRRIGATION_METHODS,
  EIWP_SCHEDULE_MODES,
  EIWP_WATER_SOURCE_TYPES,
  EIWP_WEATHER_METRICS,
} from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';
import { EiwpAutomationService, EiwpFieldEventService, EiwpRecommendationService } from './eiwp-automation.service';
import { EiwpAlertService } from './eiwp-alert.service';
import { EiwpBalanceService } from './eiwp-balance.service';
import { EiwpBridgeService, EiwpMonitoringService } from './eiwp-monitoring.service';
import { EiwpIrrigationService } from './eiwp-irrigation.service';
import { EiwpWaterService } from './eiwp-water.service';
import { EiwpWeatherService } from './eiwp-weather.service';

export { EiwpOfflineService } from './eiwp-monitoring.service';

@Injectable()
export class EiwpEngineService {
  constructor(
    private readonly monitoring: EiwpMonitoringService,
    private readonly water: EiwpWaterService,
    private readonly irrigation: EiwpIrrigationService,
    private readonly weather: EiwpWeatherService,
    private readonly balance: EiwpBalanceService,
    private readonly alerts: EiwpAlertService,
    private readonly automation: EiwpAutomationService,
    private readonly recommendations: EiwpRecommendationService,
    private readonly fieldEvents: EiwpFieldEventService,
    private readonly bridge: EiwpBridgeService,
    private readonly audit: EiwpAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, sources, sectors, schedules, stations, balances, activeAlerts] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.water.listSources(organizationId),
      this.water.listSectors(organizationId),
      this.irrigation.listSchedules(organizationId),
      this.weather.listStations(organizationId),
      this.balance.list(organizationId),
      this.alerts.listActive(organizationId),
    ]);
    return {
      dashboard,
      sources,
      sectors,
      schedules,
      stations,
      balances,
      activeAlerts,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        waterSourceTypes: EIWP_WATER_SOURCE_TYPES,
        irrigationMethods: EIWP_IRRIGATION_METHODS,
        scheduleModes: EIWP_SCHEDULE_MODES,
        weatherMetrics: EIWP_WEATHER_METRICS,
        forecastHorizons: EIWP_FORECAST_HORIZONS,
        automationDeviceTypes: EIWP_AUTOMATION_DEVICE_TYPES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    await Promise.all([
      this.weather.ensureForecastProviders(organizationId),
      this.monitoring.runAutoProcesses(organizationId, userId),
    ]);
    await this.audit.log(organizationId, 'EiwpPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
