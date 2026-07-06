-- EGSIP — Enterprise GIS & Spatial Intelligence Platform

CREATE TYPE "GisLayerStatus" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "GisAnalysisJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE "GisGeoEventType" AS ENUM (
  'geofence_enter',
  'geofence_exit',
  'location_change',
  'abnormal_movement',
  'visit_out_of_area',
  'wrong_lot_entry',
  'excessive_displacement'
);

CREATE TABLE "gis_layer_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "layer_code" VARCHAR(100) NOT NULL,
  "layer_name" VARCHAR(255) NOT NULL,
  "layer_type" VARCHAR(50) NOT NULL,
  "source_module" VARCHAR(50) NOT NULL,
  "source_query" JSONB NOT NULL DEFAULT '{}',
  "geometry_type" VARCHAR(50) NOT NULL,
  "style_rules" JSONB NOT NULL DEFAULT '{}',
  "min_zoom" INTEGER NOT NULL DEFAULT 0,
  "max_zoom" INTEGER NOT NULL DEFAULT 22,
  "refresh_interval_min" INTEGER NOT NULL DEFAULT 60,
  "status" "GisLayerStatus" NOT NULL DEFAULT 'draft',
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "gis_layer_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_layer_feature_projections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "layer_id" UUID NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" UUID NOT NULL,
  "geometry" JSONB NOT NULL,
  "properties" JSONB NOT NULL DEFAULT '{}',
  "centroid_lat" DECIMAL(10,7),
  "centroid_lng" DECIMAL(10,7),
  "bbox_min_lat" DECIMAL(10,7),
  "bbox_max_lat" DECIMAL(10,7),
  "bbox_min_lng" DECIMAL(10,7),
  "bbox_max_lng" DECIMAL(10,7),
  "refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_layer_feature_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_basemap_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "basemap_code" VARCHAR(50) NOT NULL,
  "basemap_name" VARCHAR(255) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "map_type" VARCHAR(50) NOT NULL,
  "url_template" TEXT NOT NULL,
  "attribution" TEXT,
  "default_for_org" BOOLEAN NOT NULL DEFAULT false,
  "offline_capable" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_basemap_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_geofence_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "geofence_code" VARCHAR(100) NOT NULL,
  "geofence_name" VARCHAR(255) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" UUID,
  "geometry_type" VARCHAR(50) NOT NULL,
  "geometry" JSONB NOT NULL,
  "radius_m" DECIMAL(12,2),
  "alert_on_enter" BOOLEAN NOT NULL DEFAULT true,
  "alert_on_exit" BOOLEAN NOT NULL DEFAULT true,
  "linked_policies" JSONB NOT NULL DEFAULT '[]',
  "status" VARCHAR(50) NOT NULL DEFAULT 'active',
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "gis_geofence_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_geo_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "geofence_id" UUID,
  "event_type" "GisGeoEventType" NOT NULL,
  "entity_type" VARCHAR(50),
  "entity_id" UUID,
  "user_id" UUID,
  "device_id" UUID,
  "location" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_geo_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_route_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "route_code" VARCHAR(100) NOT NULL,
  "route_name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
  "total_distance_km" DECIMAL(12,3),
  "estimated_minutes" INTEGER,
  "route_geometry" JSONB,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "gis_route_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_route_stops" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "route_plan_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "entity_type" VARCHAR(50),
  "entity_id" UUID,
  "stop_name" VARCHAR(255) NOT NULL,
  "location" JSONB NOT NULL,
  "eta" TIMESTAMPTZ,
  "actual_arrival" TIMESTAMPTZ,
  CONSTRAINT "gis_route_stops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_spatial_operation_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "operation_type" VARCHAR(50) NOT NULL,
  "input_geometry" JSONB,
  "output_geometry" JSONB,
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "result_scalar" DECIMAL(18,6),
  "result_unit" VARCHAR(20),
  "performed_by" UUID,
  "performed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_spatial_operation_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_territory_analysis_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "analysis_type" VARCHAR(50) NOT NULL,
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "status" "GisAnalysisJobStatus" NOT NULL DEFAULT 'pending',
  "result_ref" JSONB,
  "error_message" TEXT,
  "requested_by" UUID,
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_territory_analysis_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gis_imported_geo_layers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "layer_code" VARCHAR(100) NOT NULL,
  "source_format" VARCHAR(50) NOT NULL,
  "source_file_ref" VARCHAR(500),
  "feature_count" INTEGER NOT NULL DEFAULT 0,
  "srid" VARCHAR(20) NOT NULL DEFAULT 'EPSG:4326',
  "features" JSONB NOT NULL DEFAULT '[]',
  "imported_by" UUID,
  "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gis_imported_geo_layers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gis_layer_definitions_organization_id_layer_code_key" ON "gis_layer_definitions"("organization_id", "layer_code");
