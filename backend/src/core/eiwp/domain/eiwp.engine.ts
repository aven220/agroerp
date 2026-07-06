export function generateEiwpKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EIWP_WATER_SOURCE_TYPES = [
  'well', 'reservoir', 'channel', 'dam', 'tank', 'spring', 'river', 'municipal',
];

export const EIWP_NETWORK_TYPES = ['gravity', 'pressurized', 'mixed'];
export const EIWP_IRRIGATION_METHODS = [
  'gravity', 'sprinkler', 'drip', 'micro_sprinkler', 'center_pivot',
];

export const EIWP_SCHEDULE_MODES = ['manual', 'automatic'];
export const EIWP_WEATHER_METRICS = [
  'temperature', 'humidity', 'wind_speed', 'wind_direction', 'precipitation',
  'solar_radiation', 'atmospheric_pressure', 'evapotranspiration',
];

export const EIWP_FORECAST_HORIZONS = ['hourly', 'daily', 'weekly'];
export const EIWP_FORECAST_PROVIDERS = [
  { providerKey: 'generic', name: 'Generic forecast', vendor: 'generic', capabilities: EIWP_FORECAST_HORIZONS },
  { providerKey: 'external_api', name: 'External API', vendor: 'external', capabilities: EIWP_FORECAST_HORIZONS },
];

export const EIWP_ALERT_TYPES = [
  'drought_risk', 'flood_risk', 'frost', 'hail', 'high_temperature', 'low_temperature',
  'strong_wind', 'insufficient_irrigation', 'excess_irrigation', 'extreme_event',
];

export const EIWP_AUTOMATION_DEVICE_TYPES = [
  'irrigation_controller', 'smart_valve', 'automated_pump', 'moisture_sensor', 'scheduler', 'iot_device',
];

export const EIWP_MODULE_SLOTS = [
  'eatp', 'eapp', 'egsip', 'ftip', 'fmdt', 'eims', 'emfg', 'epscm', 'eint', 'ebiap', 'eiamp', 'eiesdp',
];

export interface WaterBalanceInput {
  appliedWaterMm: number;
  rainfallMm: number;
  etMm: number;
  cropDemandMm: number;
  availabilityM3: number;
}

export function computeWaterBalance(input: WaterBalanceInput) {
  const netInput = input.appliedWaterMm + input.rainfallMm;
  const demand = Math.max(input.etMm, input.cropDemandMm);
  const balance = netInput - demand;
  const deficitMm = balance < 0 ? Math.abs(balance) : 0;
  const excessMm = balance > 0 ? balance : 0;
  return {
    appliedWaterMm: input.appliedWaterMm,
    rainfallMm: input.rainfallMm,
    etMm: input.etMm,
    cropDemandMm: input.cropDemandMm,
    deficitMm,
    excessMm,
    availabilityM3: input.availabilityM3,
    netBalanceMm: balance,
    status: deficitMm > 5 ? 'deficit' : excessMm > 10 ? 'excess' : 'balanced',
  };
}

export interface ClimateAlertInput {
  temperatureC?: number;
  humidityPct?: number;
  windSpeedKmh?: number;
  precipitationMm?: number;
  deficitMm?: number;
  excessMm?: number;
  appliedWaterMm?: number;
  forecastExtreme?: boolean;
}

