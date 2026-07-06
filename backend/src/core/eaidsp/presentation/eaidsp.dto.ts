import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AI_COPILOT_CATEGORIES, AI_PROVIDER_TYPES, AI_RAG_SOURCE_TYPES, AI_SERVICE_TYPES } from '@agroerp/shared';

export class AiChatDto {
  @IsString() prompt!: string;
  @IsOptional() @IsString() copilotKey?: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() moduleContext?: string;
  @IsOptional() @IsBoolean() useRag?: boolean;
  @IsOptional() @IsObject() variables?: Record<string, unknown>;
}

export class AiServiceInvokeDto {
  @IsIn([...AI_SERVICE_TYPES]) serviceType!: string;
  @IsString() prompt!: string;
  @IsOptional() @IsString() moduleContext?: string;
  @IsOptional() @IsBoolean() useRag?: boolean;
}

export class CreateProviderDto {
  @IsString() @MaxLength(50) providerKey!: string;
  @IsIn([...AI_PROVIDER_TYPES]) providerType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() apiKeyRef?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class UpdateProviderDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() apiKeyRef?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class CreateModelDto {
  @IsString() providerId!: string;
  @IsString() modelKey!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() modelType?: string;
  @IsOptional() @IsArray() capabilities?: string[];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CreatePromptDto {
  @IsString() promptKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn([...AI_SERVICE_TYPES]) serviceType?: string;
  @IsString() template!: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsArray() variables?: unknown[];
}

export class PromptVersionDto {
  @IsString() template!: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsString() changelog?: string;
}

export class PromptTestDto {
  @IsObject() variables!: Record<string, string>;
}

export class IndexRagDto {
  @IsString() documentKey!: string;
  @IsString() title!: string;
  @IsIn([...AI_RAG_SOURCE_TYPES]) sourceType!: string;
  @IsOptional() @IsString() sourceRef?: string;
  @IsString() content!: string;
}

export class RagSearchDto {
  @IsString() query!: string;
  @IsOptional() limit?: number;
}

export class CreateAutomationDto {
  @IsString() ruleKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() triggerType!: string;
  @IsOptional() @IsArray() eventTypes?: string[];
  @IsIn([...AI_SERVICE_TYPES]) serviceType!: string;
  @IsOptional() @IsString() promptKey?: string;
  @IsOptional() @IsArray() actions?: unknown[];
}

export class MemoryDto {
  @IsString() memoryKey!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() scope?: string;
}
