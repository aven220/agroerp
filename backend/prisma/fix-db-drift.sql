-- Pre-db-push fix: remove legacy EIMS tables that block enum migration (P1014).
-- Safe when tables are empty (dev). Run: pnpm db:fix-drift && pnpm db:push

DROP TABLE IF EXISTS "eims_replenishment_suggestions" CASCADE;
DROP TABLE IF EXISTS "eims_supply_calendar_entries" CASCADE;
DROP TABLE IF EXISTS "eims_demand_histories" CASCADE;
DROP TABLE IF EXISTS "eims_forecasts" CASCADE;
DROP TABLE IF EXISTS "eims_inventory_policies" CASCADE;
DROP TABLE IF EXISTS "eims_planning_alerts" CASCADE;
DROP TABLE IF EXISTS "eims_supply_suggestions" CASCADE;

-- Stub table required: Prisma alters EimsSuggestionStatus via this table during db push
CREATE TABLE "eims_supply_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "suggestion_key" VARCHAR(120) NOT NULL,
    "suggestion_type" "EimsSuggestionType" NOT NULL,
    "status" "EimsSuggestionStatus" NOT NULL DEFAULT 'proposed',
    "item_id" UUID NOT NULL,
    "item_key" VARCHAR(80) NOT NULL,
    "warehouse_id" UUID,
    "warehouse_key" VARCHAR(80) NOT NULL,
    "from_warehouse_key" VARCHAR(80),
    "suggested_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "reason" TEXT,
    "rule_key" VARCHAR(120),
    "forecast_key" VARCHAR(120),
    "document_key" VARCHAR(120),
    "accepted_by" UUID,
    "accepted_at" TIMESTAMPTZ,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ,
    "reject_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eims_supply_suggestions_pkey" PRIMARY KEY ("id")
);

-- HCM Phase 5 (TD): remove legacy tables from prior TD schema and partial db-push drift.
-- Safe when TD tables are empty (dev).
DROP TABLE IF EXISTS "hcm_td_training_attendances" CASCADE;
DROP TABLE IF EXISTS "hcm_td_training_enrollments" CASCADE;
DROP TABLE IF EXISTS "hcm_td_training_sessions" CASCADE;
DROP TABLE IF EXISTS "hcm_td_review_responses" CASCADE;
DROP TABLE IF EXISTS "hcm_td_performance_reviews" CASCADE;
DROP TABLE IF EXISTS "hcm_td_objective_progress" CASCADE;
DROP TABLE IF EXISTS "hcm_td_improvement_plans" CASCADE;
DROP TABLE IF EXISTS "hcm_td_succession_candidates" CASCADE;
DROP TABLE IF EXISTS "hcm_td_alerts" CASCADE;
DROP TYPE IF EXISTS "HcmTdModality_old" CASCADE;
DROP TYPE IF EXISTS "HcmTdAlertType" CASCADE;
DROP TYPE IF EXISTS "HcmTdReviewStatus" CASCADE;
DROP TYPE IF EXISTS "HcmTdReviewType" CASCADE;
DROP TYPE IF EXISTS "HcmTdCertificationType" CASCADE;
DROP TYPE IF EXISTS "HcmTdCareerPlanStatus" CASCADE;

DROP TABLE IF EXISTS "hcm_td_evaluation_scores" CASCADE;
DROP TABLE IF EXISTS "hcm_td_evaluations" CASCADE;
DROP TABLE IF EXISTS "hcm_td_action_plans" CASCADE;
DROP TABLE IF EXISTS "hcm_td_objectives" CASCADE;
DROP TABLE IF EXISTS "hcm_td_career_plans" CASCADE;
DROP TABLE IF EXISTS "hcm_td_reminders" CASCADE;
DROP TABLE IF EXISTS "hcm_td_employee_competencies" CASCADE;
DROP TABLE IF EXISTS "hcm_td_certifications" CASCADE;
DROP TABLE IF EXISTS "hcm_td_enrollments" CASCADE;
DROP TABLE IF EXISTS "hcm_td_course_schedules" CASCADE;
DROP TABLE IF EXISTS "hcm_td_plan_assignments" CASCADE;
DROP TABLE IF EXISTS "hcm_td_performance_cycles" CASCADE;

CREATE TABLE IF NOT EXISTS "hcm_td_course_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "schedule_key" VARCHAR(80) NOT NULL,
    "course_key" VARCHAR(80) NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modality" "HcmTdModality" NOT NULL DEFAULT 'virtual',
    "location" VARCHAR(300),
    "instructor" VARCHAR(200),
    "capacity" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hcm_td_course_schedules_pkey" PRIMARY KEY ("id")
);
