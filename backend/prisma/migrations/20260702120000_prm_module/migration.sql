-- CreateEnum
CREATE TYPE "ProducerLifecycleStatus" AS ENUM ('draft', 'pre_registered', 'pending_approval', 'active', 'suspended', 'inactive', 'archived');

-- CreateTable
CREATE TABLE "producers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_number" VARCHAR(50) NOT NULL,
    "producer_type_code" VARCHAR(50) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "commercial_name" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "document_type_code" VARCHAR(50) NOT NULL,
    "document_number" VARCHAR(50) NOT NULL,
    "tax_id" VARCHAR(50),
    "birth_date" DATE,
    "gender_code" VARCHAR(50),
    "marital_status_code" VARCHAR(50),
    "nationality_code" VARCHAR(50),
    "primary_language_code" VARCHAR(50),
    "education_level_code" VARCHAR(50),
    "ethnic_group_code" VARCHAR(50),
    "lifecycle_status" "ProducerLifecycleStatus" NOT NULL DEFAULT 'draft',
    "category_code" VARCHAR(50),
    "lead_source_code" VARCHAR(50),
    "years_experience" INTEGER,
    "photo_content_id" UUID,
    "signature_content_id" UUID,
    "tax_regime_code" VARCHAR(50),
    "payment_preference_code" VARCHAR(50),
    "assigned_buyer_id" UUID,
    "assigned_technician_id" UUID,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "lifetime_value_score" DECIMAL(18,2),
    "municipality_code" VARCHAR(50),
    "vereda_code" VARCHAR(50),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "golden_record_version" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "external_id" VARCHAR(255),
    "sync_status" "ResourceSyncStatus" NOT NULL DEFAULT 'synced',
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMPTZ,
    "last_activity_at" TIMESTAMPTZ,
    "last_visit_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "contact_type_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "external_id" VARCHAR(255),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "producer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_addresses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "address_type_code" VARCHAR(50) NOT NULL,
    "line1" VARCHAR(500) NOT NULL,
    "line2" VARCHAR(500),
    "municipality_code" VARCHAR(50),
    "vereda_code" VARCHAR(50),
    "department_code" VARCHAR(50),
    "country_code" VARCHAR(10) NOT NULL DEFAULT 'CO',
    "postal_code" VARCHAR(20),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "gps_accuracy_m" DECIMAL(8,2),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "external_id" VARCHAR(255),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "producer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_lifecycle_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "from_status" "ProducerLifecycleStatus",
    "to_status" "ProducerLifecycleStatus" NOT NULL,
    "reason_code" VARCHAR(50),
    "reason_notes" TEXT,
    "actor_id" UUID,
    "event_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producer_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_certifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "scheme_code" VARCHAR(50) NOT NULL,
    "certificate_number" VARCHAR(100),
    "issued_at" DATE,
    "expires_at" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "document_content_id" UUID,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "producer_certifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "document_type_code" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "producer_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_communications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "channel_code" VARCHAR(50) NOT NULL,
    "direction" VARCHAR(20) NOT NULL DEFAULT 'outbound',
    "subject" VARCHAR(500),
    "body" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producer_communications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_notes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "producer_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "assignment_type" VARCHAR(50) NOT NULL,
    "assignee_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ,
    "reason" TEXT,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producer_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_farm_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "farm_resource_id" UUID NOT NULL,
    "role_code" VARCHAR(50) NOT NULL DEFAULT 'owner',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMPTZ,
    "created_by" UUID,
    CONSTRAINT "producer_farm_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_segments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "is_dynamic" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "producer_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_segment_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'rule',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producer_segment_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producer_indicator_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "lifetime_value" DECIMAL(18,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producer_indicator_snapshots_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "producers_organization_id_producer_number_key" ON "producers"("organization_id", "producer_number");
CREATE UNIQUE INDEX "producers_organization_id_document_number_key" ON "producers"("organization_id", "document_number");
CREATE UNIQUE INDEX "producers_organization_id_external_id_key" ON "producers"("organization_id", "external_id");
CREATE INDEX "producers_organization_id_lifecycle_status_idx" ON "producers"("organization_id", "lifecycle_status");
CREATE INDEX "producers_organization_id_municipality_code_idx" ON "producers"("organization_id", "municipality_code");
CREATE INDEX "producers_organization_id_assigned_buyer_id_idx" ON "producers"("organization_id", "assigned_buyer_id");
CREATE INDEX "producers_organization_id_assigned_technician_id_idx" ON "producers"("organization_id", "assigned_technician_id");
CREATE INDEX "producers_organization_id_sync_status_idx" ON "producers"("organization_id", "sync_status");
CREATE INDEX "producers_organization_id_deleted_at_idx" ON "producers"("organization_id", "deleted_at");

CREATE INDEX "producer_contacts_producer_id_idx" ON "producer_contacts"("producer_id");
CREATE INDEX "producer_contacts_organization_id_external_id_idx" ON "producer_contacts"("organization_id", "external_id");
CREATE INDEX "producer_addresses_producer_id_idx" ON "producer_addresses"("producer_id");
CREATE INDEX "producer_addresses_organization_id_municipality_code_idx" ON "producer_addresses"("organization_id", "municipality_code");
CREATE INDEX "producer_lifecycle_events_producer_id_occurred_at_idx" ON "producer_lifecycle_events"("producer_id", "occurred_at");
CREATE INDEX "producer_lifecycle_events_organization_id_occurred_at_idx" ON "producer_lifecycle_events"("organization_id", "occurred_at");
CREATE INDEX "producer_certifications_producer_id_idx" ON "producer_certifications"("producer_id");
CREATE INDEX "producer_certifications_organization_id_expires_at_idx" ON "producer_certifications"("organization_id", "expires_at");
CREATE INDEX "producer_documents_producer_id_idx" ON "producer_documents"("producer_id");
CREATE INDEX "producer_communications_producer_id_occurred_at_idx" ON "producer_communications"("producer_id", "occurred_at");
CREATE INDEX "producer_notes_producer_id_created_at_idx" ON "producer_notes"("producer_id", "created_at");
CREATE INDEX "producer_assignments_producer_id_assignment_type_idx" ON "producer_assignments"("producer_id", "assignment_type");
CREATE INDEX "producer_assignments_assignee_id_assignment_type_idx" ON "producer_assignments"("assignee_id", "assignment_type");
CREATE UNIQUE INDEX "producer_farm_links_producer_id_farm_resource_id_key" ON "producer_farm_links"("producer_id", "farm_resource_id");
CREATE INDEX "producer_farm_links_organization_id_farm_resource_id_idx" ON "producer_farm_links"("organization_id", "farm_resource_id");
CREATE UNIQUE INDEX "producer_segments_organization_id_slug_key" ON "producer_segments"("organization_id", "slug");
CREATE UNIQUE INDEX "producer_segment_memberships_segment_id_producer_id_key" ON "producer_segment_memberships"("segment_id", "producer_id");
CREATE INDEX "producer_segment_memberships_producer_id_idx" ON "producer_segment_memberships"("producer_id");
CREATE INDEX "producer_indicator_snapshots_producer_id_captured_at_idx" ON "producer_indicator_snapshots"("producer_id", "captured_at");

-- Foreign Keys
ALTER TABLE "producers" ADD CONSTRAINT "producers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "producer_contacts" ADD CONSTRAINT "producer_contacts_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_addresses" ADD CONSTRAINT "producer_addresses_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_lifecycle_events" ADD CONSTRAINT "producer_lifecycle_events_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_certifications" ADD CONSTRAINT "producer_certifications_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_documents" ADD CONSTRAINT "producer_documents_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_communications" ADD CONSTRAINT "producer_communications_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_notes" ADD CONSTRAINT "producer_notes_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_assignments" ADD CONSTRAINT "producer_assignments_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_farm_links" ADD CONSTRAINT "producer_farm_links_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_segments" ADD CONSTRAINT "producer_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "producer_segment_memberships" ADD CONSTRAINT "producer_segment_memberships_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "producer_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_segment_memberships" ADD CONSTRAINT "producer_segment_memberships_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producer_indicator_snapshots" ADD CONSTRAINT "producer_indicator_snapshots_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
