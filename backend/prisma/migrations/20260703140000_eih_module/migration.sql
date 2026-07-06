-- EIH — Enterprise Integration Hub

CREATE TYPE "EihConnectorProtocol" AS ENUM ('rest', 'soap', 'graphql', 'grpc', 'sftp', 'ftp', 'email', 'database', 'message_queue', 'flat_file', 'webhook', 'proprietary');
CREATE TYPE "EihConnectorCategory" AS ENUM ('billing', 'tax_authority', 'bank', 'payment_gateway', 'external_erp', 'crm', 'accounting', 'weather', 'satellite', 'maps', 'iot', 'auth_service', 'digital_signature', 'messaging', 'storage', 'custom');
CREATE TYPE "EihConnectorStatus" AS ENUM ('draft', 'active', 'inactive', 'error', 'archived');
CREATE TYPE "EihAuthType" AS ENUM ('none', 'api_key', 'oauth2', 'jwt', 'basic', 'certificate', 'mutual_tls');
CREATE TYPE "EihDataFormat" AS ENUM ('json', 'xml', 'csv', 'excel', 'pdf', 'plain_text', 'geojson', 'protobuf');
CREATE TYPE "EihSyncMode" AS ENUM ('real_time', 'scheduled', 'incremental', 'full', 'bidirectional', 'unidirectional');
CREATE TYPE "EihSyncStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'partial', 'cancelled');
CREATE TYPE "EihFlowStatus" AS ENUM ('draft', 'published', 'paused', 'archived');
CREATE TYPE "EihErrorStatus" AS ENUM ('pending', 'retrying', 'resolved', 'dead_letter');

