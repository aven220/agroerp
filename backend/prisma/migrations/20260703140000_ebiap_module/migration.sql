-- EBIAP — Enterprise Business Intelligence & Analytics Platform

CREATE TYPE "BiDashboardStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "BiWidgetType" AS ENUM ('kpi', 'indicator', 'bar', 'line', 'area', 'pie', 'radar', 'treemap', 'heatmap', 'gauge', 'funnel', 'table', 'card', 'calendar', 'map', 'timeline', 'realtime');
CREATE TYPE "BiReportFormat" AS ENUM ('excel', 'csv', 'pdf', 'ods', 'json', 'xml');
CREATE TYPE "BiReportStatus" AS ENUM ('draft', 'published', 'scheduled', 'archived');
CREATE TYPE "BiKpiFrequency" AS ENUM ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly');

CREATE TABLE "bi_dashboards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "dashboard_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL DEFAULT 'custom',
    "status" "BiDashboardStatus" NOT NULL DEFAULT 'draft',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "bi_dashboards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_dashboard_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dashboard_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BiDashboardStatus" NOT NULL DEFAULT 'draft',
    "definition" JSONB NOT NULL DEFAULT '{}',
    "changelog" TEXT,
    "published_at" TIMESTAMPTZ,
    "published_by" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bi_dashboard_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_dashboard_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dashboard_id" UUID NOT NULL,
    "shared_with" UUID NOT NULL,
    "permission" VARCHAR(20) NOT NULL DEFAULT 'read',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bi_dashboard_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_kpi_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "kpi_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_value" DECIMAL(18,4),
    "goal_value" DECIMAL(18,4),
    "frequency" "BiKpiFrequency" NOT NULL DEFAULT 'daily',
    "color" VARCHAR(20),
    "alert_rules" JSONB NOT NULL DEFAULT '[]',
    "query_def" JSONB NOT NULL DEFAULT '{}',
    "responsible_id" UUID,
    "unit" VARCHAR(30),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "bi_kpi_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_kpi_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kpi_id" UUID NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "target_value" DECIMAL(18,4),
    "variance_pct" DECIMAL(8,2),
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "bi_kpi_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_report_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "report_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "BiReportStatus" NOT NULL DEFAULT 'draft',
    "query_def" JSONB NOT NULL DEFAULT '{}',
    "columns" JSONB NOT NULL DEFAULT '[]',
    "parameters" JSONB NOT NULL DEFAULT '[]',
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "bi_report_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_report_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "format" "BiReportFormat" NOT NULL DEFAULT 'json',
    "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB NOT NULL DEFAULT '{}',
    "export_path" VARCHAR(500),
    "executed_by" UUID,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER,
    CONSTRAINT "bi_report_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_query_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "query_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "data_source" VARCHAR(100) NOT NULL,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "parameters" JSONB NOT NULL DEFAULT '[]',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "bi_query_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bi_scheduled_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cron_expression" VARCHAR(100),
    "next_run_at" TIMESTAMPTZ NOT NULL,
    "format" "BiReportFormat" NOT NULL DEFAULT 'pdf',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bi_scheduled_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bi_dashboards_organization_id_dashboard_key_key" ON "bi_dashboards"("organization_id", "dashboard_key");
CREATE INDEX "bi_dashboards_organization_id_category_status_idx" ON "bi_dashboards"("organization_id", "category", "status");
CREATE UNIQUE INDEX "bi_dashboard_versions_dashboard_id_version_key" ON "bi_dashboard_versions"("dashboard_id", "version");
CREATE UNIQUE INDEX "bi_dashboard_shares_dashboard_id_shared_with_key" ON "bi_dashboard_shares"("dashboard_id", "shared_with");
CREATE UNIQUE INDEX "bi_kpi_definitions_organization_id_kpi_key_key" ON "bi_kpi_definitions"("organization_id", "kpi_key");
CREATE INDEX "bi_kpi_definitions_organization_id_active_idx" ON "bi_kpi_definitions"("organization_id", "active");
CREATE INDEX "bi_kpi_history_kpi_id_captured_at_idx" ON "bi_kpi_history"("kpi_id", "captured_at");
CREATE UNIQUE INDEX "bi_report_definitions_organization_id_report_key_key" ON "bi_report_definitions"("organization_id", "report_key");
CREATE INDEX "bi_report_definitions_organization_id_status_idx" ON "bi_report_definitions"("organization_id", "status");
CREATE INDEX "bi_report_runs_organization_id_executed_at_idx" ON "bi_report_runs"("organization_id", "executed_at");
CREATE UNIQUE INDEX "bi_query_definitions_organization_id_query_key_key" ON "bi_query_definitions"("organization_id", "query_key");
CREATE INDEX "bi_scheduled_reports_organization_id_active_next_run_at_idx" ON "bi_scheduled_reports"("organization_id", "active", "next_run_at");

ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_dashboard_versions" ADD CONSTRAINT "bi_dashboard_versions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_dashboard_shares" ADD CONSTRAINT "bi_dashboard_shares_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_kpi_definitions" ADD CONSTRAINT "bi_kpi_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_kpi_history" ADD CONSTRAINT "bi_kpi_history_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "bi_kpi_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_report_definitions" ADD CONSTRAINT "bi_report_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_report_runs" ADD CONSTRAINT "bi_report_runs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bi_report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_query_definitions" ADD CONSTRAINT "bi_query_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_scheduled_reports" ADD CONSTRAINT "bi_scheduled_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bi_report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
