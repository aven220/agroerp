-- CPEP Reception wizard & turn management enhancements

ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "carrier_name" VARCHAR(120);
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "purchase_center_id" UUID;
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "nfc_tag" VARCHAR(120);
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "search_method" VARCHAR(40);
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "wizard_step" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "arrival_at" TIMESTAMPTZ;
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "attention_started_at" TIMESTAMPTZ;
ALTER TABLE "cpep_reception_tickets" ADD COLUMN IF NOT EXISTS "attention_completed_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "cpep_reception_tickets_organization_id_purchase_center_id_status_idx" ON "cpep_reception_tickets"("organization_id", "purchase_center_id", "status");

ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "is_preferential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "assignment_mode" VARCHAR(20) NOT NULL DEFAULT 'auto';
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "assigned_by" UUID;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "display_label" VARCHAR(40);
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "attention_started_at" TIMESTAMPTZ;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "wait_ms" INTEGER;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "attention_ms" INTEGER;
ALTER TABLE "cpep_queue_turns" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "cpep_queue_turns_organization_id_priority_turn_number_idx" ON "cpep_queue_turns"("organization_id", "priority", "turn_number");
CREATE INDEX IF NOT EXISTS "cpep_queue_turns_organization_id_called_at_idx" ON "cpep_queue_turns"("organization_id", "called_at");

CREATE TABLE IF NOT EXISTS "cpep_vehicles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "plate" VARCHAR(40) NOT NULL,
    "vehicle_type" VARCHAR(40),
    "driver_name" VARCHAR(120),
    "carrier_name" VARCHAR(120),
    "observations" TEXT,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_vehicles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cpep_vehicles_organization_id_plate_idx" ON "cpep_vehicles"("organization_id", "plate");
CREATE INDEX IF NOT EXISTS "cpep_vehicles_ticket_id_idx" ON "cpep_vehicles"("ticket_id");
ALTER TABLE "cpep_vehicles" DROP CONSTRAINT IF EXISTS "cpep_vehicles_organization_id_fkey";
ALTER TABLE "cpep_vehicles" ADD CONSTRAINT "cpep_vehicles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_vehicles" DROP CONSTRAINT IF EXISTS "cpep_vehicles_ticket_id_fkey";
ALTER TABLE "cpep_vehicles" ADD CONSTRAINT "cpep_vehicles_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cpep_turn_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "from_turn" INTEGER,
    "to_turn" INTEGER,
    "details" JSONB NOT NULL DEFAULT '{}',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_turn_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cpep_turn_events_organization_id_created_at_idx" ON "cpep_turn_events"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "cpep_turn_events_ticket_id_created_at_idx" ON "cpep_turn_events"("ticket_id", "created_at");
ALTER TABLE "cpep_turn_events" DROP CONSTRAINT IF EXISTS "cpep_turn_events_organization_id_fkey";
ALTER TABLE "cpep_turn_events" ADD CONSTRAINT "cpep_turn_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_turn_events" DROP CONSTRAINT IF EXISTS "cpep_turn_events_ticket_id_fkey";
ALTER TABLE "cpep_turn_events" ADD CONSTRAINT "cpep_turn_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cpep_reception_incidents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "incident_key" VARCHAR(80) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cpep_reception_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cpep_reception_incidents_organization_id_resolved_created_at_idx" ON "cpep_reception_incidents"("organization_id", "resolved", "created_at");
ALTER TABLE "cpep_reception_incidents" DROP CONSTRAINT IF EXISTS "cpep_reception_incidents_organization_id_fkey";
ALTER TABLE "cpep_reception_incidents" ADD CONSTRAINT "cpep_reception_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpep_reception_incidents" DROP CONSTRAINT IF EXISTS "cpep_reception_incidents_ticket_id_fkey";
ALTER TABLE "cpep_reception_incidents" ADD CONSTRAINT "cpep_reception_incidents_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cpep_reception_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
