-- CPEP Catalogs, Parameterization & Configuration

CREATE TYPE "CpepParameterScope" AS ENUM ('organization', 'purchase_center', 'producer', 'season', 'coffee_type', 'user', 'role');

CREATE TABLE "cpep_catalog_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "catalog_key" VARCHAR(80) NOT NULL,
    "entry_key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "code" VARCHAR(80),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_catalog_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_catalog_entries_organization_id_catalog_key_entry_key_key" ON "cpep_catalog_entries"("organization_id", "catalog_key", "entry_key");
CREATE INDEX "cpep_catalog_entries_organization_id_catalog_key_is_active_idx" ON "cpep_catalog_entries"("organization_id", "catalog_key", "is_active");
ALTER TABLE "cpep_catalog_entries" ADD CONSTRAINT "cpep_catalog_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cpep_parameters" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "parameter_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scope_type" "CpepParameterScope" NOT NULL DEFAULT 'organization',
    "scope_ref" VARCHAR(120),
    "value" JSONB NOT NULL DEFAULT '{}',
    "data_type" VARCHAR(40) NOT NULL DEFAULT 'json',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_parameters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_parameters_organization_id_parameter_key_scope_type_scope_ref_key" ON "cpep_parameters"("organization_id", "parameter_key", "scope_type", "scope_ref");
CREATE INDEX "cpep_parameters_organization_id_parameter_key_is_active_idx" ON "cpep_parameters"("organization_id", "parameter_key", "is_active");
ALTER TABLE "cpep_parameters" ADD CONSTRAINT "cpep_parameters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cpep_purchase_centers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "center_key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "center_type" VARCHAR(40) NOT NULL DEFAULT 'purchase',
    "address" VARCHAR(500),
    "municipality" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_purchase_centers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_purchase_centers_organization_id_center_key_key" ON "cpep_purchase_centers"("organization_id", "center_key");
ALTER TABLE "cpep_purchase_centers" ADD CONSTRAINT "cpep_purchase_centers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cpep_reception_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "purchase_center_id" UUID,
    "producer_id" UUID,
    "coffee_type_key" VARCHAR(80),
    "season_key" VARCHAR(80),
    "schedule_cron" VARCHAR(80),
    "open_time" VARCHAR(10),
    "close_time" VARCHAR(10),
    "max_tickets_day" INTEGER,
    "max_kg_day" DOUBLE PRECISION,
    "min_humidity_pct" DOUBLE PRECISION,
    "max_humidity_pct" DOUBLE PRECISION,
    "min_factor" DOUBLE PRECISION,
    "max_factor" DOUBLE PRECISION,
    "min_quality_score" DOUBLE PRECISION,
    "max_quality_score" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_reception_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_reception_rules_organization_id_rule_key_key" ON "cpep_reception_rules"("organization_id", "rule_key");
CREATE INDEX "cpep_reception_rules_organization_id_is_active_idx" ON "cpep_reception_rules"("organization_id", "is_active");
ALTER TABLE "cpep_reception_rules" ADD CONSTRAINT "cpep_reception_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_reception_rules" ADD CONSTRAINT "cpep_reception_rules_purchase_center_id_fkey" FOREIGN KEY ("purchase_center_id") REFERENCES "cpep_purchase_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "cpep_config_change_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_key" VARCHAR(160) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "purchase_center_id" UUID,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_config_change_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_config_change_logs_organization_id_entity_type_entity_key_created_at_idx" ON "cpep_config_change_logs"("organization_id", "entity_type", "entity_key", "created_at");
CREATE INDEX "cpep_config_change_logs_organization_id_created_at_idx" ON "cpep_config_change_logs"("organization_id", "created_at");
ALTER TABLE "cpep_config_change_logs" ADD CONSTRAINT "cpep_config_change_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