export function evaluateClimateAlerts(input: ClimateAlertInput) {
  const alerts: Array<{ alertType: string; severity: 'info' | 'warning' | 'critical'; title: string }> = [];
  if ((input.deficitMm ?? 0) > 15) {
    alerts.push({ alertType: 'drought_risk', severity: 'critical', title: 'Riesgo de sequía' });
  } else if ((input.deficitMm ?? 0) > 8) {
    alerts.push({ alertType: 'drought_risk', severity: 'warning', title: 'Déficit hídrico elevado' });
  }
  if ((input.excessMm ?? 0) > 20) {
    alerts.push({ alertType: 'flood_risk', severity: 'critical', title: 'Riesgo de inundación' });
  } else if ((input.excessMm ?? 0) > 10) {
    alerts.push({ alertType: 'excess_irrigation', severity: 'warning', title: 'Exceso de riego' });
  }
  if ((input.temperatureC ?? 20) < 2) {
    alerts.push({ alertType: 'frost', severity: 'critical', title: 'Riesgo de heladas' });
  }
  if ((input.temperatureC ?? 20) < 5) {
    alerts.push({ alertType: 'low_temperature', severity: 'warning', title: 'Temperaturas bajas' });
  }
  if ((input.temperatureC ?? 20) > 38) {
    alerts.push({ alertType: 'high_temperature', severity: 'critical', title: 'Altas temperaturas' });
  } else if ((input.temperatureC ?? 20) > 32) {
    alerts.push({ alertType: 'high_temperature', severity: 'warning', title: 'Temperatura elevada' });
  }
  if ((input.windSpeedKmh ?? 0) > 60) {
    alerts.push({ alertType: 'strong_wind', severity: 'critical', title: 'Fuertes vientos' });
  } else if ((input.windSpeedKmh ?? 0) > 40) {
    alerts.push({ alertType: 'strong_wind', severity: 'warning', title: 'Vientos moderados-altos' });
  }
  if ((input.precipitationMm ?? 0) > 50) {
    alerts.push({ alertType: 'hail', severity: 'warning', title: 'Precipitación intensa' });
  }
  if ((input.deficitMm ?? 0) > 5 && (input.appliedWaterMm ?? 0) === 0) {
    alerts.push({ alertType: 'insufficient_irrigation', severity: 'warning', title: 'Falta de riego' });
  }
  if (input.forecastExtreme) {
    alerts.push({ alertType: 'extreme_event', severity: 'critical', title: 'Evento climático extremo' });
  }
  return alerts;
}

export function aggregateEiwpIndicators(data: {
  waterSources: number;
  activeSectors: number;
  scheduledIrrigations: number;
  activeAlerts: number;
  weatherStations: number;
  consumptionM3_30d: number;
}) {
  const waterScore = Math.min(
    100,
    data.waterSources * 3 + data.activeSectors * 4 + data.weatherStations * 5 + Math.min(30, data.scheduledIrrigations),
  );
  return {
    waterSources: data.waterSources,
    activeSectors: data.activeSectors,
    scheduledIrrigations: data.scheduledIrrigations,
    activeAlerts: data.activeAlerts,
    weatherStations: data.weatherStations,
    consumptionM3_30d: data.consumptionM3_30d,
    waterScore,
    irrigationReady: waterScore >= 35,
  };
}

export function estimateEtMm(temperatureC: number, humidityPct: number): number {
  const satVapor = 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
  const vpd = satVapor * (1 - humidityPct / 100);
  return Math.max(0, Math.round(vpd * 2.5 * 10) / 10);
}

export function buildAgronomicRecommendation(input: {
  deficitMm: number;
  excessMm: number;
  phenologyStage?: string;
  soilType?: string;
  availabilityM3: number;
  temperatureC?: number;
}): string {
  if (input.deficitMm > 10) {
    return `Incrementar riego en etapa ${input.phenologyStage ?? 'actual'}; suelo ${input.soilType ?? 'general'} con déficit ${input.deficitMm.toFixed(1)} mm`;
  }
  if (input.excessMm > 10) {
    return `Reducir aplicación hídrica; exceso ${input.excessMm.toFixed(1)} mm detectado`;
  }
  if ((input.temperatureC ?? 25) > 32 && input.availabilityM3 < 100) {
    return 'Programar riego nocturno por alta temperatura y disponibilidad limitada';
  }
  return `Mantener programa actual; balance hídrico estable para ${input.phenologyStage ?? 'cultivo'}`;
}
