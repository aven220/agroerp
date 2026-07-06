-- FMDT — Field Management & Digital Twin Platform

DO $$ BEGIN
    CREATE TYPE "FieldLotStatus" AS ENUM ('draft', 'active', 'fallow', 'renovation', 'inactive', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FieldOperationStatus" AS ENUM ('recorded', 'verified', 'disputed', 'voided');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LotCostApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HarvestRecordStatus" AS ENUM ('open', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "field_lot_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ftip_lot_unit_id" UUID NOT NULL,
    "farm_unit_id" UUID NOT NULL,
    "parcel_id" UUID,
    "lot_code" VARCHAR(50) NOT NULL,
    "lot_name" VARCHAR(255) NOT NULL,
    "status" "FieldLotStatus" NOT NULL DEFAULT 'draft',
    "lot_type_code" VARCHAR(50) NOT NULL,
    "total_area_ha" DECIMAL(12, 4),
    "cultivable_area_ha" DECIMAL(12, 4),
    "planted_area_ha" DECIMAL(12, 4),
    "unproductive_area_ha" DECIMAL(12, 4),
    "centroid_latitude" DECIMAL(10, 7),
    "centroid_longitude" DECIMAL(10, 7),
    "boundary_geo_ref" JSONB,
    "altitude_m" DECIMAL(8, 2),
    "slope_pct" DECIMAL(6, 2),
    "aspect_code" VARCHAR(50),
    "soil_type_code" VARCHAR(50),
    "land_use_code" VARCHAR(50),
    "assigned_technician_id" UUID,
    "responsible_producer_id" UUID,
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
    "activated_at" TIMESTAMPTZ,
    "last_operation_at" TIMESTAMPTZ,
    "last_harvest_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "field_lot_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "field_lot_profiles_ftip_lot_unit_id_key" ON "field_lot_profiles"("ftip_lot_unit_id");
CREATE UNIQUE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_lot_code_key" ON "field_lot_profiles"("organization_id", "lot_code");
CREATE UNIQUE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_external_id_key" ON "field_lot_profiles"("organization_id", "external_id");
CREATE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_status_idx" ON "field_lot_profiles"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_farm_unit_id_idx" ON "field_lot_profiles"("organization_id", "farm_unit_id");
CREATE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_deleted_at_idx" ON "field_lot_profiles"("organization_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "field_lot_profiles_organization_id_sync_status_idx" ON "field_lot_profiles"("organization_id", "sync_status");

ALTER TABLE "field_lot_profiles" DROP CONSTRAINT IF EXISTS "field_lot_profiles_organization_id_fkey";
ALTER TABLE "field_lot_profiles" ADD CONSTRAINT "field_lot_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_lot_profiles" DROP CONSTRAINT IF EXISTS "field_lot_profiles_ftip_lot_unit_id_fkey";
ALTER TABLE "field_lot_profiles" ADD CONSTRAINT "field_lot_profiles_ftip_lot_unit_id_fkey" FOREIGN KEY ("ftip_lot_unit_id") REFERENCES "farm_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_lot_profiles" DROP CONSTRAINT IF EXISTS "field_lot_profiles_farm_unit_id_fkey";
ALTER TABLE "field_lot_profiles" ADD CONSTRAINT "field_lot_profiles_farm_unit_id_fkey" FOREIGN KEY ("farm_unit_id") REFERENCES "farm_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_lot_profiles" DROP CONSTRAINT IF EXISTS "field_lot_profiles_responsible_producer_id_fkey";
ALTER TABLE "field_lot_profiles" ADD CONSTRAINT "field_lot_profiles_responsible_producer_id_fkey" FOREIGN KEY ("responsible_producer_id") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_agronomic_states" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "ftip_crop_stand_id" UUID,
    "primary_crop_code" VARCHAR(50) NOT NULL,
    "variety_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "planting_date" DATE,
    "crop_age_years" DECIMAL(5, 2),
    "planting_pattern_code" VARCHAR(50),
    "density_plants_ha" INTEGER,
    "tree_count" INTEGER,
    "phenological_stage_code" VARCHAR(50),
    "expected_yield_kg_ha" DECIMAL(12, 2),
    "expected_production_kg" DECIMAL(14, 2),
    "irrigation_type_code" VARCHAR(50),
    "production_system_code" VARCHAR(50),
    "shade_type_code" VARCHAR(50),
    "last_soil_analysis_at" TIMESTAMPTZ,
    "last_foliar_analysis_at" TIMESTAMPTZ,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lot_agronomic_states_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_agronomic_states_field_lot_id_effective_from_idx" ON "lot_agronomic_states"("field_lot_id", "effective_from");
ALTER TABLE "lot_agronomic_states" DROP CONSTRAINT IF EXISTS "lot_agronomic_states_field_lot_id_fkey";
ALTER TABLE "lot_agronomic_states" ADD CONSTRAINT "lot_agronomic_states_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "field_operations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "operation_type_code" VARCHAR(50) NOT NULL,
    "operation_date" DATE NOT NULL,
    "performed_by_type" VARCHAR(50) NOT NULL,
    "performer_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "area_treated_ha" DECIMAL(12, 4) NOT NULL,
    "management_zone_op_id" UUID,
    "inputs_used" JSONB NOT NULL DEFAULT '[]',
    "equipment_used" JSONB NOT NULL DEFAULT '[]',
    "weather_conditions" JSONB NOT NULL DEFAULT '{}',
    "labor_cost" DECIMAL(14, 2),
    "input_cost" DECIMAL(14, 2),
    "equipment_cost" DECIMAL(14, 2),
    "transport_cost" DECIMAL(14, 2),
    "total_cost" DECIMAL(14, 2),
    "gps_geo" JSONB,
    "visit_id" UUID,
    "aitap_activity_id" UUID,
    "plan_line_id" UUID,
    "form_submission_id" UUID,
    "evidence_document_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signature_content_id" UUID,
    "status" "FieldOperationStatus" NOT NULL DEFAULT 'recorded',
    "void_reason" TEXT,
    "notes" TEXT,
    "external_id" VARCHAR(255),
    "recorded_by" UUID,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "field_operations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "field_operations_organization_id_external_id_key" ON "field_operations"("organization_id", "external_id");
CREATE INDEX IF NOT EXISTS "field_operations_field_lot_id_operation_date_idx" ON "field_operations"("field_lot_id", "operation_date");
CREATE INDEX IF NOT EXISTS "field_operations_organization_id_operation_type_code_idx" ON "field_operations"("organization_id", "operation_type_code");
ALTER TABLE "field_operations" DROP CONSTRAINT IF EXISTS "field_operations_field_lot_id_fkey";
ALTER TABLE "field_operations" ADD CONSTRAINT "field_operations_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_cost_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "campaign_code" VARCHAR(50) NOT NULL,
    "cost_category_code" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(14, 2) NOT NULL,
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "source_type" VARCHAR(50) NOT NULL,
    "field_operation_id" UUID,
    "description" TEXT,
    "approval_status" "LotCostApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "cost_date" DATE NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "lot_cost_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_cost_entries_field_lot_id_campaign_code_idx" ON "lot_cost_entries"("field_lot_id", "campaign_code");
CREATE INDEX IF NOT EXISTS "lot_cost_entries_organization_id_approval_status_idx" ON "lot_cost_entries"("organization_id", "approval_status");
ALTER TABLE "lot_cost_entries" DROP CONSTRAINT IF EXISTS "lot_cost_entries_field_lot_id_fkey";
ALTER TABLE "lot_cost_entries" ADD CONSTRAINT "lot_cost_entries_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lot_cost_entries" DROP CONSTRAINT IF EXISTS "lot_cost_entries_field_operation_id_fkey";
ALTER TABLE "lot_cost_entries" ADD CONSTRAINT "lot_cost_entries_field_operation_id_fkey" FOREIGN KEY ("field_operation_id") REFERENCES "field_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "harvest_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "campaign_code" VARCHAR(50) NOT NULL,
    "harvest_start_date" DATE,
    "harvest_end_date" DATE,
    "harvested_area_ha" DECIMAL(12, 4),
    "estimated_kg" DECIMAL(14, 2),
    "actual_kg" DECIMAL(14, 2),
    "yield_kg_ha" DECIMAL(12, 2),
    "quality_grade_code" VARCHAR(50),
    "field_operation_id" UUID,
    "status" "HarvestRecordStatus" NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "harvest_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "harvest_records_field_lot_id_campaign_code_idx" ON "harvest_records"("field_lot_id", "campaign_code");
ALTER TABLE "harvest_records" DROP CONSTRAINT IF EXISTS "harvest_records_field_lot_id_fkey";
ALTER TABLE "harvest_records" ADD CONSTRAINT "harvest_records_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_digital_twins" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_summary" VARCHAR(100),
    "variety_summary" VARCHAR(255),
    "production_ytd_kg" DECIMAL(14, 2),
    "production_last_campaign_kg" DECIMAL(14, 2),
    "avg_yield_kg_ha" DECIMAL(12, 2),
    "expected_yield_kg_ha" DECIMAL(12, 2),
    "total_cost_ytd" DECIMAL(14, 2),
    "cost_per_ha" DECIMAL(14, 2),
    "cost_per_kg" DECIMAL(14, 4),
    "revenue_ytd" DECIMAL(14, 2),
    "margin_pct" DECIMAL(8, 2),
    "margin_trend" VARCHAR(20),
    "quality_avg_score" DECIMAL(6, 2),
    "operations_count_ytd" INTEGER NOT NULL DEFAULT 0,
    "last_operation_type" VARCHAR(50),
    "pending_operations_count" INTEGER NOT NULL DEFAULT 0,
    "risk_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compliance_pct" INTEGER NOT NULL DEFAULT 0,
    "ndvi_latest" DECIMAL(6, 4),
    "soil_moisture_latest" DECIMAL(6, 2),
    "thematic_indicators" JSONB NOT NULL DEFAULT '{}',
    "timeline_preview" JSONB NOT NULL DEFAULT '[]',
    "monthly_production" JSONB NOT NULL DEFAULT '{}',
    "annual_production" JSONB NOT NULL DEFAULT '{}',
    "ai_projection" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "lot_digital_twins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lot_digital_twins_field_lot_id_key" ON "lot_digital_twins"("field_lot_id");
CREATE INDEX IF NOT EXISTS "lot_digital_twins_organization_id_idx" ON "lot_digital_twins"("organization_id");
ALTER TABLE "lot_digital_twins" DROP CONSTRAINT IF EXISTS "lot_digital_twins_field_lot_id_fkey";
ALTER TABLE "lot_digital_twins" ADD CONSTRAINT "lot_digital_twins_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "management_zone_ops" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "ftip_management_zone_id" UUID,
    "zone_code" VARCHAR(50) NOT NULL,
    "zone_name" VARCHAR(255) NOT NULL,
    "zone_type" VARCHAR(50) NOT NULL,
    "application_geo" JSONB,
    "area_ha" DECIMAL(12, 4),
    "recommendation_profile" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "management_zone_ops_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "management_zone_ops_field_lot_id_zone_code_key" ON "management_zone_ops"("field_lot_id", "zone_code");
ALTER TABLE "management_zone_ops" DROP CONSTRAINT IF EXISTS "management_zone_ops_field_lot_id_fkey";
ALTER TABLE "management_zone_ops" ADD CONSTRAINT "management_zone_ops_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_operations" DROP CONSTRAINT IF EXISTS "field_operations_management_zone_op_id_fkey";
ALTER TABLE "field_operations" ADD CONSTRAINT "field_operations_management_zone_op_id_fkey" FOREIGN KEY ("management_zone_op_id") REFERENCES "management_zone_ops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_sensor_bindings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "sensor_type" VARCHAR(50) NOT NULL,
    "external_device_id" VARCHAR(255) NOT NULL,
    "location_geo" JSONB,
    "alert_thresholds" JSONB NOT NULL DEFAULT '{}',
    "active_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_until" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lot_sensor_bindings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_sensor_bindings_field_lot_id_sensor_type_idx" ON "lot_sensor_bindings"("field_lot_id", "sensor_type");
ALTER TABLE "lot_sensor_bindings" DROP CONSTRAINT IF EXISTS "lot_sensor_bindings_field_lot_id_fkey";
ALTER TABLE "lot_sensor_bindings" ADD CONSTRAINT "lot_sensor_bindings_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_telemetry_readings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "metric_code" VARCHAR(50) NOT NULL,
    "value" DECIMAL(18, 4) NOT NULL,
    "unit" VARCHAR(20),
    "source" VARCHAR(50),
    "captured_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "lot_telemetry_readings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_telemetry_readings_field_lot_id_metric_code_captured_at_idx" ON "lot_telemetry_readings"("field_lot_id", "metric_code", "captured_at");
ALTER TABLE "lot_telemetry_readings" DROP CONSTRAINT IF EXISTS "lot_telemetry_readings_field_lot_id_fkey";
ALTER TABLE "lot_telemetry_readings" ADD CONSTRAINT "lot_telemetry_readings_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "document_type_code" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "media_type" VARCHAR(50),
    "gps_geo" JSONB,
    "captured_at" TIMESTAMPTZ,
    "verified_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "lot_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_documents_field_lot_id_document_type_code_idx" ON "lot_documents"("field_lot_id", "document_type_code");
ALTER TABLE "lot_documents" DROP CONSTRAINT IF EXISTS "lot_documents_field_lot_id_fkey";
ALTER TABLE "lot_documents" ADD CONSTRAINT "lot_documents_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "field_lot_lifecycle_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "from_status" "FieldLotStatus",
    "to_status" "FieldLotStatus" NOT NULL,
    "reason_code" VARCHAR(50),
    "reason_notes" TEXT,
    "actor_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "field_lot_lifecycle_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "field_lot_lifecycle_events_field_lot_id_occurred_at_idx" ON "field_lot_lifecycle_events"("field_lot_id", "occurred_at");
ALTER TABLE "field_lot_lifecycle_events" DROP CONSTRAINT IF EXISTS "field_lot_lifecycle_events_field_lot_id_fkey";
ALTER TABLE "field_lot_lifecycle_events" ADD CONSTRAINT "field_lot_lifecycle_events_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_geometry_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
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
    CONSTRAINT "lot_geometry_revisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_geometry_revisions_field_lot_id_occurred_at_idx" ON "lot_geometry_revisions"("field_lot_id", "occurred_at");
ALTER TABLE "lot_geometry_revisions" DROP CONSTRAINT IF EXISTS "lot_geometry_revisions_field_lot_id_fkey";
ALTER TABLE "lot_geometry_revisions" ADD CONSTRAINT "lot_geometry_revisions_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_kpi_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "kpi_code" VARCHAR(50) NOT NULL,
    "kpi_value" DECIMAL(18, 4) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lot_kpi_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_kpi_snapshots_field_lot_id_kpi_code_captured_at_idx" ON "lot_kpi_snapshots"("field_lot_id", "kpi_code", "captured_at");
ALTER TABLE "lot_kpi_snapshots" DROP CONSTRAINT IF EXISTS "lot_kpi_snapshots_field_lot_id_fkey";
ALTER TABLE "lot_kpi_snapshots" ADD CONSTRAINT "lot_kpi_snapshots_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_recommendations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID NOT NULL,
    "insight_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "confidence" DECIMAL(5, 4),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lot_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_recommendations_field_lot_id_insight_type_idx" ON "lot_recommendations"("field_lot_id", "insight_type");
ALTER TABLE "lot_recommendations" DROP CONSTRAINT IF EXISTS "lot_recommendations_field_lot_id_fkey";
ALTER TABLE "lot_recommendations" ADD CONSTRAINT "lot_recommendations_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lot_import_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "field_lot_id" UUID,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lot_import_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lot_import_logs_batch_id_idx" ON "lot_import_logs"("batch_id");
CREATE INDEX IF NOT EXISTS "lot_import_logs_organization_id_created_at_idx" ON "lot_import_logs"("organization_id", "created_at");
ALTER TABLE "lot_import_logs" DROP CONSTRAINT IF EXISTS "lot_import_logs_field_lot_id_fkey";
ALTER TABLE "lot_import_logs" ADD CONSTRAINT "lot_import_logs_field_lot_id_fkey" FOREIGN KEY ("field_lot_id") REFERENCES "field_lot_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
