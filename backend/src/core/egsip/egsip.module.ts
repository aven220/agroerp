import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { AuditModule } from '@/core/audit/audit.module';
import { GisController } from './presentation/gis.controller';
import { LayerDefinitionService } from './application/layer-definition.service';
import { LayerProjectionService } from './application/layer-projection.service';
import { SpatialOpsService } from './application/spatial-ops.service';
import { GeofenceService } from './application/geofence.service';
import { GeoEventsService } from './application/geo-events.service';
import { RoutePlanService } from './application/route-plan.service';
import { GisAnalysisService } from './application/gis-analysis.service';
import { GisImportExportService } from './application/gis-import-export.service';
import { GisDashboardService } from './application/gis-dashboard.service';
import { GisReportsService } from './application/gis-reports.service';
import { GisMobileSyncService } from './application/gis-mobile-sync.service';
import { BasemapService } from './application/basemap.service';
import { GisEventEmitter } from './application/gis-event-emitter.service';

@Module({
  imports: [CoreEngineModule, EventsModule, AuditModule],
  controllers: [GisController],
  providers: [
    GisEventEmitter,
    LayerDefinitionService,
    LayerProjectionService,
    SpatialOpsService,
    GeofenceService,
    GeoEventsService,
    RoutePlanService,
    GisAnalysisService,
    GisImportExportService,
    GisDashboardService,
    GisReportsService,
    GisMobileSyncService,
    BasemapService,
  ],
  exports: [LayerProjectionService, GeofenceService, SpatialOpsService, GisDashboardService],
})
export class EgsipModule {}
