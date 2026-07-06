-- EIAMP module

CREATE TYPE "IamMfaType" AS ENUM ('totp', 'email', 'sms', 'webauthn');
CREATE TYPE "IamSecurityEventType" AS ENUM ('login_success', 'login_failure', 'logout', 'mfa_challenge', 'mfa_success', 'password_change', 'password_reset', 'role_assigned', 'role_revoked', 'permission_changed', 'user_created', 'user_deleted', 'user_locked', 'privilege_elevation', 'session_revoked', 'access_denied', 'anomaly_detected');
CREATE TYPE "IamAnomalySeverity" AS ENUM ('low', 'medium', 'high', 'critical');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "iam_security_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "min_password_length" INTEGER NOT NULL DEFAULT 10,
    "require_uppercase" BOOLEAN NOT NULL DEFAULT true,
    "require_lowercase" BOOLEAN NOT NULL DEFAULT true,
    "require_numbers" BOOLEAN NOT NULL DEFAULT true,
    "require_symbols" BOOLEAN NOT NULL DEFAULT true,
    "password_expiry_days" INTEGER NOT NULL DEFAULT 90,
    "password_history_count" INTEGER NOT NULL DEFAULT 5,
    "max_failed_attempts" INTEGER NOT NULL DEFAULT 5,
    "lockout_minutes" INTEGER NOT NULL DEFAULT 30,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 480,
    "mfa_required" BOOLEAN NOT NULL DEFAULT false,
    "allowed_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_ip_ranges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocked_ip_ranges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_hours" JSONB NOT NULL DEFAULT '{}',
    "allowed_devices" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "iam_security_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_security_policies_organization_id_key" ON "iam_security_policies"("organization_id");

CREATE TABLE IF NOT EXISTS "iam_password_histories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_password_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_mfa_factors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "factor_type" "IamMfaType" NOT NULL,
    "secret_enc" VARCHAR(500),
    "label" VARCHAR(100),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "iam_mfa_factors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_webauthn_credentials" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credential_id" VARCHAR(500) NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "device_name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_webauthn_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_webauthn_credentials_credential_id_key" ON "iam_webauthn_credentials"("credential_id");

CREATE TABLE IF NOT EXISTS "iam_role_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "changelog" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_role_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_role_versions_role_id_version_key" ON "iam_role_versions"("role_id", "version");

CREATE TABLE IF NOT EXISTS "iam_temporary_roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_by" UUID,
    "reason" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_temporary_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_auth_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "failure_reason" VARCHAR(100),
    "country_code" VARCHAR(5),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_auth_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_security_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" "IamSecurityEventType" NOT NULL,
    "actor_id" UUID,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_security_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_anomaly_alerts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "alert_type" VARCHAR(80) NOT NULL,
    "severity" "IamAnomalySeverity" NOT NULL DEFAULT 'medium',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_anomaly_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "iam_field_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "field_path" VARCHAR(200) NOT NULL,
    "effect" VARCHAR(10) NOT NULL DEFAULT 'deny',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_field_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_field_policies_organization_id_resource_type_field_path_key" ON "iam_field_policies"("organization_id", "resource_type", "field_path");

CREATE TABLE IF NOT EXISTS "iam_row_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "policy_key" VARCHAR(100) NOT NULL,
    "effect" VARCHAR(10) NOT NULL DEFAULT 'allow',
    "attribute" VARCHAR(80) NOT NULL,
    "operator" VARCHAR(20) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_row_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_row_policies_organization_id_resource_type_policy_key_key" ON "iam_row_policies"("organization_id", "resource_type", "policy_key");

CREATE TABLE IF NOT EXISTS "iam_oauth_clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" VARCHAR(100) NOT NULL,
    "client_secret_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "redirect_uris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grant_types" TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token']::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_oauth_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_oauth_clients_organization_id_client_id_key" ON "iam_oauth_clients"("organization_id", "client_id");

CREATE TABLE IF NOT EXISTS "iam_sso_providers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_key" VARCHAR(100) NOT NULL,
    "provider_type" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "issuer_url" VARCHAR(500),
    "client_id" VARCHAR(255),
    "client_secret_ref" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_sso_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_sso_providers_organization_id_provider_key_key" ON "iam_sso_providers"("organization_id", "provider_key");

ALTER TABLE "iam_security_policies" ADD CONSTRAINT "iam_security_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_password_histories" ADD CONSTRAINT "iam_password_histories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_password_histories" ADD CONSTRAINT "iam_password_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_mfa_factors" ADD CONSTRAINT "iam_mfa_factors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_mfa_factors" ADD CONSTRAINT "iam_mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_webauthn_credentials" ADD CONSTRAINT "iam_webauthn_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_webauthn_credentials" ADD CONSTRAINT "iam_webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_role_versions" ADD CONSTRAINT "iam_role_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_role_versions" ADD CONSTRAINT "iam_role_versions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_temporary_roles" ADD CONSTRAINT "iam_temporary_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_temporary_roles" ADD CONSTRAINT "iam_temporary_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_temporary_roles" ADD CONSTRAINT "iam_temporary_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "iam_auth_attempts" ADD CONSTRAINT "iam_auth_attempts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "iam_auth_attempts" ADD CONSTRAINT "iam_auth_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "iam_security_events" ADD CONSTRAINT "iam_security_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_security_events" ADD CONSTRAINT "iam_security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "iam_anomaly_alerts" ADD CONSTRAINT "iam_anomaly_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_anomaly_alerts" ADD CONSTRAINT "iam_anomaly_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "iam_field_policies" ADD CONSTRAINT "iam_field_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_row_policies" ADD CONSTRAINT "iam_row_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_oauth_clients" ADD CONSTRAINT "iam_oauth_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iam_sso_providers" ADD CONSTRAINT "iam_sso_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
