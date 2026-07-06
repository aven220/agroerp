import {
  calculatePolygonAreaHa,
  centroidFromPolygon,
  haversineDistanceM,
  pointInPolygon,
  validatePolygon,
} from '@/shared/spatial/geometry.util';

describe('spatial geometry util', () => {
  const square: { type: 'Polygon'; coordinates: number[][][] } = {
    type: 'Polygon',
    coordinates: [
      [
        [-74.1, 4.6],
        [-74.0, 4.6],
        [-74.0, 4.7],
        [-74.1, 4.7],
        [-74.1, 4.6],
      ],
    ],
  };

  it('calculates polygon area in hectares', () => {
    const area = calculatePolygonAreaHa(square);
    expect(area).not.toBeNull();
    expect(area!).toBeGreaterThan(0);
  });

  it('computes centroid', () => {
    const c = centroidFromPolygon(square);
    expect(c?.lat).toBeCloseTo(4.65, 2);
    expect(c?.lng).toBeCloseTo(-74.05, 2);
  });

  it('validates closed polygon', () => {
    const result = validatePolygon(square);
    expect(result.valid).toBe(true);
  });

  it('detects point inside polygon', () => {
    expect(pointInPolygon(-74.05, 4.65, square)).toBe(true);
    expect(pointInPolygon(-73.5, 4.65, square)).toBe(false);
  });

  it('computes haversine distance', () => {
    const d = haversineDistanceM(4.6, -74.1, 4.7, -74.0);
    expect(d).toBeGreaterThan(10000);
  });
});
