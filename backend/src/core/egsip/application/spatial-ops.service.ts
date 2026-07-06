import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  bboxFromGeometry,
  bufferPolygon,
  calculatePolygonAreaHa,
  centroidFromGeometry,
  centroidFromPolygon,
  clusterPoints,
  GeoJsonGeometry,
  GeoJsonPolygon,
  haversineDistanceM,
  lineLengthM,
  perimeterM,
  pointInGeometry,
  polygonsIntersect,
  validatePolygon,
} from '@/shared/spatial/geometry.util';

@Injectable()
export class SpatialOpsService {
  constructor(private readonly prisma: PrismaService) {}

  measureArea(geometry: unknown) {
    const areaHa = calculatePolygonAreaHa(geometry);
    if (areaHa == null) throw new BadRequestException('Geometría de polígono inválida');
    return { areaHa, unit: 'ha' };
  }

  measureDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const distanceM = haversineDistanceM(lat1, lng1, lat2, lng2);
    return { distanceM, unit: 'm' };
  }

  measurePerimeter(geometry: unknown) {
    const perimeter = perimeterM(geometry);
    if (perimeter == null) throw new BadRequestException('Geometría de polígono inválida');
    return { perimeterM: perimeter, unit: 'm' };
  }

  measureLineLength(coordinates: number[][]) {
    return { lengthM: lineLengthM(coordinates), unit: 'm' };
  }

  centroid(geometry: unknown) {
    const c = centroidFromGeometry(geometry) ?? centroidFromPolygon(geometry);
    if (!c) throw new BadRequestException('No se pudo calcular centroide');
    return c;
  }

  buffer(geometry: GeoJsonPolygon, distanceM: number) {
    if (geometry.type !== 'Polygon') throw new BadRequestException('Buffer requiere Polygon');
    return { geometry: bufferPolygon(geometry, distanceM), distanceM };
  }

  intersect(a: GeoJsonPolygon, b: GeoJsonPolygon) {
    return { intersects: polygonsIntersect(a, b) };
  }

  contains(point: { lat: number; lng: number }, geometry: GeoJsonGeometry) {
    return { contains: pointInGeometry(point.lng, point.lat, geometry) };
  }

  validate(geometry: unknown) {
    return validatePolygon(geometry);
  }

  cluster(
    points: Array<{ lat: number; lng: number; properties?: Record<string, unknown> }>,
    cellSizeDeg?: number,
  ) {
    return clusterPoints(points, cellSizeDeg);
  }

  async logOperation(
    organizationId: string,
    userId: string | undefined,
    operationType: string,
    input: unknown,
    output: unknown,
    scalar?: number,
    unit?: string,
    parameters: Record<string, unknown> = {},
  ) {
    return this.prisma.gisSpatialOperationLog.create({
      data: {
        organizationId,
        operationType,
        inputGeometry: input as object,
        outputGeometry: output as object,
        parameters: parameters as Prisma.InputJsonValue,
        resultScalar: scalar ?? null,
        resultUnit: unit ?? null,
        performedBy: userId ?? null,
      },
    });
  }
}
