import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  parseCoordinateRow,
  toFeatureCollection,
} from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class GisImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  async importData(
    organizationId: string,
    userId: string,
    dto: {
      format: string;
      layerCode: string;
      content: string;
      fileName?: string;
    },
    ctx?: Partial<RequestContext>,
  ) {
    const format = dto.format.toLowerCase();
    let features: GeoJsonFeature[] = [];

    switch (format) {
      case 'geojson':
        features = this.parseGeoJson(dto.content);
        break;
      case 'kml':
      case 'kmz':
        features = this.parseKml(dto.content);
        break;
      case 'gpx':
        features = this.parseGpx(dto.content);
        break;
      case 'csv':
        features = this.parseCsv(dto.content);
        break;
      case 'excel':
      case 'xlsx':
        features = this.parseExcelJson(dto.content);
        break;
      case 'shapefile':
      case 'shp':
        features = this.parseGeoJson(dto.content);
        break;
      default:
        throw new BadRequestException(`Formato no soportado: ${format}`);
    }

    const imported = await this.prisma.gisImportedGeoLayer.create({
      data: {
        organizationId,
        layerCode: dto.layerCode,
        sourceFormat: format,
        sourceFileRef: dto.fileName ?? null,
        featureCount: features.length,
        features: features as unknown as Prisma.InputJsonValue,
        importedBy: userId,
      },
    });

    await this.gisEvents.importCompleted(
      organizationId,
      imported.id,
      { layerCode: dto.layerCode, featureCount: features.length, format },
      ctx,
    );

    return { importId: imported.id, featureCount: features.length, layerCode: dto.layerCode };
  }

  async exportData(
    organizationId: string,
    userId: string,
    dto: {
      format: string;
      layerCode?: string;
      features?: GeoJsonFeature[];
      filters?: Record<string, unknown>;
    },
    ctx?: Partial<RequestContext>,
  ) {
    let features = dto.features ?? [];
    if (dto.layerCode && features.length === 0) {
      const imported = await this.prisma.gisImportedGeoLayer.findFirst({
        where: { organizationId, layerCode: dto.layerCode },
        orderBy: { importedAt: 'desc' },
      });
      if (imported) features = imported.features as unknown as GeoJsonFeature[];
    }

    const fc: GeoJsonFeatureCollection = toFeatureCollection(
      features.map((f) => ({ geometry: f.geometry, properties: f.properties })),
    );

    const format = dto.format.toLowerCase();
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'geojson':
        content = JSON.stringify(fc, null, 2);
        mimeType = 'application/geo+json';
        break;
      case 'kml':
      case 'kmz':
        content = this.toKml(fc);
        mimeType = 'application/vnd.google-earth.kml+xml';
        break;
      case 'csv':
        content = this.toCsv(features);
        mimeType = 'text/csv';
        break;
      case 'excel':
      case 'xlsx':
        content = this.toCsv(features);
        mimeType = 'text/csv';
        break;
      case 'gpx':
        content = this.toGpx(features);
        mimeType = 'application/gpx+xml';
        break;
      case 'pdf':
        content = this.toPdfHtml(fc);
        mimeType = 'text/html';
        break;
      default:
        throw new BadRequestException(`Formato de exportación no soportado: ${format}`);
    }

    await this.gisEvents.exportGenerated(organizationId, userId, { format, featureCount: features.length }, ctx);
    return { format, mimeType, content, featureCount: features.length };
  }

  private parseGeoJson(content: string): GeoJsonFeature[] {
    const parsed = JSON.parse(content) as GeoJsonFeatureCollection | GeoJsonFeature;
    if (parsed.type === 'FeatureCollection') return parsed.features;
    if (parsed.type === 'Feature') return [parsed];
    throw new BadRequestException('GeoJSON inválido');
  }

  private parseKml(content: string): GeoJsonFeature[] {
    const features: GeoJsonFeature[] = [];
    const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
    let match: RegExpExecArray | null;
    while ((match = placemarkRegex.exec(content)) !== null) {
      const block = match[1];
      const name = block.match(/<name>([^<]*)<\/name>/i)?.[1] ?? 'Placemark';
      const coordsMatch = block.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (!coordsMatch) continue;
      const pairs = coordsMatch[1]
        .trim()
        .split(/\s+/)
        .map((c) => c.split(',').map(Number))
        .filter((p) => p.length >= 2 && !Number.isNaN(p[0]) && !Number.isNaN(p[1]));

      if (pairs.length === 1) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pairs[0][0], pairs[0][1]] },
          properties: { name },
        });
      } else if (pairs.length >= 3) {
        if (pairs[0][0] !== pairs[pairs.length - 1][0] || pairs[0][1] !== pairs[pairs.length - 1][1]) {
          pairs.push(pairs[0]);
        }
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [pairs.map((p) => [p[0], p[1]])] },
          properties: { name },
        });
      }
    }
    return features;
  }

  private parseGpx(content: string): GeoJsonFeature[] {
    const features: GeoJsonFeature[] = [];
    const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/gi;
    let match: RegExpExecArray | null;
    while ((match = wptRegex.exec(content)) !== null) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      const name = match[3].match(/<name>([^<]*)<\/name>/i)?.[1] ?? 'Waypoint';
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { name },
      });
    }
    const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/gi;
    const lineCoords: number[][] = [];
    while ((match = trkptRegex.exec(content)) !== null) {
      lineCoords.push([Number(match[2]), Number(match[1])]);
    }
    if (lineCoords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: lineCoords },
        properties: { name: 'Track' },
      });
    }
    return features;
  }

  private parseCsv(content: string): GeoJsonFeature[] {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().replace(/^"|"$/g, ''));
    const features: GeoJsonFeature[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;\t]/).map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      const coord = parseCoordinateRow(row);
      if (!coord) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [coord.lng, coord.lat] },
        properties: row,
      });
    }
    return features;
  }

  private parseExcelJson(content: string): GeoJsonFeature[] {
    const rows = JSON.parse(content) as Record<string, unknown>[];
    const features: GeoJsonFeature[] = [];
    for (const row of rows) {
      const coord = parseCoordinateRow(row);
      if (!coord) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [coord.lng, coord.lat] },
        properties: row,
      });
    }
    return features;
  }

  private toKml(fc: GeoJsonFeatureCollection): string {
    const placemarks = fc.features
      .map((f) => {
        const name = String(f.properties?.name ?? 'Feature');
        if (f.geometry.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates;
          return `<Placemark><name>${name}</name><Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`;
        }
        if (f.geometry.type === 'Polygon') {
          const coords = f.geometry.coordinates[0].map((c) => `${c[0]},${c[1]},0`).join(' ');
          return `<Placemark><name>${name}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
        }
        return '';
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
  }

  private toCsv(features: GeoJsonFeature[]): string {
    const rows = ['name,lat,lng,type'];
    for (const f of features) {
      const name = String(f.properties?.name ?? '');
      if (f.geometry.type === 'Point') {
        rows.push(`"${name}",${f.geometry.coordinates[1]},${f.geometry.coordinates[0]},Point`);
      }
    }
    return rows.join('\n');
  }

  private toGpx(features: GeoJsonFeature[]): string {
    const wpts = features
      .filter((f) => f.geometry.type === 'Point')
      .map((f) => {
        const g = f.geometry as { coordinates: [number, number] };
        const name = String(f.properties?.name ?? 'Point');
        return `<wpt lat="${g.coordinates[1]}" lon="${g.coordinates[0]}"><name>${name}</name></wpt>`;
      })
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1">${wpts}</gpx>`;
  }

  private toPdfHtml(fc: GeoJsonFeatureCollection): string {
    const rows = fc.features
      .slice(0, 500)
      .map(
        (f, i) =>
          `<tr><td>${i + 1}</td><td>${f.geometry.type}</td><td>${JSON.stringify(f.properties ?? {})}</td></tr>`,
      )
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mapa AGROERP</title></head><body><h1>Exportación espacial AGROERP</h1><table border="1"><thead><tr><th>#</th><th>Tipo</th><th>Propiedades</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  }
}
