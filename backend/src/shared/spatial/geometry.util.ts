export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: number[][];
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry;
  properties?: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export type GeoJsonGeometry =
  | GeoJsonPoint
  | GeoJsonLineString
  | GeoJsonPolygon
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'MultiPoint'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] };

export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const EARTH_RADIUS_M = 6378137;

export function calculatePolygonAreaHa(geometry: unknown): number | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const geo = geometry as GeoJsonPolygon;
  if (geo.type !== 'Polygon' || !Array.isArray(geo.coordinates?.[0])) return null;

  const ring = geo.coordinates[0];
  if (ring.length < 4) return null;

  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    area +=
      ((lon2 - lon1) * Math.PI) / 180 *
      (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  area = (area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
  const areaHa = Math.abs(area) / 10000;
  return Math.round(areaHa * 10000) / 10000;
}

export function centroidFromPolygon(geometry: unknown): { lat: number; lng: number } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const geo = geometry as GeoJsonPolygon;
  if (geo.type !== 'Polygon' || !Array.isArray(geo.coordinates?.[0])) return null;
  const ring = geo.coordinates[0];
  let latSum = 0;
  let lngSum = 0;
  const n = ring.length - 1;
  if (n <= 0) return null;
  for (let i = 0; i < n; i++) {
    lngSum += ring[i][0];
    latSum += ring[i][1];
  }
  return { lat: latSum / n, lng: lngSum / n };
}

export function centroidFromGeometry(geometry: unknown): { lat: number; lng: number } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as GeoJsonGeometry;
  if (g.type === 'Point') {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  if (g.type === 'LineString' && g.coordinates.length > 0) {
    const mid = g.coordinates[Math.floor(g.coordinates.length / 2)];
    return { lng: mid[0], lat: mid[1] };
  }
  if (g.type === 'Polygon') {
    return centroidFromPolygon(g);
  }
  if (g.type === 'MultiPolygon' && g.coordinates[0]?.[0]) {
    return centroidFromPolygon({ type: 'Polygon', coordinates: g.coordinates[0] });
  }
  return null;
}

export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function lineLengthM(coordinates: number[][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];
    total += haversineDistanceM(lat1, lng1, lat2, lng2);
  }
  return Math.round(total * 100) / 100;
}

export function perimeterM(geometry: unknown): number | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const geo = geometry as GeoJsonPolygon;
  if (geo.type !== 'Polygon' || !geo.coordinates?.[0]) return null;
  return lineLengthM(geo.coordinates[0]);
}

export function pointInPolygon(lng: number, lat: number, polygon: GeoJsonPolygon): boolean {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInCircle(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusM: number,
): boolean {
  return haversineDistanceM(lat, lng, centerLat, centerLng) <= radiusM;
}

export function pointInGeometry(lng: number, lat: number, geometry: GeoJsonGeometry): boolean {
  if (geometry.type === 'Point') {
    return (
      Math.abs(geometry.coordinates[0] - lng) < 0.00001 &&
      Math.abs(geometry.coordinates[1] - lat) < 0.00001
    );
  }
  if (geometry.type === 'Polygon') {
    return pointInPolygon(lng, lat, geometry);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) =>
      pointInPolygon(lng, lat, { type: 'Polygon', coordinates: poly }),
    );
  }
  return false;
}

export function bboxFromGeometry(geometry: unknown): Bbox | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as GeoJsonGeometry;
  const coords: number[][] = [];

  if (g.type === 'Point') coords.push(g.coordinates as number[]);
  else if (g.type === 'LineString') coords.push(...g.coordinates);
  else if (g.type === 'Polygon') coords.push(...g.coordinates[0]);
  else if (g.type === 'MultiPolygon')
    g.coordinates.forEach((poly) => coords.push(...poly[0]));
  else if (g.type === 'MultiPoint') coords.push(...g.coordinates);
  else if (g.type === 'MultiLineString') g.coordinates.forEach((line) => coords.push(...line));

  if (coords.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lng, lat] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function bboxIntersects(a: Bbox, b: Bbox): boolean {
  return !(a.maxLat < b.minLat || a.minLat > b.maxLat || a.maxLng < b.minLng || a.minLng > b.maxLng);
}

export function bboxContainsPoint(bbox: Bbox, lat: number, lng: number): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

export function metersToDegrees(meters: number, atLat: number): { dLat: number; dLng: number } {
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos((atLat * Math.PI) / 180));
  return { dLat, dLng };
}

