import { Injectable } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import {
  EAPP_AG_INDICES,
  EAPP_INFRA_TYPES,
  EAPP_POI_TYPES,
  EAPP_SATELLITE_PROVIDERS,
  EAPP_TELEMETRY_TYPES,
  EAPP_THEMATIC_MAP_TYPES,
} from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';
import { EappBridgeService, EappMonitoringService } from './eapp-monitoring.service';
import { EappGisService } from './eapp-gis.service';
import { EappGeoService } from './eapp-geo.service';
import { EappSatelliteService } from './eapp-satellite.service';
import { EappDroneService } from './eapp-drone.service';
import { EappThematicService } from './eapp-thematic.service';
import { EappIndexService } from './eapp-index.service';
import { EappTelemetryService } from './eapp-telemetry.service';
import { EappInspectionService } from './eapp-inspection.service';

export { EappOfflineService } from './eapp-monitoring.service';

@Injectable()
export class EappEngineService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly monitoring: EappMonitoringService,
    private readonly gis: EappGisService,
    private readonly geo: EappGeoService,
    private readonly satellite: EappSatelliteService,
    private readonly drone: EappDroneService,
    private readonly thematic: EappThematicService,
    private readonly indices: EappIndexService,
    private readonly telemetry: EappTelemetryService,
    private readonly inspections: EappInspectionService,
    private readonly bridge: EappBridgeService,
    private readonly audit: EappAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, layers, pois, infra, missions, thematicMaps, indices, devices] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.gis.listLayers(organizationId),
      this.geo.listPois(organizationId),
      this.geo.listInfrastructure(organizationId),
      this.drone.listMissions(organizationId),
      this.thematic.list(organizationId),
      this.indices.list(organizationId),
      this.telemetry.listDevices(organizationId),
    ]);
    return {
      dashboard,
      layers,
      pois,
      infra,
      missions,
      thematicMaps,
      indices,
      devices,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        satelliteProviders: EAPP_SATELLITE_PROVIDERS,
        agIndices: EAPP_AG_INDICES,
        thematicMapTypes: EAPP_THEMATIC_MAP_TYPES,
        poiTypes: EAPP_POI_TYPES,
        infraTypes: EAPP_INFRA_TYPES,
        telemetryTypes: EAPP_TELEMETRY_TYPES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    await Promise.all([
      this.satellite.ensureProviders(organizationId),
      this.indices.ensureStandardIndices(organizationId),
    ]);
    await this.audit.log(organizationId, 'EappPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
