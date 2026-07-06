-- EPOP — Enterprise Performance & Optimization Platform

CREATE TYPE "EpopCacheLayer" AS ENUM ('client', 'server', 'data');
CREATE TYPE "EpopJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE "EpopPerfKind" AS ENUM ('response_time', 'slow_query', 'memory', 'cpu', 'fps', 'bundle_size', 'module_latency', 'cache_hit', 'cache_miss', 'connection_pool', 'queue_depth', 'custom');
CREATE TYPE "EpopIndexStatus" AS ENUM ('suggested', 'applied', 'rejected', 'obsolete');

CREATE TABLE "epop_cache_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "cache_key" VARCHAR(255) NOT NULL,
    "layer" "EpopCacheLayer" NOT NULL DEFAULT 'server',
    "value" JSONB NOT NULL DEFAULT '{}',
    "ttl_seconds" INTEGER NOT NULL DEFAULT 300,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "epop_cache_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_cache_entries_cache_key_layer_key" ON "epop_cache_entries"("cache_key", "layer");
CREATE INDEX "epop_cache_entries_organization_id_expires_at_idx" ON "epop_cache_entries"("organization_id", "expires_at");
ALTER TABLE "epop_cache_entries" ADD CONSTRAINT "epop_cache_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_slow_queries" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "query_key" VARCHAR(120) NOT NULL,
    "sql_text" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "module_key" VARCHAR(80),
    "table_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rows_examined" INTEGER,
    "plan_summary" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_slow_queries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "epop_slow_queries_organization_id_duration_ms_idx" ON "epop_slow_queries"("organization_id", "duration_ms");
CREATE INDEX "epop_slow_queries_recorded_at_idx" ON "epop_slow_queries"("recorded_at");
ALTER TABLE "epop_slow_queries" ADD CONSTRAINT "epop_slow_queries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_index_recommendations" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "recommendation_key" VARCHAR(120) NOT NULL,
    "table_name" VARCHAR(120) NOT NULL,
    "columns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "index_sql" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "estimated_gain_ms" DOUBLE PRECISION,
    "status" "EpopIndexStatus" NOT NULL DEFAULT 'suggested',
    "applied_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "epop_index_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_index_recommendations_recommendation_key_key" ON "epop_index_recommendations"("recommendation_key");
CREATE INDEX "epop_index_recommendations_status_created_at_idx" ON "epop_index_recommendations"("status", "created_at");
ALTER TABLE "epop_index_recommendations" ADD CONSTRAINT "epop_index_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_partition_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "job_key" VARCHAR(120) NOT NULL,
    "table_name" VARCHAR(120) NOT NULL,
    "strategy" VARCHAR(40) NOT NULL,
    "status" "EpopJobStatus" NOT NULL DEFAULT 'pending',
    "details" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_partition_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_partition_jobs_job_key_key" ON "epop_partition_jobs"("job_key");
ALTER TABLE "epop_partition_jobs" ADD CONSTRAINT "epop_partition_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_archive_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "job_key" VARCHAR(120) NOT NULL,
    "table_name" VARCHAR(120) NOT NULL,
    "older_than_days" INTEGER NOT NULL,
    "status" "EpopJobStatus" NOT NULL DEFAULT 'pending',
    "rows_archived" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_archive_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_archive_jobs_job_key_key" ON "epop_archive_jobs"("job_key");
ALTER TABLE "epop_archive_jobs" ADD CONSTRAINT "epop_archive_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_maintenance_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "job_key" VARCHAR(120) NOT NULL,
    "job_type" VARCHAR(40) NOT NULL,
    "schedule_cron" VARCHAR(80),
    "status" "EpopJobStatus" NOT NULL DEFAULT 'pending',
    "last_run_at" TIMESTAMPTZ,
    "details" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "epop_maintenance_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_maintenance_jobs_job_key_key" ON "epop_maintenance_jobs"("job_key");
ALTER TABLE "epop_maintenance_jobs" ADD CONSTRAINT "epop_maintenance_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_perf_metrics" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "metric_key" VARCHAR(120) NOT NULL,
    "kind" "EpopPerfKind" NOT NULL,
    "module_key" VARCHAR(80),
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(40),
    "labels" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_perf_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "epop_perf_metrics_organization_id_kind_recorded_at_idx" ON "epop_perf_metrics"("organization_id", "kind", "recorded_at");
CREATE INDEX "epop_perf_metrics_module_key_recorded_at_idx" ON "epop_perf_metrics"("module_key", "recorded_at");
ALTER TABLE "epop_perf_metrics" ADD CONSTRAINT "epop_perf_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_benchmark_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "run_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scenario" VARCHAR(80) NOT NULL,
    "status" "EpopJobStatus" NOT NULL DEFAULT 'pending',
    "before_metrics" JSONB NOT NULL DEFAULT '{}',
    "after_metrics" JSONB NOT NULL DEFAULT '{}',
    "improvement_pct" DOUBLE PRECISION,
    "duration_ms" INTEGER,
    "details" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_benchmark_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epop_benchmark_runs_run_key_key" ON "epop_benchmark_runs"("run_key");
CREATE INDEX "epop_benchmark_runs_organization_id_created_at_idx" ON "epop_benchmark_runs"("organization_id", "created_at");
ALTER TABLE "epop_benchmark_runs" ADD CONSTRAINT "epop_benchmark_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_bundle_metrics" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "bundle_key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "gzip_bytes" INTEGER,
    "chunk_count" INTEGER NOT NULL DEFAULT 1,
    "platform" VARCHAR(40) NOT NULL DEFAULT 'web',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_bundle_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "epop_bundle_metrics_platform_recorded_at_idx" ON "epop_bundle_metrics"("platform", "recorded_at");
ALTER TABLE "epop_bundle_metrics" ADD CONSTRAINT "epop_bundle_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_mobile_perf_samples" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "device_id" VARCHAR(120) NOT NULL,
    "sample_key" VARCHAR(120) NOT NULL,
    "startup_ms" INTEGER,
    "memory_mb" DOUBLE PRECISION,
    "battery_pct" DOUBLE PRECISION,
    "fps" DOUBLE PRECISION,
    "sync_ms" INTEGER,
    "list_render_ms" INTEGER,
    "offline_ops" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_mobile_perf_samples_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "epop_mobile_perf_samples_organization_id_recorded_at_idx" ON "epop_mobile_perf_samples"("organization_id", "recorded_at");
CREATE INDEX "epop_mobile_perf_samples_device_id_recorded_at_idx" ON "epop_mobile_perf_samples"("device_id", "recorded_at");
ALTER TABLE "epop_mobile_perf_samples" ADD CONSTRAINT "epop_mobile_perf_samples_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "epop_optimization_audits" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_key" VARCHAR(120) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epop_optimization_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "epop_optimization_audits_organization_id_created_at_idx" ON "epop_optimization_audits"("organization_id", "created_at");
ALTER TABLE "epop_optimization_audits" ADD CONSTRAINT "epop_optimization_audits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
