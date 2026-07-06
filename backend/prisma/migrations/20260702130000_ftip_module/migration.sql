-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FarmUnitStatus" AS ENUM ('draft', 'under_validation', 'active', 'inactive', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "GeometryValidationStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "farm_units" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_code" VARCHAR(50) NOT NULL,
    "farm_name" VARCHAR(255) NOT NULL,
    "farm_type_code" VARCHAR(50) NOT NULL,
    "production_system_code" VARCHAR(50),
    "country_code" VARCHAR(10) NOT NULL DEFAULT 'CO',
    "department_code" VARCHAR(50),
    "municipality_code" VARCHAR(50),
    "vereda_code" VARCHAR(50),
    "street_address" VARCHAR(500),
    "access_notes" TEXT,
    "centroid_latitude" DECIMAL(10, 7),
    "centroid_longitude" DECIMAL(10, 7),
    "boundary_geo" JSONB,
    "active_geometry_id" UUID,
    "total_area_ha" DECIMAL(12, 4),
    "agricultural_area_ha" DECIMAL(12, 4),
    "forest_area_ha" DECIMAL(12, 4),
    "protected_area_ha" DECIMAL(12, 4),
    "infrastructure_area_ha" DECIMAL(12, 4),
    "altitude_min_m" INTEGER,
    "altitude_max_m" INTEGER,
    "avg_slope_pct" DECIMAL(6, 2),
    "tenure_type_code" VARCHAR(50),
    "legal_status_code" VARCHAR(50),
    "land_use_code" VARCHAR(50),
    "land_cover_code" VARCHAR(50),
    "climate_zone_code" VARCHAR(50),
    "soil_type_code" VARCHAR(50),
    "farm_administrator_id" UUID,
    "status" "FarmUnitStatus" NOT NULL DEFAULT 'draft',
    "geometry_confidence" VARCHAR(20),
    "photo_content_id" UUID,
    "signature_content_id" UUID,
    "observations" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "classifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ai_readiness" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "external_id" VARCHAR(255),
    "sync_status" "ResourceSyncStatus" NOT NULL DEFAULT 'synced',
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMPTZ,
    "last_geometry_change_at" TIMESTAMPTZ,
    "last_visit_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "farm_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_parcels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "parcel_code" VARCHAR(50) NOT NULL,
    "parcel_name" VARCHAR(255),
    "cadastral_number" VARCHAR(100),
    "boundary_geo" JSONB,
    "area_ha" DECIMAL(12, 4),
    "parent_parcel_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "farm_parcels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_lots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "parcel_id" UUID,
    "lot_code" VARCHAR(50) NOT NULL,
    "lot_name" VARCHAR(255),
    "boundary_geo" JSONB,
    "area_ha" DECIMAL(12, 4),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "farm_lots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crop_stands" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "lot_unit_id" UUID NOT NULL,
    "species_code" VARCHAR(50) NOT NULL,
    "variety_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "planting_date" DATE,
    "renovation_date" DATE,
    "density_plants_ha" INTEGER,
    "shade_type_code" VARCHAR(50),
    "irrigation_type_code" VARCHAR(50),
    "estimated_yield_kg_ha" DECIMAL(12, 2),
    "phenological_stage_code" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "valid_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "crop_stands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crop_stand_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "crop_stand_id" UUID NOT NULL,
    "campaign_id" VARCHAR(50),
    "harvested_area_ha" DECIMAL(12, 4),
    "estimated_kg" DECIMAL(14, 2),
    "delivered_kg" DECIMAL(14, 2),
    "quality_avg_score" DECIMAL(6, 2),
    "incidents_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crop_stand_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_geometries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "geometry_geo" JSONB NOT NULL,
    "capture_method" VARCHAR(50),
    "capture_accuracy_m" DECIMAL(8, 2),
    "calculated_area_ha" DECIMAL(12, 4),
    "validation_status" "GeometryValidationStatus" NOT NULL DEFAULT 'pending',
    "srid" INTEGER NOT NULL DEFAULT 4326,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "captured_by" UUID,
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territory_geometries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "geometry_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "from_geometry" JSONB,
    "to_geometry" JSONB NOT NULL,
    "from_area_ha" DECIMAL(12, 4),
    "to_area_ha" DECIMAL(12, 4),
    "reason_code" VARCHAR(50),
    "reason_notes" TEXT,
    "actor_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geometry_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "producer_territory_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "relationship_type" VARCHAR(50) NOT NULL DEFAULT 'owner',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMPTZ,
    "created_by" UUID,

    CONSTRAINT "producer_territory_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "document_type_code" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "media_type" VARCHAR(50),
    "gps_geo" JSONB,
    "captured_at" TIMESTAMPTZ,
    "captured_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "verified_by" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "territory_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_certifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "certification_scheme_code" VARCHAR(50) NOT NULL,
    "boundary_geo" JSONB,
    "certified_area_ha" DECIMAL(12, 4),
    "issued_at" DATE,
    "expires_at" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "document_content_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "territory_certifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "natural_resource_features" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "geometry_geo" JSONB,
    "protection_level" VARCHAR(50),
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "natural_resource_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "infrastructure_features" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "infra_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "geometry_geo" JSONB,
    "capacity_kg_day" DECIMAL(12, 2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infrastructure_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_risk_assessments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "risk_type_code" VARCHAR(50) NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL,
    "geometry_geo" JSONB,
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessed_by" UUID,

    CONSTRAINT "territory_risk_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_lifecycle_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "from_status" "FarmUnitStatus",
    "to_status" "FarmUnitStatus" NOT NULL,
    "reason_code" VARCHAR(50),
    "reason_notes" TEXT,
    "actor_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "geographic_attributes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "soil_type_code" VARCHAR(50),
    "ph" DECIMAL(4, 2),
    "organic_matter_pct" DECIMAL(6, 2),
    "avg_slope_pct" DECIMAL(6, 2),
    "rainfall_mm_year" DECIMAL(8, 2),
    "temperature_avg_c" DECIMAL(5, 2),
    "source" VARCHAR(50),
    "effective_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMPTZ,

    CONSTRAINT "geographic_attributes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_visit_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "visit_ref_id" UUID NOT NULL,
    "visit_type_code" VARCHAR(50),
    "visited_at" TIMESTAMPTZ NOT NULL,
    "technician_id" UUID,
    "notes" TEXT,

    CONSTRAINT "territory_visit_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_digital_twins" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_summary" VARCHAR(100),
    "producer_primary_id" UUID,
    "total_area_ha" DECIMAL(12, 4),
    "agricultural_area_ha" DECIMAL(12, 4),
    "lot_count" INTEGER NOT NULL DEFAULT 0,
    "active_crop_stand_count" INTEGER NOT NULL DEFAULT 0,
    "production_ytd_kg" DECIMAL(14, 2),
    "avg_yield_kg_ha" DECIMAL(12, 2),
    "quality_avg_score" DECIMAL(6, 2),
    "active_certification_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risk_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_visit_at" TIMESTAMPTZ,
    "document_completeness_pct" INTEGER NOT NULL DEFAULT 0,
    "thematic_indicators" JSONB NOT NULL DEFAULT '{}',
    "timeline_preview" JSONB NOT NULL DEFAULT '[]',
    "ai_projection" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "farm_digital_twins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "territory_kpi_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "kpi_code" VARCHAR(50) NOT NULL,
    "kpi_value" DECIMAL(18, 4) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territory_kpi_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_ai_insights" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "insight_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "confidence" DECIMAL(5, 4),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_ai_insights_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "farm_units_organization_id_farm_code_key" ON "farm_units"("organization_id", "farm_code");
CREATE UNIQUE INDEX IF NOT EXISTS "farm_units_organization_id_external_id_key" ON "farm_units"("organization_id", "external_id");
CREATE INDEX IF NOT EXISTS "farm_units_organization_id_status_idx" ON "farm_units"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "farm_units_organization_id_municipality_code_idx" ON "farm_units"("organization_id", "municipality_code");
CREATE INDEX IF NOT EXISTS "farm_units_organization_id_deleted_at_idx" ON "farm_units"("organization_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "farm_units_organization_id_sync_status_idx" ON "farm_units"("organization_id", "sync_status");

CREATE UNIQUE INDEX IF NOT EXISTS "farm_parcels_farm_unit_id_parcel_code_key" ON "farm_parcels"("farm_unit_id", "parcel_code");
CREATE INDEX IF NOT EXISTS "farm_parcels_organization_id_farm_unit_id_idx" ON "farm_parcels"("organization_id", "farm_unit_id");

CREATE UNIQUE INDEX IF NOT EXISTS "farm_lots_farm_unit_id_lot_code_key" ON "farm_lots"("farm_unit_id", "lot_code");
CREATE INDEX IF NOT EXISTS "farm_lots_organization_id_farm_unit_id_idx" ON "farm_lots"("organization_id", "farm_unit_id");

CREATE INDEX IF NOT EXISTS "crop_stands_farm_unit_id_lot_unit_id_idx" ON "crop_stands"("farm_unit_id", "lot_unit_id");

CREATE INDEX IF NOT EXISTS "crop_stand_history_crop_stand_id_captured_at_idx" ON "crop_stand_history"("crop_stand_id", "captured_at");

CREATE INDEX IF NOT EXISTS "territory_geometries_farm_unit_id_entity_type_entity_id_idx" ON "territory_geometries"("farm_unit_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "territory_geometries_organization_id_validation_status_idx" ON "territory_geometries"("organization_id", "validation_status");

CREATE INDEX IF NOT EXISTS "geometry_revisions_farm_unit_id_occurred_at_idx" ON "geometry_revisions"("farm_unit_id", "occurred_at");

CREATE UNIQUE INDEX IF NOT EXISTS "producer_territory_links_farm_unit_id_producer_id_key" ON "producer_territory_links"("farm_unit_id", "producer_id");
CREATE INDEX IF NOT EXISTS "producer_territory_links_producer_id_idx" ON "producer_territory_links"("producer_id");
CREATE INDEX IF NOT EXISTS "producer_territory_links_organization_id_farm_unit_id_idx" ON "producer_territory_links"("organization_id", "farm_unit_id");

CREATE INDEX IF NOT EXISTS "territory_documents_farm_unit_id_document_type_code_idx" ON "territory_documents"("farm_unit_id", "document_type_code");

CREATE INDEX IF NOT EXISTS "territory_certifications_farm_unit_id_expires_at_idx" ON "territory_certifications"("farm_unit_id", "expires_at");

CREATE INDEX IF NOT EXISTS "natural_resource_features_farm_unit_id_resource_type_idx" ON "natural_resource_features"("farm_unit_id", "resource_type");

CREATE INDEX IF NOT EXISTS "infrastructure_features_farm_unit_id_infra_type_idx" ON "infrastructure_features"("farm_unit_id", "infra_type");

CREATE INDEX IF NOT EXISTS "territory_risk_assessments_farm_unit_id_risk_type_code_idx" ON "territory_risk_assessments"("farm_unit_id", "risk_type_code");

CREATE INDEX IF NOT EXISTS "farm_lifecycle_events_farm_unit_id_occurred_at_idx" ON "farm_lifecycle_events"("farm_unit_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "geographic_attributes_farm_unit_id_effective_at_idx" ON "geographic_attributes"("farm_unit_id", "effective_at");

CREATE INDEX IF NOT EXISTS "territory_visit_links_farm_unit_id_visited_at_idx" ON "territory_visit_links"("farm_unit_id", "visited_at");

CREATE UNIQUE INDEX IF NOT EXISTS "farm_digital_twins_farm_unit_id_key" ON "farm_digital_twins"("farm_unit_id");
CREATE INDEX IF NOT EXISTS "farm_digital_twins_organization_id_idx" ON "farm_digital_twins"("organization_id");

CREATE INDEX IF NOT EXISTS "territory_kpi_snapshots_farm_unit_id_kpi_code_captured_at_idx" ON "territory_kpi_snapshots"("farm_unit_id", "kpi_code", "captured_at");

CREATE INDEX IF NOT EXISTS "farm_ai_insights_farm_unit_id_insight_type_idx" ON "farm_ai_insights"("farm_unit_id", "insight_type");

-- Foreign Keys
DO $$ BEGIN
    ALTER TABLE "farm_units" ADD CONSTRAINT "farm_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_parcels" ADD CONSTRAINT "farm_parcels_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_lots" ADD CONSTRAINT "farm_lots_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_lots" ADD CONSTRAINT "farm_lots_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "farm_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "crop_stands" ADD CONSTRAINT "crop_stands_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "crop_stands" ADD CONSTRAINT "crop_stands_lot_unit_id_fkey" FOREIGN KEY ("lot_unit_id") REFERENCES "farm_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "crop_stand_history" ADD CONSTRAINT "crop_stand_history_crop_stand_id_fkey" FOREIGN KEY ("crop_stand_id") REFERENCES "crop_stands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_geometries" ADD CONSTRAINT "territory_geometries_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "geometry_revisions" ADD CONSTRAINT "geometry_revisions_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "producer_territory_links" ADD CONSTRAINT "producer_territory_links_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "producer_territory_links" ADD CONSTRAINT "producer_territory_links_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_documents" ADD CONSTRAINT "territory_documents_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_certifications" ADD CONSTRAINT "territory_certifications_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "natural_resource_features" ADD CONSTRAINT "natural_resource_features_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "infrastructure_features" ADD CONSTRAINT "infrastructure_features_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_risk_assessments" ADD CONSTRAINT "territory_risk_assessments_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_lifecycle_events" ADD CONSTRAINT "farm_lifecycle_events_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "geographic_attributes" ADD CONSTRAINT "geographic_attributes_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_visit_links" ADD CONSTRAINT "territory_visit_links_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_digital_twins" ADD CONSTRAINT "farm_digital_twins_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "territory_kpi_snapshots" ADD CONSTRAINT "territory_kpi_snapshots_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "farm_ai_insights" ADD CONSTRAINT "farm_ai_insights_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
