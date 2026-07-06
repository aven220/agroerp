-- EOP — Enterprise Observability Platform

CREATE TYPE "EopLogLevel" AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
CREATE TYPE "EopComponentType" AS ENUM ('frontend', 'backend', 'android', 'worker', 'job', 'scheduler', 'workflow', 'integration', 'plugin', 'iot', 'ai', 'gis', 'api_gateway', 'auth', 'database', 'redis', 'minio', 'broker', 'external');
CREATE TYPE "EopHealthStatus" AS ENUM ('healthy', 'degraded', 'unhealthy', 'unknown');
CREATE TYPE "EopAlertSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "EopAlertStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'suppressed');
CREATE TYPE "EopIncidentStatus" AS ENUM ('open', 'investigating', 'mitigated', 'resolved', 'closed');
CREATE TYPE "EopMetricKind" AS ENUM ('cpu', 'ram', 'disk', 'network', 'latency', 'errors', 'response_time', 'tps', 'active_users', 'connections', 'module_usage', 'org_usage', 'api_usage', 'custom');

CREATE TABLE "eop_log_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "log_key" VARCHAR(120) NOT NULL,
    "level" "EopLogLevel" NOT NULL DEFAULT 'info',
    "component" "EopComponentType" NOT NULL,
    "service_name" VARCHAR(120) NOT NULL,
    "message" TEXT NOT NULL,
    "trace_id" VARCHAR(64),
    "span_id" VARCHAR(32),
    "user_id" UUID,
    "request_id" VARCHAR(64),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_log_entries_organization_id_recorded_at_idx" ON "eop_log_entries"("organization_id", "recorded_at");
CREATE INDEX "eop_log_entries_trace_id_idx" ON "eop_log_entries"("trace_id");
CREATE INDEX "eop_log_entries_component_level_recorded_at_idx" ON "eop_log_entries"("component", "level", "recorded_at");
ALTER TABLE "eop_log_entries" ADD CONSTRAINT "eop_log_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_trace_spans" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "trace_id" VARCHAR(64) NOT NULL,
    "span_id" VARCHAR(32) NOT NULL,
    "parent_span_id" VARCHAR(32),
    "name" VARCHAR(255) NOT NULL,
    "component" "EopComponentType" NOT NULL,
    "service_name" VARCHAR(120) NOT NULL,
    "status_code" VARCHAR(20) NOT NULL DEFAULT 'ok',
    "duration_ms" INTEGER NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_trace_spans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_trace_spans_trace_id_started_at_idx" ON "eop_trace_spans"("trace_id", "started_at");
CREATE INDEX "eop_trace_spans_organization_id_started_at_idx" ON "eop_trace_spans"("organization_id", "started_at");
CREATE INDEX "eop_trace_spans_service_name_started_at_idx" ON "eop_trace_spans"("service_name", "started_at");
ALTER TABLE "eop_trace_spans" ADD CONSTRAINT "eop_trace_spans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_metric_samples" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "metric_key" VARCHAR(120) NOT NULL,
    "kind" "EopMetricKind" NOT NULL,
    "service_name" VARCHAR(120),
    "module_key" VARCHAR(80),
    "api_path" VARCHAR(255),
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(40),
    "labels" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_metric_samples_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_metric_samples_organization_id_kind_recorded_at_idx" ON "eop_metric_samples"("organization_id", "kind", "recorded_at");
CREATE INDEX "eop_metric_samples_metric_key_recorded_at_idx" ON "eop_metric_samples"("metric_key", "recorded_at");
ALTER TABLE "eop_metric_samples" ADD CONSTRAINT "eop_metric_samples_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_health_checks" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "check_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "check_type" VARCHAR(40) NOT NULL,
    "component" "EopComponentType" NOT NULL,
    "status" "EopHealthStatus" NOT NULL DEFAULT 'unknown',
    "latency_ms" INTEGER,
    "message" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_health_checks_check_key_checked_at_idx" ON "eop_health_checks"("check_key", "checked_at");
CREATE INDEX "eop_health_checks_status_checked_at_idx" ON "eop_health_checks"("status", "checked_at");
ALTER TABLE "eop_health_checks" ADD CONSTRAINT "eop_health_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_alert_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "severity" "EopAlertSeverity" NOT NULL DEFAULT 'warning',
    "component" "EopComponentType",
    "metric_kind" "EopMetricKind",
    "operator" VARCHAR(20) NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "window_seconds" INTEGER NOT NULL DEFAULT 300,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "eop_alert_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eop_alert_rules_organization_id_rule_key_key" ON "eop_alert_rules"("organization_id", "rule_key");
ALTER TABLE "eop_alert_rules" ADD CONSTRAINT "eop_alert_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eop_alerts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_id" UUID,
    "alert_key" VARCHAR(120) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "EopAlertSeverity" NOT NULL DEFAULT 'warning',
    "status" "EopAlertStatus" NOT NULL DEFAULT 'open',
    "component" "EopComponentType",
    "service_name" VARCHAR(120),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_alerts_organization_id_status_created_at_idx" ON "eop_alerts"("organization_id", "status", "created_at");