CREATE INDEX "gis_layer_definitions_organization_id_status_idx" ON "gis_layer_definitions"("organization_id", "status");
CREATE UNIQUE INDEX "gis_layer_feature_projections_layer_id_entity_type_entity_id_key" ON "gis_layer_feature_projections"("layer_id", "entity_type", "entity_id");
CREATE INDEX "gis_layer_feature_projections_layer_id_refreshed_at_idx" ON "gis_layer_feature_projections"("layer_id", "refreshed_at");
CREATE INDEX "gis_layer_feature_projections_organization_id_entity_type_idx" ON "gis_layer_feature_projections"("organization_id", "entity_type");
CREATE UNIQUE INDEX "gis_basemap_configs_organization_id_basemap_code_key" ON "gis_basemap_configs"("organization_id", "basemap_code");
CREATE UNIQUE INDEX "gis_geofence_definitions_organization_id_geofence_code_key" ON "gis_geofence_definitions"("organization_id", "geofence_code");
CREATE INDEX "gis_geofence_definitions_organization_id_entity_type_entity_id_idx" ON "gis_geofence_definitions"("organization_id", "entity_type", "entity_id");
CREATE INDEX "gis_geo_events_organization_id_event_type_occurred_at_idx" ON "gis_geo_events"("organization_id", "event_type", "occurred_at");
CREATE INDEX "gis_geo_events_geofence_id_occurred_at_idx" ON "gis_geo_events"("geofence_id", "occurred_at");
CREATE UNIQUE INDEX "gis_route_plans_organization_id_route_code_key" ON "gis_route_plans"("organization_id", "route_code");
CREATE UNIQUE INDEX "gis_route_stops_route_plan_id_sequence_key" ON "gis_route_stops"("route_plan_id", "sequence");
CREATE INDEX "gis_spatial_operation_logs_organization_id_operation_type_performed_at_idx" ON "gis_spatial_operation_logs"("organization_id", "operation_type", "performed_at");
CREATE INDEX "gis_territory_analysis_jobs_organization_id_status_created_at_idx" ON "gis_territory_analysis_jobs"("organization_id", "status", "created_at");
CREATE INDEX "gis_imported_geo_layers_organization_id_layer_code_idx" ON "gis_imported_geo_layers"("organization_id", "layer_code");

ALTER TABLE "gis_layer_definitions" ADD CONSTRAINT "gis_layer_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_layer_feature_projections" ADD CONSTRAINT "gis_layer_feature_projections_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "gis_layer_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gis_basemap_configs" ADD CONSTRAINT "gis_basemap_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_geofence_definitions" ADD CONSTRAINT "gis_geofence_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_geo_events" ADD CONSTRAINT "gis_geo_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_geo_events" ADD CONSTRAINT "gis_geo_events_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "gis_geofence_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gis_route_plans" ADD CONSTRAINT "gis_route_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_route_stops" ADD CONSTRAINT "gis_route_stops_route_plan_id_fkey" FOREIGN KEY ("route_plan_id") REFERENCES "gis_route_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gis_spatial_operation_logs" ADD CONSTRAINT "gis_spatial_operation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_territory_analysis_jobs" ADD CONSTRAINT "gis_territory_analysis_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gis_imported_geo_layers" ADD CONSTRAINT "gis_imported_geo_layers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
