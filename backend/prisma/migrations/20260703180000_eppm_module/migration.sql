-- EPPM — Enterprise Plugin Platform & Marketplace

CREATE TYPE "EppmPluginType" AS ENUM (
  'business_module', 'report', 'dashboard', 'integration', 'connector',
  'template', 'business_rule', 'workflow', 'widget', 'theme', 'language',
  'mobile_component', 'ai_service'
);

CREATE TYPE "EppmPackageStatus" AS ENUM ('draft', 'published', 'deprecated', 'archived');
CREATE TYPE "EppmInstallStatus" AS ENUM ('installed', 'enabled', 'disabled', 'updating', 'failed', 'uninstalled');
CREATE TYPE "EppmMarketplaceVisibility" AS ENUM ('public', 'private', 'org_only');
CREATE TYPE "EppmVendorType" AS ENUM ('official', 'partner', 'third_party', 'internal');
CREATE TYPE "EppmUpdateStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'rolled_back');

CREATE TABLE "eppm_plugin_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_key" VARCHAR(80) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eppm_plugin_categories_category_key_key" ON "eppm_plugin_categories"("category_key");

CREATE TABLE "eppm_plugin_packages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plugin_key" VARCHAR(120) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "vendor" VARCHAR(255) NOT NULL,
  "vendor_type" "EppmVendorType" NOT NULL DEFAULT 'official',
  "plugin_type" "EppmPluginType" NOT NULL,
  "category_key" VARCHAR(80) NOT NULL,
  "visibility" "EppmMarketplaceVisibility" NOT NULL DEFAULT 'public',
  "status" "EppmPackageStatus" NOT NULL DEFAULT 'draft',
  "current_version" VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "documentation" TEXT,
  "license" VARCHAR(100),
  "compatibility" JSONB NOT NULL DEFAULT '{}',
  "signature_hash" VARCHAR(128),
  "signature_verified" BOOLEAN NOT NULL DEFAULT false,
  "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rating_count" INTEGER NOT NULL DEFAULT 0,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "ai_readiness" JSONB NOT NULL DEFAULT '{}',
  "organization_id" UUID,
  "published_at" TIMESTAMPTZ,
  "created_by" UUID,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_packages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "eppm_plugin_packages_category_key_fkey" FOREIGN KEY ("category_key") REFERENCES "eppm_plugin_categories"("category_key") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_plugin_packages_plugin_key_key" ON "eppm_plugin_packages"("plugin_key");
CREATE INDEX "eppm_plugin_packages_status_visibility_plugin_type_idx" ON "eppm_plugin_packages"("status", "visibility", "plugin_type");
CREATE INDEX "eppm_plugin_packages_category_key_idx" ON "eppm_plugin_packages"("category_key");

CREATE TABLE "eppm_plugin_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plugin_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "changelog" TEXT,
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "package_url" VARCHAR(500),
  "checksum" VARCHAR(128),
  "min_platform_version" VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  "dependencies" JSONB NOT NULL DEFAULT '[]',
  "signature_hash" VARCHAR(128),
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_versions_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "eppm_plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_plugin_versions_plugin_id_version_key" ON "eppm_plugin_versions"("plugin_id", "version");

CREATE TABLE "eppm_plugin_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plugin_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "comment" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_reviews_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "eppm_plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eppm_plugin_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_plugin_reviews_plugin_id_organization_id_user_id_key" ON "eppm_plugin_reviews"("plugin_id", "organization_id", "user_id");
CREATE INDEX "eppm_plugin_reviews_plugin_id_created_at_idx" ON "eppm_plugin_reviews"("plugin_id", "created_at");

CREATE TABLE "eppm_extension_points" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "point_key" VARCHAR(120) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "plugin_type" "EppmPluginType" NOT NULL,
  "handler_interface" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_extension_points_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eppm_extension_points_point_key_key" ON "eppm_extension_points"("point_key");

CREATE TABLE "eppm_plugin_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plugin_id" UUID NOT NULL,
  "permission_key" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "scope" VARCHAR(30) NOT NULL DEFAULT 'org',
  CONSTRAINT "eppm_plugin_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_permissions_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "eppm_plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_plugin_permissions_plugin_id_permission_key_key" ON "eppm_plugin_permissions"("plugin_id", "permission_key");

CREATE TABLE "eppm_plugin_installs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "plugin_id" UUID NOT NULL,
  "plugin_key" VARCHAR(120) NOT NULL,
  "installed_version" VARCHAR(30) NOT NULL,
  "status" "EppmInstallStatus" NOT NULL DEFAULT 'installed',
  "config" JSONB NOT NULL DEFAULT '{}',
  "auto_update" BOOLEAN NOT NULL DEFAULT false,
  "previous_version" VARCHAR(30),
  "cloned_from_id" UUID,
  "installed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enabled_at" TIMESTAMPTZ,
  "disabled_at" TIMESTAMPTZ,
  "installed_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_installs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_installs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eppm_plugin_installs_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "eppm_plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_plugin_installs_organization_id_plugin_key_key" ON "eppm_plugin_installs"("organization_id", "plugin_key");
CREATE INDEX "eppm_plugin_installs_organization_id_status_idx" ON "eppm_plugin_installs"("organization_id", "status");

CREATE TABLE "eppm_plugin_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "plugin_key" VARCHAR(120) NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "eppm_plugin_audit_logs_organization_id_created_at_idx" ON "eppm_plugin_audit_logs"("organization_id", "created_at");
CREATE INDEX "eppm_plugin_audit_logs_plugin_key_created_at_idx" ON "eppm_plugin_audit_logs"("plugin_key", "created_at");

CREATE TABLE "eppm_plugin_update_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "install_id" UUID NOT NULL,
  "from_version" VARCHAR(30) NOT NULL,
  "to_version" VARCHAR(30) NOT NULL,
  "status" "EppmUpdateStatus" NOT NULL DEFAULT 'pending',
  "scheduled_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "rollback_version" VARCHAR(30),
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_plugin_update_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_plugin_update_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eppm_plugin_update_jobs_install_id_fkey" FOREIGN KEY ("install_id") REFERENCES "eppm_plugin_installs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eppm_plugin_update_jobs_organization_id_status_idx" ON "eppm_plugin_update_jobs"("organization_id", "status");

CREATE TABLE "eppm_developer_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "developer_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "contact_email" VARCHAR(255) NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "api_key_hash" VARCHAR(128),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eppm_developer_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eppm_developer_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eppm_developer_accounts_organization_id_developer_key_key" ON "eppm_developer_accounts"("organization_id", "developer_key");
