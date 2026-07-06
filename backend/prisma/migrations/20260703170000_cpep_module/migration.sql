-- CPEP — Café Procurement Enterprise Platform

CREATE TYPE "CpepTicketStatus" AS ENUM ('arrived', 'identity_validated', 'queued', 'receiving', 'weighed', 'quality_pending', 'quality_done', 'settlement_pending', 'settled', 'inventory_posted', 'cancelled');
CREATE TYPE "CpepPaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'withheld');
CREATE TYPE "CpepDocumentType" AS ENUM ('receipt', 'settlement', 'voucher', 'invoice', 'remittance', 'label', 'qr', 'barcode', 'pdf', 'signature');
CREATE TYPE "CpepQualityGrade" AS ENUM ('excelso', 'premium', 'standard', 'pasilla', 'reject');

CREATE TABLE "cpep_reception_tickets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_key" VARCHAR(120) NOT NULL,
    "status" "CpepTicketStatus" NOT NULL DEFAULT 'arrived',
    "producer_id" UUID,
    "producer_code" VARCHAR(80),
    "producer_name" VARCHAR(255),
    "identity_doc" VARCHAR(80),
    "identity_validated" BOOLEAN NOT NULL DEFAULT false,
    "farm_id" UUID,
    "farm_name" VARCHAR(255),
    "lot_id" UUID,
    "lot_code" VARCHAR(80),
    "vehicle_plate" VARCHAR(40),
    "vehicle_type" VARCHAR(40),
    "driver_name" VARCHAR(120),
    "turn_number" INTEGER,
    "gross_weight_kg" DOUBLE PRECISION,
    "tare_weight_kg" DOUBLE PRECISION,
    "net_weight_kg" DOUBLE PRECISION,
    "weight_source" VARCHAR(40),
    "iot_device_key" VARCHAR(120),
    "weight_validated" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "qr_code" VARCHAR(120),
    "barcode" VARCHAR(120),
    "received_at" TIMESTAMPTZ,
    "settled_at" TIMESTAMPTZ,
    "created_by" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_reception_tickets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_reception_tickets_organization_id_ticket_key_key" ON "cpep_reception_tickets"("organization_id", "ticket_key");
CREATE INDEX "cpep_reception_tickets_organization_id_status_created_at_idx" ON "cpep_reception_tickets"("organization_id", "status", "created_at");
CREATE INDEX "cpep_reception_tickets_organization_id_producer_id_idx" ON "cpep_reception_tickets"("organization_id", "producer_id");
ALTER TABLE "cpep_reception_tickets" ADD CONSTRAINT "cpep_reception_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cpep_queue_turns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "turn_number" INTEGER NOT NULL,
    "called_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_queue_turns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_queue_turns_ticket_id_key" ON "cpep_queue_turns"("ticket_id");
CREATE INDEX "cpep_queue_turns_organization_id_turn_number_idx" ON "cpep_queue_turns"("organization_id", "turn_number");
ALTER TABLE "cpep_queue_turns" ADD CONSTRAINT "cpep_queue_turns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_queue_turns" ADD CONSTRAINT "cpep_queue_turns_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_weighings" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "weighing_type" VARCHAR(20) NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "source" VARCHAR(40) NOT NULL DEFAULT 'manual',
    "iot_device_key" VARCHAR(120),
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_weighings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_weighings_ticket_id_weighing_type_idx" ON "cpep_weighings"("ticket_id", "weighing_type");
ALTER TABLE "cpep_weighings" ADD CONSTRAINT "cpep_weighings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_quality_assessments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "humidity_pct" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "factor" DOUBLE PRECISION,
    "pasilla_pct" DOUBLE PRECISION,
    "broca_pct" DOUBLE PRECISION,
    "defects_pct" DOUBLE PRECISION,
    "color" VARCHAR(80),
    "odor" VARCHAR(80),
    "grade" "CpepQualityGrade" NOT NULL DEFAULT 'standard',
    "observations" TEXT,
    "lab_results" JSONB NOT NULL DEFAULT '{}',
    "assessed_by" UUID,
    "assessed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_quality_assessments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_quality_assessments_ticket_id_key" ON "cpep_quality_assessments"("ticket_id");
CREATE INDEX "cpep_quality_assessments_organization_id_assessed_at_idx" ON "cpep_quality_assessments"("organization_id", "assessed_at");
ALTER TABLE "cpep_quality_assessments" ADD CONSTRAINT "cpep_quality_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_quality_assessments" ADD CONSTRAINT "cpep_quality_assessments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_samples" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sample_key" VARCHAR(80) NOT NULL,
    "sample_type" VARCHAR(40) NOT NULL DEFAULT 'reception',
    "weight_grams" DOUBLE PRECISION,
    "custody_code" VARCHAR(80),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_samples_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_samples_ticket_id_sample_key_key" ON "cpep_samples"("ticket_id", "sample_key");