CREATE TABLE "eih_connector_catalog" (
    "id" UUID NOT NULL,
    "catalog_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "protocol" "EihConnectorProtocol" NOT NULL,
    "category" "EihConnectorCategory" NOT NULL,
    "config_schema" JSONB NOT NULL DEFAULT '{}',
    "handler_ref" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_connector_catalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_connector_catalog_catalog_key_key" ON "eih_connector_catalog"("catalog_key");

CREATE TABLE "eih_connectors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connector_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "protocol" "EihConnectorProtocol" NOT NULL,
    "category" "EihConnectorCategory" NOT NULL,
    "status" "EihConnectorStatus" NOT NULL DEFAULT 'draft',
    "auth_type" "EihAuthType" NOT NULL DEFAULT 'none',
    "data_format" "EihDataFormat" NOT NULL DEFAULT 'json',
    "sync_mode" "EihSyncMode" NOT NULL DEFAULT 'scheduled',
    "catalog_key" VARCHAR(100),
    "endpoint_url" VARCHAR(500),
    "config" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_sync_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "eih_connectors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_connectors_organization_id_connector_key_key" ON "eih_connectors"("organization_id", "connector_key");
CREATE INDEX "eih_connectors_organization_id_status_idx" ON "eih_connectors"("organization_id", "status");
ALTER TABLE "eih_connectors" ADD CONSTRAINT "eih_connectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eih_connector_credentials" (
    "id" UUID NOT NULL,
    "connector_id" UUID NOT NULL,
    "credential_type" VARCHAR(50) NOT NULL,
    "secret_hash" VARCHAR(128) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ,
    "rotated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_connector_credentials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eih_connector_credentials_connector_id_is_active_idx" ON "eih_connector_credentials"("connector_id", "is_active");
ALTER TABLE "eih_connector_credentials" ADD CONSTRAINT "eih_connector_credentials_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "eih_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "eih_integration_flows" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "flow_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "EihFlowStatus" NOT NULL DEFAULT 'draft',
    "source_connector_id" UUID,
    "target_connector_id" UUID,
    "sync_mode" "EihSyncMode" NOT NULL DEFAULT 'scheduled',
    "schedule_cron" VARCHAR(80),
    "routing_rules" JSONB NOT NULL DEFAULT '[]',
    "validation_rules" JSONB NOT NULL DEFAULT '[]',
    "definition" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "eih_integration_flows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_integration_flows_organization_id_flow_key_key" ON "eih_integration_flows"("organization_id", "flow_key");
CREATE INDEX "eih_integration_flows_organization_id_status_idx" ON "eih_integration_flows"("organization_id", "status");
ALTER TABLE "eih_integration_flows" ADD CONSTRAINT "eih_integration_flows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eih_integration_flows" ADD CONSTRAINT "eih_integration_flows_source_connector_id_fkey" FOREIGN KEY ("source_connector_id") REFERENCES "eih_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eih_integration_flows" ADD CONSTRAINT "eih_integration_flows_target_connector_id_fkey" FOREIGN KEY ("target_connector_id") REFERENCES "eih_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eih_flow_steps" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "step_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "eih_flow_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_flow_steps_flow_id_step_key_key" ON "eih_flow_steps"("flow_id", "step_key");
ALTER TABLE "eih_flow_steps" ADD CONSTRAINT "eih_flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "eih_integration_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "eih_field_mappings" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "source_field" VARCHAR(200) NOT NULL,
    "target_field" VARCHAR(200) NOT NULL,
    "transform" VARCHAR(200),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" VARCHAR(500),
    CONSTRAINT "eih_field_mappings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eih_field_mappings_flow_id_idx" ON "eih_field_mappings"("flow_id");
ALTER TABLE "eih_field_mappings" ADD CONSTRAINT "eih_field_mappings_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "eih_integration_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "eih_transform_rules" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "input_format" "EihDataFormat" NOT NULL,
    "output_format" "EihDataFormat" NOT NULL,
    "expression" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "eih_transform_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_transform_rules_flow_id_rule_key_key" ON "eih_transform_rules"("flow_id", "rule_key");
ALTER TABLE "eih_transform_rules" ADD CONSTRAINT "eih_transform_rules_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "eih_integration_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "eih_sync_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "flow_id" UUID,
    "connector_id" UUID,
    "run_key" VARCHAR(120) NOT NULL,
    "sync_mode" "EihSyncMode" NOT NULL,
    "status" "EihSyncStatus" NOT NULL DEFAULT 'pending',
    "records_in" INTEGER NOT NULL DEFAULT 0,
    "records_out" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "error_summary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_sync_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_sync_runs_organization_id_run_key_key" ON "eih_sync_runs"("organization_id", "run_key");
CREATE INDEX "eih_sync_runs_organization_id_status_created_at_idx" ON "eih_sync_runs"("organization_id", "status", "created_at");
ALTER TABLE "eih_sync_runs" ADD CONSTRAINT "eih_sync_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eih_sync_runs" ADD CONSTRAINT "eih_sync_runs_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "eih_integration_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eih_sync_runs" ADD CONSTRAINT "eih_sync_runs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "eih_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eih_sync_errors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sync_run_id" UUID NOT NULL,
    "connector_id" UUID,
    "error_key" VARCHAR(120) NOT NULL,
    "status" "EihErrorStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_sync_errors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eih_sync_errors_organization_id_status_created_at_idx" ON "eih_sync_errors"("organization_id", "status", "created_at");
ALTER TABLE "eih_sync_errors" ADD CONSTRAINT "eih_sync_errors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eih_sync_errors" ADD CONSTRAINT "eih_sync_errors_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "eih_sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eih_sync_errors" ADD CONSTRAINT "eih_sync_errors_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "eih_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "eih_webhook_endpoints" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "endpoint_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "secret_hash" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connector_id" UUID,
    "flow_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eih_webhook_endpoints_organization_id_endpoint_key_key" ON "eih_webhook_endpoints"("organization_id", "endpoint_key");
ALTER TABLE "eih_webhook_endpoints" ADD CONSTRAINT "eih_webhook_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "eih_integration_audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_key" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eih_integration_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eih_integration_audit_logs_organization_id_created_at_idx" ON "eih_integration_audit_logs"("organization_id", "created_at");
ALTER TABLE "eih_integration_audit_logs" ADD CONSTRAINT "eih_integration_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
