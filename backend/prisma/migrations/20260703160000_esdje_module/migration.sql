-- ESDJE — Enterprise Scheduler & Distributed Job Engine

CREATE TYPE "EsdjeJobType" AS ENUM ('one_time', 'recurring', 'scheduled', 'deferred', 'event', 'manual', 'distributed', 'parallel', 'dependent');
CREATE TYPE "EsdjeJobStatus" AS ENUM ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'dead_letter', 'paused');
CREATE TYPE "EsdjeQueuePriority" AS ENUM ('critical', 'high', 'normal', 'low');
CREATE TYPE "EsdjeRetryStrategy" AS ENUM ('exponential', 'linear', 'fixed');
CREATE TYPE "EsdjeWorkerStatus" AS ENUM ('online', 'offline', 'draining', 'busy');

CREATE TABLE "esdje_job_queues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "queue_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "module_key" VARCHAR(80) NOT NULL DEFAULT 'core',
    "priority" "EsdjeQueuePriority" NOT NULL DEFAULT 'normal',
    "max_concurrency" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_job_queues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esdje_workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "worker_key" VARCHAR(100) NOT NULL,
    "node_id" VARCHAR(100) NOT NULL,
    "hostname" VARCHAR(255),
    "status" "EsdjeWorkerStatus" NOT NULL DEFAULT 'online',
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_heartbeat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_workers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esdje_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "queue_id" UUID,
    "job_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "job_type" "EsdjeJobType" NOT NULL DEFAULT 'scheduled',
    "status" "EsdjeJobStatus" NOT NULL DEFAULT 'pending',
    "handler_type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "cron_expression" VARCHAR(100),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    "run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "last_run_at" TIMESTAMPTZ,
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_strategy" "EsdjeRetryStrategy" NOT NULL DEFAULT 'exponential',
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "timeout_ms" INTEGER NOT NULL DEFAULT 300000,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "parallelism" INTEGER NOT NULL DEFAULT 1,
    "business_days_only" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ai_readiness" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esdje_job_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "job_key" VARCHAR(100) NOT NULL,
    "status" "EsdjeJobStatus" NOT NULL DEFAULT 'queued',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "worker_id" UUID,
    "worker_node" VARCHAR(100),
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "output" JSONB NOT NULL DEFAULT '{}',
    "input_payload" JSONB NOT NULL DEFAULT '{}',
    "triggered_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esdje_dead_letters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "job_key" VARCHAR(100) NOT NULL,
    "run_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_dead_letters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esdje_maintenance_windows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    "block_all_jobs" BOOLEAN NOT NULL DEFAULT true,
    "allowed_queues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "esdje_maintenance_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "esdje_job_queues_organization_id_queue_key_key" ON "esdje_job_queues"("organization_id", "queue_key");
CREATE UNIQUE INDEX "esdje_workers_organization_id_worker_key_key" ON "esdje_workers"("organization_id", "worker_key");
CREATE UNIQUE INDEX "esdje_jobs_organization_id_job_key_key" ON "esdje_jobs"("organization_id", "job_key");
CREATE INDEX "esdje_job_queues_organization_id_module_key_priority_idx" ON "esdje_job_queues"("organization_id", "module_key", "priority");
CREATE INDEX "esdje_jobs_organization_id_status_next_run_at_idx" ON "esdje_jobs"("organization_id", "status", "next_run_at");
CREATE INDEX "esdje_jobs_organization_id_job_type_idx" ON "esdje_jobs"("organization_id", "job_type");
CREATE INDEX "esdje_job_runs_organization_id_created_at_idx" ON "esdje_job_runs"("organization_id", "created_at");
CREATE INDEX "esdje_job_runs_job_id_created_at_idx" ON "esdje_job_runs"("job_id", "created_at");
CREATE INDEX "esdje_job_runs_status_created_at_idx" ON "esdje_job_runs"("status", "created_at");
CREATE INDEX "esdje_workers_organization_id_status_idx" ON "esdje_workers"("organization_id", "status");
CREATE INDEX "esdje_dead_letters_organization_id_is_resolved_created_at_idx" ON "esdje_dead_letters"("organization_id", "is_resolved", "created_at");
CREATE INDEX "esdje_maintenance_windows_organization_id_starts_at_ends_at_idx" ON "esdje_maintenance_windows"("organization_id", "starts_at", "ends_at");

ALTER TABLE "esdje_job_queues" ADD CONSTRAINT "esdje_job_queues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "esdje_workers" ADD CONSTRAINT "esdje_workers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "esdje_jobs" ADD CONSTRAINT "esdje_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "esdje_jobs" ADD CONSTRAINT "esdje_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "esdje_job_queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "esdje_job_runs" ADD CONSTRAINT "esdje_job_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "esdje_job_runs" ADD CONSTRAINT "esdje_job_runs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "esdje_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "esdje_job_runs" ADD CONSTRAINT "esdje_job_runs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "esdje_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "esdje_dead_letters" ADD CONSTRAINT "esdje_dead_letters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "esdje_dead_letters" ADD CONSTRAINT "esdje_dead_letters_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "esdje_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "esdje_maintenance_windows" ADD CONSTRAINT "esdje_maintenance_windows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
