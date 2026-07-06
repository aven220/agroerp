-- EAMIP module

CREATE TYPE "ApiDefinitionStatus" AS ENUM ('draft', 'published', 'deprecated', 'unpublished');
CREATE TYPE "ApiAuthType" AS ENUM ('none', 'api_key', 'oauth2', 'jwt', 'oidc');
CREATE TYPE "ApiClientStatus" AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE "ApiConnectorType" AS ENUM ('dian', 'bank', 'payment_gateway', 'email', 'sms', 'whatsapp', 'gis', 'weather', 'external_erp', 'crm', 'iot', 'auth_provider', 'custom');
CREATE TYPE "ApiHealthStatus" AS ENUM ('healthy', 'degraded', 'down', 'unknown');
CREATE TYPE "ApiBreakerState" AS ENUM ('closed', 'open', 'half_open');

CREATE TABLE "api_definitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "api_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "domain" VARCHAR(80) NOT NULL DEFAULT 'core',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApiDefinitionStatus" NOT NULL DEFAULT 'draft',
    "base_path" VARCHAR(255) NOT NULL,
    "module_ref" VARCHAR(80) NOT NULL,
    "auth_type" "ApiAuthType" NOT NULL DEFAULT 'api_key',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "open_api_spec" JSONB NOT NULL DEFAULT '{}',
    "cors_config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ,
    "deprecated_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "api_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "api_definition_id" UUID NOT NULL,
    "version" VARCHAR(30) NOT NULL,
    "status" "ApiDefinitionStatus" NOT NULL DEFAULT 'draft',
    "changelog" TEXT,
    "open_api_spec" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ,
    "deprecated_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_routes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "api_definition_id" UUID NOT NULL,
    "api_version_id" UUID,
    "route_key" VARCHAR(120) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "upstream_path" VARCHAR(500) NOT NULL,
    "module_ref" VARCHAR(80) NOT NULL,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "retry_count" INTEGER NOT NULL DEFAULT 2,
    "load_balance_strategy" VARCHAR(30) NOT NULL DEFAULT 'round_robin',
    "weight" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "ApiClientStatus" NOT NULL DEFAULT 'active',
    "owner_user_id" UUID,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 120,
    "rate_limit_per_day" INTEGER NOT NULL DEFAULT 50000,
    "whitelist_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blacklist_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_client_keys" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_client_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_connectors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connector_key" VARCHAR(100) NOT NULL,
    "connector_type" "ApiConnectorType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "base_url" VARCHAR(500),
    "auth_type" "ApiAuthType" NOT NULL DEFAULT 'api_key',
    "credential_ref" VARCHAR(100),
    "health_url" VARCHAR(500),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_request_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "api_definition_id" UUID,
    "route_key" VARCHAR(120),
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "module_ref" VARCHAR(80),
    "error_message" TEXT,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_circuit_breaker_states" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "route_key" VARCHAR(120) NOT NULL,
    "state" "ApiBreakerState" NOT NULL DEFAULT 'closed',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_failure_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_circuit_breaker_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_health_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_ref" VARCHAR(120) NOT NULL,
    "status" "ApiHealthStatus" NOT NULL DEFAULT 'unknown',
    "latency_ms" INTEGER,
    "details" JSONB NOT NULL DEFAULT '{}',
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_health_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_rate_limit_buckets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "window_key" VARCHAR(60) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "api_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_definitions_organization_id_api_key_key" ON "api_definitions"("organization_id", "api_key");
CREATE INDEX "api_definitions_organization_id_status_domain_idx" ON "api_definitions"("organization_id", "status", "domain");
CREATE UNIQUE INDEX "api_versions_api_definition_id_version_key" ON "api_versions"("api_definition_id", "version");
CREATE UNIQUE INDEX "api_routes_api_definition_id_route_key_key" ON "api_routes"("api_definition_id", "route_key");
CREATE INDEX "api_routes_organization_id_is_active_idx" ON "api_routes"("organization_id", "is_active");
CREATE UNIQUE INDEX "api_clients_organization_id_client_key_key" ON "api_clients"("organization_id", "client_key");
CREATE INDEX "api_client_keys_organization_id_key_prefix_idx" ON "api_client_keys"("organization_id", "key_prefix");
CREATE UNIQUE INDEX "api_connectors_organization_id_connector_key_key" ON "api_connectors"("organization_id", "connector_key");
CREATE INDEX "api_request_logs_organization_id_requested_at_idx" ON "api_request_logs"("organization_id", "requested_at");
CREATE INDEX "api_request_logs_organization_id_client_id_idx" ON "api_request_logs"("organization_id", "client_id");
CREATE INDEX "api_request_logs_organization_id_module_ref_idx" ON "api_request_logs"("organization_id", "module_ref");
CREATE UNIQUE INDEX "api_circuit_breaker_states_route_id_key" ON "api_circuit_breaker_states"("route_id");
CREATE INDEX "api_health_snapshots_organization_id_target_type_target_ref_idx" ON "api_health_snapshots"("organization_id", "target_type", "target_ref");
CREATE UNIQUE INDEX "api_rate_limit_buckets_organization_id_client_id_window_key_key" ON "api_rate_limit_buckets"("organization_id", "client_id", "window_key");

ALTER TABLE "api_definitions" ADD CONSTRAINT "api_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_versions" ADD CONSTRAINT "api_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_versions" ADD CONSTRAINT "api_versions_api_definition_id_fkey" FOREIGN KEY ("api_definition_id") REFERENCES "api_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_routes" ADD CONSTRAINT "api_routes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_routes" ADD CONSTRAINT "api_routes_api_definition_id_fkey" FOREIGN KEY ("api_definition_id") REFERENCES "api_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_routes" ADD CONSTRAINT "api_routes_api_version_id_fkey" FOREIGN KEY ("api_version_id") REFERENCES "api_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_client_keys" ADD CONSTRAINT "api_client_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_client_keys" ADD CONSTRAINT "api_client_keys_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "api_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_connectors" ADD CONSTRAINT "api_connectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "api_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_api_definition_id_fkey" FOREIGN KEY ("api_definition_id") REFERENCES "api_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "api_circuit_breaker_states" ADD CONSTRAINT "api_circuit_breaker_states_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_circuit_breaker_states" ADD CONSTRAINT "api_circuit_breaker_states_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "api_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_health_snapshots" ADD CONSTRAINT "api_health_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_rate_limit_buckets" ADD CONSTRAINT "api_rate_limit_buckets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
