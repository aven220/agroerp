import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';

const WEIGHT = 10;

function hasNumericCoordinate(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const numeric = Number(value);
  return !Number.isNaN(numeric) && numeric !== 0;
}

/**
 * Safe GPS detection across common ERP entity shapes.
 * Supports latitude/longitude, centroid fields and nested gps objects.
 */
export function hasGpsLocation(entity: Record<string, unknown>): boolean {
  const gps = entity.gps;
  if (gps && typeof gps === 'object') {
    const gpsRecord = gps as Record<string, unknown>;
    if (
      hasNumericCoordinate(gpsRecord.latitude ?? gpsRecord.lat) &&
      hasNumericCoordinate(gpsRecord.longitude ?? gpsRecord.lng ?? gpsRecord.lon)
    ) {
      return true;
    }
  }

  const latitude =
    entity.latitude ?? entity.lat ?? entity.centroidLatitude ?? entity.centroidLat;
  const longitude =
    entity.longitude ?? entity.lng ?? entity.lon ?? entity.centroidLongitude ?? entity.centroidLng;

  return hasNumericCoordinate(latitude) && hasNumericCoordinate(longitude);
}

export const gpsRule: HealthRule = {
  id: 'gps',
  evaluate(record) {
    const passed = hasGpsLocation(record.entity);
    return buildHealthCheck({
      id: 'gps',
      title: 'Ubicación GPS',
      description: passed
        ? 'El registro tiene coordenadas GPS.'
        : 'El registro no tiene ubicación GPS registrada.',
      passed,
      weight: WEIGHT,
    });
  },
};
