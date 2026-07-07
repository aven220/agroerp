-- CreateTable
CREATE TABLE IF NOT EXISTS "form_campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "form_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "expected_count" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "form_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_campaigns_organization_id_code_key" ON "form_campaigns"("organization_id", "code");
CREATE INDEX IF NOT EXISTS "form_campaigns_organization_id_status_idx" ON "form_campaigns"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "form_campaigns_organization_id_form_id_idx" ON "form_campaigns"("organization_id", "form_id");

ALTER TABLE "form_campaigns" ADD CONSTRAINT "form_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_campaigns" ADD CONSTRAINT "form_campaigns_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
