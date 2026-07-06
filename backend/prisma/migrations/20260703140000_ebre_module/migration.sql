-- EBRE — Enterprise Business Rules Engine

CREATE TYPE "BreRuleStatus" AS ENUM ('draft', 'published', 'inactive', 'archived');
CREATE TYPE "BreTriggerType" AS ENUM ('event', 'scheduled', 'manual', 'api');
CREATE TYPE "BreHitPolicy" AS ENUM ('first', 'collect', 'priority', 'unique');
CREATE TYPE "BreExecutionStatus" AS ENUM ('success', 'failed', 'skipped', 'partial');

CREATE TABLE "bre_rule_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "group_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_rule_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_decision_tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "table_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "inputs" JSONB NOT NULL DEFAULT '[]',
    "outputs" JSONB NOT NULL DEFAULT '[]',
    "rows" JSONB NOT NULL DEFAULT '[]',
    "hit_policy" "BreHitPolicy" NOT NULL DEFAULT 'first',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_decision_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_business_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "group_id" UUID,
    "rule_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "BreRuleStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "trigger_type" "BreTriggerType" NOT NULL DEFAULT 'event',
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_category" VARCHAR(50) NOT NULL DEFAULT 'generic',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "expressions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "decision_table_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ai_readiness" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ,
    "published_by" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_business_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_rule_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changelog" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_rule_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_rule_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "event_type" VARCHAR(100),
    "status" "BreExecutionStatus" NOT NULL DEFAULT 'success',
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "actions_executed" JSONB NOT NULL DEFAULT '[]',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "input_context" JSONB NOT NULL DEFAULT '{}',
    "output_context" JSONB NOT NULL DEFAULT '{}',
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_rule_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_rule_simulations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "input_context" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB NOT NULL DEFAULT '[]',
    "conflicts" JSONB NOT NULL DEFAULT '[]',
    "performance_ms" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_rule_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bre_rule_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bre_rule_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bre_rule_groups_organization_id_group_key_key" ON "bre_rule_groups"("organization_id", "group_key");
CREATE UNIQUE INDEX "bre_decision_tables_organization_id_table_key_key" ON "bre_decision_tables"("organization_id", "table_key");
CREATE UNIQUE INDEX "bre_business_rules_organization_id_rule_key_key" ON "bre_business_rules"("organization_id", "rule_key");
CREATE UNIQUE INDEX "bre_rule_versions_rule_id_version_key" ON "bre_rule_versions"("rule_id", "version");
CREATE INDEX "bre_business_rules_organization_id_status_priority_idx" ON "bre_business_rules"("organization_id", "status", "priority");
CREATE INDEX "bre_business_rules_organization_id_event_category_idx" ON "bre_business_rules"("organization_id", "event_category");
CREATE INDEX "bre_rule_executions_organization_id_executed_at_idx" ON "bre_rule_executions"("organization_id", "executed_at");
CREATE INDEX "bre_rule_executions_rule_id_executed_at_idx" ON "bre_rule_executions"("rule_id", "executed_at");
CREATE INDEX "bre_rule_simulations_organization_id_created_at_idx" ON "bre_rule_simulations"("organization_id", "created_at");
CREATE INDEX "bre_rule_audit_logs_organization_id_created_at_idx" ON "bre_rule_audit_logs"("organization_id", "created_at");

ALTER TABLE "bre_rule_groups" ADD CONSTRAINT "bre_rule_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_decision_tables" ADD CONSTRAINT "bre_decision_tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_business_rules" ADD CONSTRAINT "bre_business_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_business_rules" ADD CONSTRAINT "bre_business_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "bre_rule_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bre_business_rules" ADD CONSTRAINT "bre_business_rules_decision_table_id_fkey" FOREIGN KEY ("decision_table_id") REFERENCES "bre_decision_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bre_rule_versions" ADD CONSTRAINT "bre_rule_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_rule_versions" ADD CONSTRAINT "bre_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "bre_business_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bre_rule_executions" ADD CONSTRAINT "bre_rule_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_rule_executions" ADD CONSTRAINT "bre_rule_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "bre_business_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bre_rule_simulations" ADD CONSTRAINT "bre_rule_simulations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_rule_simulations" ADD CONSTRAINT "bre_rule_simulations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "bre_business_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bre_rule_audit_logs" ADD CONSTRAINT "bre_rule_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bre_rule_audit_logs" ADD CONSTRAINT "bre_rule_audit_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "bre_business_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
