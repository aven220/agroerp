-- Enterprise Workflow Engine — BPM tables

CREATE TYPE "WorkflowVersionStatus" AS ENUM ('draft', 'published', 'deprecated');
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('active', 'suspended', 'completed', 'cancelled');
CREATE TYPE "WorkflowAssignmentStatus" AS ENUM ('pending', 'completed', 'escalated', 'cancelled');
CREATE TYPE "WorkflowNotificationChannel" AS ENUM ('internal', 'email', 'push', 'sms', 'whatsapp', 'webhook');
CREATE TYPE "WorkflowNotificationStatus" AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE "workflow_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "workflow_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "resource_type" VARCHAR(100),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "definition_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'draft',
  "definition" JSONB NOT NULL DEFAULT '{}',
  "changelog" TEXT,
  "published_at" TIMESTAMPTZ,
  "published_by" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_instances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "version_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "resource_id" UUID,
  "resource_type" VARCHAR(100),
  "current_state" VARCHAR(100) NOT NULL,
  "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'active',
  "context" JSONB NOT NULL DEFAULT '{}',
  "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
  "due_at" TIMESTAMPTZ,
  "started_by" UUID,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ,
  "suspended_at" TIMESTAMPTZ,
  "suspended_by" UUID,
  "external_id" VARCHAR(255),
  "sync_status" "ResourceSyncStatus" NOT NULL DEFAULT 'synced',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "from_state" VARCHAR(100),
  "to_state" VARCHAR(100) NOT NULL,
  "transition_key" VARCHAR(100) NOT NULL,
  "actor_id" UUID,
  "device_id" UUID,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "comment" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "event_id" UUID,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "workflow_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "transition_id" VARCHAR(100),
  "file_id" UUID NOT NULL,
  "uploaded_by" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "transition_key" VARCHAR(100),
  "state_key" VARCHAR(100) NOT NULL,
  "status" "WorkflowAssignmentStatus" NOT NULL DEFAULT 'pending',
  "due_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "channel" "WorkflowNotificationChannel" NOT NULL,
  "status" "WorkflowNotificationStatus" NOT NULL DEFAULT 'pending',
  "recipient_id" UUID,
  "recipient_ref" VARCHAR(255),
  "subject" VARCHAR(500),
  "body" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "sent_at" TIMESTAMPTZ,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_transition_queue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "transition_key" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "actor_id" UUID,
  "external_id" VARCHAR(255),
  "sync_status" "ResourceSyncStatus" NOT NULL DEFAULT 'pending',
  "device_id" UUID,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ,
  CONSTRAINT "workflow_transition_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_organization_id_workflow_key_key" ON "workflow_definitions"("organization_id", "workflow_key");
CREATE INDEX "workflow_definitions_organization_id_active_idx" ON "workflow_definitions"("organization_id", "active");
CREATE UNIQUE INDEX "workflow_versions_definition_id_version_key" ON "workflow_versions"("definition_id", "version");
CREATE INDEX "workflow_versions_definition_id_status_idx" ON "workflow_versions"("definition_id", "status");
CREATE INDEX "workflow_instances_organization_id_status_idx" ON "workflow_instances"("organization_id", "status");
CREATE INDEX "workflow_instances_organization_id_current_state_idx" ON "workflow_instances"("organization_id", "current_state");
CREATE INDEX "workflow_instances_definition_id_status_idx" ON "workflow_instances"("definition_id", "status");
CREATE INDEX "workflow_instances_resource_id_idx" ON "workflow_instances"("resource_id");
CREATE INDEX "workflow_instances_organization_id_external_id_idx" ON "workflow_instances"("organization_id", "external_id");
CREATE INDEX "workflow_history_instance_id_occurred_at_idx" ON "workflow_history"("instance_id", "occurred_at");
CREATE INDEX "workflow_history_organization_id_occurred_at_idx" ON "workflow_history"("organization_id", "occurred_at");
CREATE INDEX "workflow_comments_instance_id_created_at_idx" ON "workflow_comments"("instance_id", "created_at");
CREATE INDEX "workflow_attachments_instance_id_idx" ON "workflow_attachments"("instance_id");
CREATE INDEX "workflow_assignments_user_id_status_idx" ON "workflow_assignments"("user_id", "status");
CREATE INDEX "workflow_assignments_instance_id_status_idx" ON "workflow_assignments"("instance_id", "status");
CREATE INDEX "workflow_assignments_organization_id_status_idx" ON "workflow_assignments"("organization_id", "status");
CREATE INDEX "workflow_notifications_organization_id_status_idx" ON "workflow_notifications"("organization_id", "status");
CREATE INDEX "workflow_notifications_instance_id_idx" ON "workflow_notifications"("instance_id");
CREATE INDEX "workflow_transition_queue_organization_id_external_id_idx" ON "workflow_transition_queue"("organization_id", "external_id");
CREATE INDEX "workflow_transition_queue_sync_status_idx" ON "workflow_transition_queue"("sync_status");

ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_attachments" ADD CONSTRAINT "workflow_attachments_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_notifications" ADD CONSTRAINT "workflow_notifications_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transition_queue" ADD CONSTRAINT "workflow_transition_queue_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