ALTER TABLE "cpep_samples" ADD CONSTRAINT "cpep_samples_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_photos" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "photo_key" VARCHAR(120) NOT NULL,
    "photo_type" VARCHAR(40) NOT NULL DEFAULT 'reception',
    "storage_url" VARCHAR(500),
    "caption" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_photos_ticket_id_idx" ON "cpep_photos"("ticket_id");
ALTER TABLE "cpep_photos" ADD CONSTRAINT "cpep_photos_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_signatures" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "signer_role" VARCHAR(40) NOT NULL,
    "signer_name" VARCHAR(120) NOT NULL,
    "signature_data" TEXT NOT NULL,
    "signed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_signatures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_signatures_ticket_id_idx" ON "cpep_signatures"("ticket_id");
ALTER TABLE "cpep_signatures" ADD CONSTRAINT "cpep_signatures_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_custody_events" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "event_key" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "actor_name" VARCHAR(120),
    "location" VARCHAR(120),
    "details" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_custody_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_custody_events_ticket_id_recorded_at_idx" ON "cpep_custody_events"("ticket_id", "recorded_at");
ALTER TABLE "cpep_custody_events" ADD CONSTRAINT "cpep_custody_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_settlements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "settlement_key" VARCHAR(120) NOT NULL,
    "base_price_per_kg" DOUBLE PRECISION NOT NULL,
    "net_weight_kg" DOUBLE PRECISION NOT NULL,
    "bonuses_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penalties_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discounts_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withholdings_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transport_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advances_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxes_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_status" "CpepPaymentStatus" NOT NULL DEFAULT 'pending',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "lines" JSONB NOT NULL DEFAULT '[]',
    "settled_by" UUID,
    "settled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_settlements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_settlements_ticket_id_key" ON "cpep_settlements"("ticket_id");
CREATE UNIQUE INDEX "cpep_settlements_organization_id_settlement_key_key" ON "cpep_settlements"("organization_id", "settlement_key");
CREATE INDEX "cpep_settlements_organization_id_payment_status_created_at_idx" ON "cpep_settlements"("organization_id", "payment_status", "created_at");
ALTER TABLE "cpep_settlements" ADD CONSTRAINT "cpep_settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_settlements" ADD CONSTRAINT "cpep_settlements_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID,
    "document_key" VARCHAR(120) NOT NULL,
    "document_type" "CpepDocumentType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "pdf_url" VARCHAR(500),
    "qr_payload" VARCHAR(255),
    "barcode_payload" VARCHAR(255),
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_documents_organization_id_document_key_key" ON "cpep_documents"("organization_id", "document_key");
CREATE INDEX "cpep_documents_ticket_id_idx" ON "cpep_documents"("ticket_id");
ALTER TABLE "cpep_documents" ADD CONSTRAINT "cpep_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_documents" ADD CONSTRAINT "cpep_documents_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "cpep_price_configs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "config_key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "base_price_per_kg" DOUBLE PRECISION NOT NULL,
    "bonus_rules" JSONB NOT NULL DEFAULT '[]',
    "penalty_rules" JSONB NOT NULL DEFAULT '[]',
    "tax_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withholding_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "cpep_price_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_price_configs_organization_id_config_key_key" ON "cpep_price_configs"("organization_id", "config_key");
ALTER TABLE "cpep_price_configs" ADD CONSTRAINT "cpep_price_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cpep_inventory_movements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "movement_key" VARCHAR(120) NOT NULL,
    "warehouse" VARCHAR(120) NOT NULL DEFAULT 'Acopio principal',
    "lot_code" VARCHAR(80),
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventory_resource_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "posted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_inventory_movements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cpep_inventory_movements_organization_id_movement_key_key" ON "cpep_inventory_movements"("organization_id", "movement_key");
CREATE INDEX "cpep_inventory_movements_ticket_id_idx" ON "cpep_inventory_movements"("ticket_id");
ALTER TABLE "cpep_inventory_movements" ADD CONSTRAINT "cpep_inventory_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_inventory_movements" ADD CONSTRAINT "cpep_inventory_movements_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cpep_audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_key" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cpep_audit_logs_organization_id_created_at_idx" ON "cpep_audit_logs"("organization_id", "created_at");
ALTER TABLE "cpep_audit_logs" ADD CONSTRAINT "cpep_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
