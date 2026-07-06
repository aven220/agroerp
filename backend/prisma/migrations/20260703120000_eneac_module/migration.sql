-- ENEAC — Enterprise Notification, Events & Alert Center

CREATE TYPE "NotificationAlertSeverity" AS ENUM ('info', 'warning', 'critical', 'emergency', 'operational', 'financial', 'logistics', 'quality', 'security', 'geographic');
CREATE TYPE "NotificationChannelType" AS ENUM ('internal', 'push', 'email', 'sms', 'whatsapp', 'telegram', 'teams', 'slack', 'webhook', 'external_api');
CREATE TYPE "NotificationMessageStatus" AS ENUM ('unread', 'read', 'archived', 'deleted');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'suppressed');
CREATE TYPE "NotificationRuleStatus" AS ENUM ('draft', 'active', 'inactive');
CREATE TYPE "NotificationScheduleStatus" AS ENUM ('pending', 'fired', 'cancelled');
CREATE TYPE "NotificationEventCategory" AS ENUM ('business', 'technical', 'security', 'system', 'scheduled', 'geographic', 'ai', 'external');

CREATE TABLE "notification_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "NotificationRuleStatus" NOT NULL DEFAULT 'draft',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_category" "NotificationEventCategory" NOT NULL DEFAULT 'business',
    "alert_severity" "NotificationAlertSeverity" NOT NULL DEFAULT 'info',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "escalation" JSONB NOT NULL DEFAULT '{}',
    "suppression" JSONB NOT NULL DEFAULT '{}',
    "expires_in_hours" INTEGER,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "grouping_key" VARCHAR(100),
    "ai_readiness" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "recipient_id" UUID,
    "rule_id" UUID,
    "source_event_id" UUID,
    "source_event_type" VARCHAR(100),
    "alert_severity" "NotificationAlertSeverity" NOT NULL DEFAULT 'info',
    "channel" "NotificationChannelType" NOT NULL DEFAULT 'internal',
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationMessageStatus" NOT NULL DEFAULT 'unread',
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to_id" UUID,
    "group_key" VARCHAR(200),
    "comments" JSONB NOT NULL DEFAULT '[]',
    "read_at" TIMESTAMPTZ,
    "attended_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "notification_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel" "NotificationChannelType" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "recipient_ref" VARCHAR(500),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "attended_at" TIMESTAMPTZ,
    "error" TEXT,
    "latency_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "rule_id" UUID,
    "recipient_id" UUID NOT NULL,
    "schedule_type" VARCHAR(50) NOT NULL,
    "cron_expression" VARCHAR(100),
    "fire_at" TIMESTAMPTZ NOT NULL,
    "recurrence" JSONB NOT NULL DEFAULT '{}',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationScheduleStatus" NOT NULL DEFAULT 'pending',
    "last_fired_at" TIMESTAMPTZ,
    "next_fire_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "notification_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "platform" VARCHAR(50) NOT NULL DEFAULT 'android',
    "token" VARCHAR(500) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_suppressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "suppression_key" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_rules_organization_id_rule_key_key" ON "notification_rules"("organization_id", "rule_key");
CREATE INDEX "notification_rules_organization_id_status_idx" ON "notification_rules"("organization_id", "status");
CREATE INDEX "notification_messages_organization_id_recipient_id_status_idx" ON "notification_messages"("organization_id", "recipient_id", "status");
CREATE INDEX "notification_messages_organization_id_group_key_idx" ON "notification_messages"("organization_id", "group_key");
CREATE INDEX "notification_messages_organization_id_source_event_type_idx" ON "notification_messages"("organization_id", "source_event_type");
CREATE INDEX "notification_messages_organization_id_created_at_idx" ON "notification_messages"("organization_id", "created_at");
CREATE INDEX "notification_deliveries_organization_id_status_idx" ON "notification_deliveries"("organization_id", "status");
CREATE INDEX "notification_deliveries_message_id_idx" ON "notification_deliveries"("message_id");
CREATE INDEX "notification_schedules_organization_id_status_fire_at_idx" ON "notification_schedules"("organization_id", "status", "fire_at");
CREATE UNIQUE INDEX "notification_device_tokens_organization_id_token_key" ON "notification_device_tokens"("organization_id", "token");
CREATE INDEX "notification_device_tokens_organization_id_user_id_active_idx" ON "notification_device_tokens"("organization_id", "user_id", "active");
CREATE UNIQUE INDEX "notification_suppressions_organization_id_suppression_key_key" ON "notification_suppressions"("organization_id", "suppression_key");
CREATE INDEX "notification_suppressions_organization_id_expires_at_idx" ON "notification_suppressions"("organization_id", "expires_at");

ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "notification_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_device_tokens" ADD CONSTRAINT "notification_device_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_device_tokens" ADD CONSTRAINT "notification_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_suppressions" ADD CONSTRAINT "notification_suppressions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