export function bufferPolygon(polygon: GeoJsonPolygon, distanceM: number): GeoJsonPolygon {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return polygon;
  const centroid = centroidFromPolygon(polygon);
  if (!centroid) return polygon;
  const { dLat, dLng } = metersToDegrees(distanceM, centroid.lat);
  const buffered = ring.map(([lng, lat]) => {
    const signLat = lat >= centroid.lat ? 1 : -1;
    const signLng = lng >= centroid.lng ? 1 : -1;
    return [lng + signLng * dLng, lat + signLat * dLat];
  });
  return { type: 'Polygon', coordinates: [buffered] };
}

export function polygonsIntersect(a: GeoJsonPolygon, b: GeoJsonPolygon): boolean {
  const bboxA = bboxFromGeometry(a);
  const bboxB = bboxFromGeometry(b);
  if (!bboxA || !bboxB || !bboxIntersects(bboxA, bboxB)) return false;
  for (const [lng, lat] of a.coordinates[0]) {
    if (pointInPolygon(lng, lat, b)) return true;
  }
  for (const [lng, lat] of b.coordinates[0]) {
    if (pointInPolygon(lng, lat, a)) return true;
  }
  return false;
}

export function validatePolygon(geometry: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!geometry || typeof geometry !== 'object') {
    return { valid: false, errors: ['Geometría inválida'] };
  }
  const geo = geometry as GeoJsonPolygon;
  if (geo.type !== 'Polygon') {
    return { valid: false, errors: ['Se requiere tipo Polygon'] };
  }
  const ring = geo.coordinates?.[0];
  if (!ring || ring.length < 4) {
    errors.push('El anillo exterior requiere al menos 4 coordenadas');
  } else {
    const [fLng, fLat] = ring[0];
    const [lLng, lLat] = ring[ring.length - 1];
    if (fLng !== lLng || fLat !== lLat) {
      errors.push('El anillo no está cerrado');
    }
    const area = calculatePolygonAreaHa(geo);
    if (area === null || area <= 0) {
      errors.push('Área no válida');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function clusterPoints(
  points: Array<{ lat: number; lng: number; properties?: Record<string, unknown> }>,
  cellSizeDeg = 0.05,
): Array<{ lat: number; lng: number; count: number; properties: Record<string, unknown> }> {
  const grid = new Map<string, { lat: number; lng: number; count: number }>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / cellSizeDeg)}:${Math.floor(p.lng / cellSizeDeg)}`;
    const existing = grid.get(key);
    if (existing) {
      existing.count += 1;
      existing.lat = (existing.lat * (existing.count - 1) + p.lat) / existing.count;
      existing.lng = (existing.lng * (existing.count - 1) + p.lng) / existing.count;
    } else {
      grid.set(key, { lat: p.lat, lng: p.lng, count: 1 });
    }
  }
  return Array.from(grid.values()).map((c) => ({
    ...c,
    properties: { clusterCount: c.count },
  }));
}

export function buildHeatmapGrid(
  points: Array<{ lat: number; lng: number; weight?: number }>,
  bbox: Bbox,
  rows = 20,
  cols = 20,
): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const latStep = (bbox.maxLat - bbox.minLat) / rows || 0.01;
  const lngStep = (bbox.maxLng - bbox.minLng) / cols || 0.01;
  for (const p of points) {
    const r = Math.min(rows - 1, Math.max(0, Math.floor((p.lat - bbox.minLat) / latStep)));
    const c = Math.min(cols - 1, Math.max(0, Math.floor((p.lng - bbox.minLng) / lngStep)));
    grid[r][c] += p.weight ?? 1;
  }
  return grid;
}

export function parseCoordinateRow(
  row: Record<string, unknown>,
  latKeys = ['lat', 'latitude', 'Lat', 'LAT'],
  lngKeys = ['lng', 'lon', 'longitude', 'Lng', 'LON', 'LONGITUDE'],
): { lat: number; lng: number } | null {
  let lat: number | undefined;
  let lng: number | undefined;
  for (const k of latKeys) {
    if (row[k] != null && row[k] !== '') {
      lat = Number(row[k]);
      break;
    }
  }
  for (const k of lngKeys) {
    if (row[k] != null && row[k] !== '') {
      lng = Number(row[k]);
      break;
    }
  }
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function toFeatureCollection(
  features: Array<{ geometry: GeoJsonGeometry; properties?: Record<string, unknown> }>,
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: f.properties ?? {},
    })),
  };
}

export function nearestNeighborRoute(
  stops: Array<{ lat: number; lng: number; id: string; name: string }>,
): Array<{ lat: number; lng: number; id: string; name: string }> {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const route: typeof stops = [];
  let current = remaining.shift()!;
  route.push(current);
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistanceM(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    current = remaining.splice(nearestIdx, 1)[0];
    route.push(current);
  }
  return route;
}

export function routeTotalDistanceKm(
  stops: Array<{ lat: number; lng: number }>,
): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineDistanceM(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  return Math.round((total / 1000) * 1000) / 1000;
}
