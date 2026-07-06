export function generateEappKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EAPP_SATELLITE_PROVIDERS = [
  { providerKey: 'sentinel', name: 'Sentinel', vendor: 'esa', capabilities: ['optical', 'multispectral'] },
  { providerKey: 'landsat', name: 'Landsat', vendor: 'usgs', capabilities: ['optical', 'thermal'] },
  { providerKey: 'planet', name: 'Planet', vendor: 'planet', capabilities: ['daily', 'high_res'] },
  { providerKey: 'custom', name: 'Custom provider', vendor: 'custom', capabilities: ['integration_ready'] },
];

export const EAPP_AG_INDICES = [
  { code: 'NDVI', name: 'NDVI', formula: '(NIR - RED) / (NIR + RED)' },
  { code: 'NDRE', name: 'NDRE', formula: '(NIR - REDEDGE) / (NIR + REDEDGE)' },
  { code: 'GNDVI', name: 'GNDVI', formula: '(NIR - GREEN) / (NIR + GREEN)' },
  { code: 'SAVI', name: 'SAVI', formula: '((NIR - RED) / (NIR + RED + L)) * (1 + L)' },
];

export const EAPP_THEMATIC_MAP_TYPES = [
  'land_use', 'crops', 'vegetation_cover', 'irrigation_zones', 'risk_areas', 'harvested_areas', 'historical',
];

export const EAPP_POI_TYPES = ['marker', 'sampling_point', 'gate', 'shed', 'weighbridge', 'custom'];
export const EAPP_INFRA_TYPES = ['internal_road', 'channel', 'reservoir', 'well', 'pump', 'infrastructure'];

export const EAPP_TELEMETRY_TYPES = [
  'weather_station', 'soil_sensor', 'moisture_sensor', 'temperature_sensor',
  'flow_meter', 'level_meter', 'iot_sensor',
];

export const EAPP_MODULE_SLOTS = [
  'egsip', 'eatp', 'ftip', 'fmdt', 'eims', 'emfg', 'epscm', 'eam', 'eint', 'ebiap', 'eiamp', 'eiesdp',
];

export function aggregateEappIndicators(data: {
  layers: number;
  lotPolygons: number;
  activeMissions: number;
  telemetryDevices: number;
  indexReadings24h: number;
  inspections30d: number;
}) {
  const geoScore = Math.min(
    100,
    data.layers * 2 + data.lotPolygons * 3 + data.telemetryDevices * 5 + Math.min(30, data.indexReadings24h),
  );
  return {
    layers: data.layers,
    lotPolygons: data.lotPolygons,
    activeMissions: data.activeMissions,
    telemetryDevices: data.telemetryDevices,
    indexReadings24h: data.indexReadings24h,
    inspections30d: data.inspections30d,
    geoScore,
    precisionReady: geoScore >= 40,
  };
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function polygonAreaHaApprox(coords: Array<[number, number]>): number {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % coords.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2 / 10000;
}
