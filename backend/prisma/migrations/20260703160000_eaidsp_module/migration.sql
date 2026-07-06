-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('openai', 'google', 'anthropic', 'meta', 'mistral', 'deepseek', 'ollama', 'custom');
CREATE TYPE "AiPromptStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'active', 'archived');
CREATE TYPE "AiServiceType" AS ENUM ('chat', 'completion', 'summarization', 'classification', 'extraction', 'translation', 'correction', 'document_analysis', 'ocr', 'image_analysis', 'audio_analysis', 'speech_recognition', 'recommendation', 'anomaly_detection', 'prediction', 'explanation');
CREATE TYPE "AiCopilotCategory" AS ENUM ('management', 'purchases', 'finance', 'inventory', 'quality', 'laboratory', 'producers', 'field_technician', 'logistics', 'hr', 'system_admin');
CREATE TYPE "AiConversationStatus" AS ENUM ('active', 'archived');
CREATE TYPE "AiRagSourceType" AS ENUM ('document', 'contract', 'procedure', 'manual', 'erp_record', 'report', 'form', 'regulation');

-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_key" VARCHAR(50) NOT NULL,
    "provider_type" "AiProviderType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_url" VARCHAR(500),
    "api_key_ref" VARCHAR(255),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "rate_limits" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_model_definitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "model_key" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "model_type" VARCHAR(50) NOT NULL DEFAULT 'chat',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "context_window" INTEGER NOT NULL DEFAULT 8192,
    "cost_per_1k_in" DECIMAL(10,6),
    "cost_per_1k_out" DECIMAL(10,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_model_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_prompt_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "prompt_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "service_type" "AiServiceType" NOT NULL DEFAULT 'chat',
    "status" "AiPromptStatus" NOT NULL DEFAULT 'draft',
    "variables" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_prompt_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AiPromptStatus" NOT NULL DEFAULT 'draft',
    "template" TEXT NOT NULL,
    "system_prompt" TEXT,
    "changelog" TEXT,
    "test_results" JSONB NOT NULL DEFAULT '{}',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_copilot_definitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "copilot_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "AiCopilotCategory" NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "prompt_key" VARCHAR(100),
    "model_key" VARCHAR(100),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "context_scopes" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_copilot_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "copilot_key" VARCHAR(100),
    "title" VARCHAR(255),
    "status" "AiConversationStatus" NOT NULL DEFAULT 'active',
    "module_context" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_conversation_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "service_type" VARCHAR(50),
    "explainability" JSONB NOT NULL DEFAULT '{}',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_memory_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "memory_key" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "scope" VARCHAR(30) NOT NULL DEFAULT 'user',
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_memory_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_rag_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "source_type" "AiRagSourceType" NOT NULL,
    "source_ref" VARCHAR(255),
    "content" TEXT NOT NULL,
    "content_hash" VARCHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "indexed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_rag_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_rag_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "ai_rag_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_request_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "service_type" "AiServiceType" NOT NULL,
    "provider_type" VARCHAR(50) NOT NULL,
    "model_key" VARCHAR(100) NOT NULL,
    "module_context" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'success',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DECIMAL(12,6),
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "confidence" DECIMAL(5,4),
    "explainability" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage_quotas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "scope" VARCHAR(30) NOT NULL DEFAULT 'org',
    "scope_ref" VARCHAR(100),
    "daily_limit" INTEGER NOT NULL DEFAULT 1000,
    "monthly_limit" INTEGER NOT NULL DEFAULT 30000,
    "daily_used" INTEGER NOT NULL DEFAULT 0,
    "monthly_used" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_usage_quotas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_automation_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger_type" VARCHAR(50) NOT NULL,
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_type" "AiServiceType" NOT NULL,
    "prompt_key" VARCHAR(100),
    "actions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_automation_rules_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs
CREATE UNIQUE INDEX "ai_provider_configs_organization_id_provider_key_key" ON "ai_provider_configs"("organization_id", "provider_key");
CREATE INDEX "ai_provider_configs_organization_id_is_active_is_default_idx" ON "ai_provider_configs"("organization_id", "is_active", "is_default");
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_model_definitions_organization_id_model_key_key" ON "ai_model_definitions"("organization_id", "model_key");
CREATE INDEX "ai_model_definitions_organization_id_is_active_idx" ON "ai_model_definitions"("organization_id", "is_active");
ALTER TABLE "ai_model_definitions" ADD CONSTRAINT "ai_model_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_model_definitions" ADD CONSTRAINT "ai_model_definitions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_prompt_templates_organization_id_prompt_key_key" ON "ai_prompt_templates"("organization_id", "prompt_key");
CREATE INDEX "ai_prompt_templates_organization_id_status_idx" ON "ai_prompt_templates"("organization_id", "status");
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_prompt_versions_template_id_version_key" ON "ai_prompt_versions"("template_id", "version");
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ai_prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_copilot_definitions_organization_id_copilot_key_key" ON "ai_copilot_definitions"("organization_id", "copilot_key");
CREATE INDEX "ai_copilot_definitions_organization_id_category_is_active_idx" ON "ai_copilot_definitions"("organization_id", "category", "is_active");
ALTER TABLE "ai_copilot_definitions" ADD CONSTRAINT "ai_copilot_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ai_conversations_organization_id_user_id_status_idx" ON "ai_conversations"("organization_id", "user_id", "status");
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ai_conversation_messages_conversation_id_created_at_idx" ON "ai_conversation_messages"("conversation_id", "created_at");
ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_memory_entries_organization_id_memory_key_user_id_key" ON "ai_memory_entries"("organization_id", "memory_key", "user_id");
CREATE INDEX "ai_memory_entries_organization_id_scope_idx" ON "ai_memory_entries"("organization_id", "scope");
ALTER TABLE "ai_memory_entries" ADD CONSTRAINT "ai_memory_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_rag_documents_organization_id_document_key_key" ON "ai_rag_documents"("organization_id", "document_key");
CREATE INDEX "ai_rag_documents_organization_id_source_type_idx" ON "ai_rag_documents"("organization_id", "source_type");
ALTER TABLE "ai_rag_documents" ADD CONSTRAINT "ai_rag_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ai_rag_chunks_document_id_chunk_index_idx" ON "ai_rag_chunks"("document_id", "chunk_index");
ALTER TABLE "ai_rag_chunks" ADD CONSTRAINT "ai_rag_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ai_rag_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ai_request_logs_organization_id_created_at_idx" ON "ai_request_logs"("organization_id", "created_at");
CREATE INDEX "ai_request_logs_organization_id_user_id_created_at_idx" ON "ai_request_logs"("organization_id", "user_id", "created_at");
CREATE INDEX "ai_request_logs_organization_id_service_type_idx" ON "ai_request_logs"("organization_id", "service_type");
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_usage_quotas_organization_id_scope_scope_ref_key" ON "ai_usage_quotas"("organization_id", "scope", "scope_ref");
ALTER TABLE "ai_usage_quotas" ADD CONSTRAINT "ai_usage_quotas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ai_automation_rules_organization_id_rule_key_key" ON "ai_automation_rules"("organization_id", "rule_key");
CREATE INDEX "ai_automation_rules_organization_id_is_active_idx" ON "ai_automation_rules"("organization_id", "is_active");
ALTER TABLE "ai_automation_rules" ADD CONSTRAINT "ai_automation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
