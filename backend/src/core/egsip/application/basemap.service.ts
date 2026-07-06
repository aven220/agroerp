import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const DEFAULT_BASEMAPS = [
  {
    basemapCode: 'osm-street',
    basemapName: 'Mapa callejero',
    provider: 'osm',
    mapType: 'street',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    defaultForOrg: true,
    offlineCapable: false,
  },
  {
    basemapCode: 'satellite',
    basemapName: 'Satelital',
    provider: 'esri',
    mapType: 'satellite',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    defaultForOrg: false,
    offlineCapable: false,
  },
  {
    basemapCode: 'hybrid',
    basemapName: 'Híbrido',
    provider: 'esri',
    mapType: 'hybrid',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    defaultForOrg: false,
    offlineCapable: false,
  },
  {
    basemapCode: 'topo',
    basemapName: 'Topográfico',
    provider: 'esri',
    mapType: 'topographic',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    defaultForOrg: false,
    offlineCapable: false,
  },
  {
    basemapCode: 'terrain',
    basemapName: 'Relieve',
    provider: 'esri',
    mapType: 'terrain',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    defaultForOrg: false,
    offlineCapable: false,
  },
  {
    basemapCode: 'offline',
    basemapName: 'Mapa offline',
    provider: 'local',
    mapType: 'offline',
    urlTemplate: '/tiles/offline/{z}/{x}/{y}.png',
    attribution: 'AGROERP',
    defaultForOrg: false,
    offlineCapable: true,
  },
  {
    basemapCode: 'vector',
    basemapName: 'Vectorial',
    provider: 'osm',
    mapType: 'vector',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    defaultForOrg: false,
    offlineCapable: false,
  },
  {
    basemapCode: 'custom',
    basemapName: 'Personalizado',
    provider: 'custom',
    mapType: 'custom',
    urlTemplate: '',
    attribution: '',
    defaultForOrg: false,
    offlineCapable: true,
  },
];

@Injectable()
export class BasemapService {
  constructor(private readonly prisma: PrismaService) {}

  async listBasemaps(organizationId: string) {
    const count = await this.prisma.gisBasemapConfig.count({ where: { organizationId } });
    if (count === 0) {
      await this.prisma.gisBasemapConfig.createMany({
        data: DEFAULT_BASEMAPS.map((b) => ({ organizationId, ...b })),
      });
    }
    return this.prisma.gisBasemapConfig.findMany({
      where: { organizationId },
      orderBy: { basemapName: 'asc' },
    });
  }
}
