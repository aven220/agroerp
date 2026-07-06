-- UDFE — Universal Dynamic Forms Engine schema extension

DO $$ BEGIN
    ALTER TYPE "FormStatus" ADD VALUE IF NOT EXISTS 'in_review';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE "FormStatus" ADD VALUE IF NOT EXISTS 'approved';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE "FormStatus" ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TYPE "FormStatus" ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "sector_code" VARCHAR(50);
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "commodity_code" VARCHAR(50);
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "workflow_key" VARCHAR(100);
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "parent_version_id" UUID;
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "cloned_from_id" UUID;
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "ai_readiness" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "approved_by" UUID;
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ;
ALTER TABLE "form_definitions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "form_definitions_organization_id_deleted_at_idx" ON "form_definitions"("organization_id", "deleted_at");

ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "context" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "workflow_state" VARCHAR(50);
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "form_submissions_organization_id_workflow_state_idx" ON "form_submissions"("organization_id", "workflow_state");

CREATE TABLE IF NOT EXISTS "form_version_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "from_version" INTEGER NOT NULL,
    "to_version" INTEGER NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "actor_id" UUID,
    "reason_notes" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_version_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "form_version_history_form_id_occurred_at_idx" ON "form_version_history"("form_id", "occurred_at");

CREATE TABLE IF NOT EXISTS "form_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sector_code" VARCHAR(50),
    "schema" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "form_templates_organization_id_template_key_key" ON "form_templates"("organization_id", "template_key");

CREATE TABLE IF NOT EXISTS "form_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "assignee_type" VARCHAR(50) NOT NULL,
    "assignee_id" UUID NOT NULL,
    "context_type" VARCHAR(50),
    "context_id" UUID,
    "due_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "form_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "form_assignments_organization_id_assignee_id_status_idx" ON "form_assignments"("organization_id", "assignee_id", "status");

CREATE TABLE IF NOT EXISTS "form_import_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_import_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "form_kpi_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID,
    "kpi_code" VARCHAR(50) NOT NULL,
    "kpi_value" DECIMAL(18, 4) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_kpi_snapshots_pkey" PRIMARY KEY ("id")
);
