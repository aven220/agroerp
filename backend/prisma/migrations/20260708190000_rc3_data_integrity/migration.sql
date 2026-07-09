-- RC3: enforce submission idempotency and event version uniqueness

CREATE UNIQUE INDEX IF NOT EXISTS "form_submissions_organization_id_external_id_key"
  ON "form_submissions" ("organization_id", "external_id");

CREATE UNIQUE INDEX IF NOT EXISTS "events_aggregate_type_aggregate_id_version_key"
  ON "events" ("aggregate_type", "aggregate_id", "version");