ALTER TABLE "eop_alerts" ADD CONSTRAINT "eop_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eop_alerts" ADD CONSTRAINT "eop_alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "eop_alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_incidents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "incident_key" VARCHAR(120) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "EopIncidentStatus" NOT NULL DEFAULT 'open',
    "severity" "EopAlertSeverity" NOT NULL DEFAULT 'warning',
    "component" "EopComponentType",
    "service_name" VARCHAR(120),
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "assigned_to" UUID,
    "resolved_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "eop_incidents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eop_incidents_organization_id_incident_key_key" ON "eop_incidents"("organization_id", "incident_key");
CREATE INDEX "eop_incidents_organization_id_status_created_at_idx" ON "eop_incidents"("organization_id", "status", "created_at");
ALTER TABLE "eop_incidents" ADD CONSTRAINT "eop_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eop_service_nodes" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "node_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "component" "EopComponentType" NOT NULL,
    "status" "EopHealthStatus" NOT NULL DEFAULT 'unknown',
    "version" VARCHAR(40),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "eop_service_nodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eop_service_nodes_node_key_key" ON "eop_service_nodes"("node_key");
CREATE INDEX "eop_service_nodes_organization_id_idx" ON "eop_service_nodes"("organization_id");
ALTER TABLE "eop_service_nodes" ADD CONSTRAINT "eop_service_nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_service_dependencies" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "source_node_id" UUID NOT NULL,
    "target_node_id" UUID NOT NULL,
    "dependency_type" VARCHAR(40) NOT NULL DEFAULT 'calls',
    "latency_ms_avg" DOUBLE PRECISION,
    "error_rate" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "eop_service_dependencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eop_service_dependencies_source_node_id_target_node_id_dependency_type_key" ON "eop_service_dependencies"("source_node_id", "target_node_id", "dependency_type");
ALTER TABLE "eop_service_dependencies" ADD CONSTRAINT "eop_service_dependencies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eop_service_dependencies" ADD CONSTRAINT "eop_service_dependencies_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "eop_service_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eop_service_dependencies" ADD CONSTRAINT "eop_service_dependencies_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "eop_service_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "eop_synthetic_checks" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "check_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target_url" VARCHAR(500) NOT NULL,
    "method" VARCHAR(10) NOT NULL DEFAULT 'GET',
    "expected_status" INTEGER NOT NULL DEFAULT 200,
    "status" "EopHealthStatus" NOT NULL DEFAULT 'unknown',
    "latency_ms" INTEGER,
    "last_run_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_synthetic_checks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eop_synthetic_checks_organization_id_check_key_key" ON "eop_synthetic_checks"("organization_id", "check_key");
ALTER TABLE "eop_synthetic_checks" ADD CONSTRAINT "eop_synthetic_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_rum_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "session_id" VARCHAR(64) NOT NULL,
    "user_id" UUID,
    "page_path" VARCHAR(500) NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "duration_ms" INTEGER,
    "user_agent" VARCHAR(500),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_rum_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_rum_events_organization_id_recorded_at_idx" ON "eop_rum_events"("organization_id", "recorded_at");
CREATE INDEX "eop_rum_events_session_id_idx" ON "eop_rum_events"("session_id");
ALTER TABLE "eop_rum_events" ADD CONSTRAINT "eop_rum_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_error_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "error_key" VARCHAR(120) NOT NULL,
    "component" "EopComponentType" NOT NULL,
    "service_name" VARCHAR(120) NOT NULL,
    "message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "trace_id" VARCHAR(64),
    "fingerprint" VARCHAR(64),
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_error_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_error_events_organization_id_last_seen_at_idx" ON "eop_error_events"("organization_id", "last_seen_at");
CREATE INDEX "eop_error_events_fingerprint_idx" ON "eop_error_events"("fingerprint");
ALTER TABLE "eop_error_events" ADD CONSTRAINT "eop_error_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eop_ai_usage_metrics" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "model_key" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "quality_score" DOUBLE PRECISION,
    "error_message" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_ai_usage_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_ai_usage_metrics_organization_id_recorded_at_idx" ON "eop_ai_usage_metrics"("organization_id", "recorded_at");
ALTER TABLE "eop_ai_usage_metrics" ADD CONSTRAINT "eop_ai_usage_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eop_audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "event_key" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_key" VARCHAR(120) NOT NULL,
    "user_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_audit_events_organization_id_created_at_idx" ON "eop_audit_events"("organization_id", "created_at");
ALTER TABLE "eop_audit_events" ADD CONSTRAINT "eop_audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eop_mobile_telemetries" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "device_id" VARCHAR(120) NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "message" TEXT,
    "stack_trace" TEXT,
    "duration_ms" INTEGER,
    "is_offline" BOOLEAN NOT NULL DEFAULT false,
    "app_version" VARCHAR(40),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eop_mobile_telemetries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eop_mobile_telemetries_organization_id_recorded_at_idx" ON "eop_mobile_telemetries"("organization_id", "recorded_at");
CREATE INDEX "eop_mobile_telemetries_device_id_recorded_at_idx" ON "eop_mobile_telemetries"("device_id", "recorded_at");
ALTER TABLE "eop_mobile_telemetries" ADD CONSTRAINT "eop_mobile_telemetries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
