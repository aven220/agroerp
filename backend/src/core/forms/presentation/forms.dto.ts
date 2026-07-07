import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormDefinitionSchema, FormFieldDefinition } from '@agroerp/shared';

export class CreateFormDto {
  @ApiProperty({ example: 'field-inspection' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  formKey!: string;

  @ApiProperty({ example: 'Inspección de campo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  schema!: FormDefinitionSchema;
}

export class UpdateFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  schema?: FormDefinitionSchema;
}

export class RenderFormDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  partialData?: Record<string, unknown>;
}

export class SubmitFormDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  gpsLocation?: { lat: number; lng: number; accuracy?: number };

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  gpsTrack?: { lat: number; lng: number; timestamp?: string }[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client-generated id for offline sync' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class SyncSubmissionsDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncSubmissionItemDto)
  submissions!: SyncSubmissionItemDto[];
}

export class SyncSubmissionItemDto {
  @ApiProperty()
  @IsString()
  formId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  externalId!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  gpsLocation?: { lat: number; lng: number; accuracy?: number };

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  gpsTrack?: { lat: number; lng: number; timestamp?: string }[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientCreatedAt?: string;
}

// Re-export for type usage in services
export type { FormFieldDefinition };

export class DuplicateFormDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newFormKey!: string;
}

export class LifecycleNotesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class CreateFormTemplateDto {
  @ApiProperty()
  @IsString()
  templateKey!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectorCode?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  schema!: FormDefinitionSchema;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;
}

export class InstantiateTemplateDto {
  @ApiProperty()
  @IsString()
  formKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateFormAssignmentDto {
  @ApiProperty()
  @IsString()
  formId!: string;

  @ApiProperty()
  @IsString()
  assigneeType!: string;

  @ApiProperty()
  @IsString()
  assigneeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;
}

export class CreateFormCampaignDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  formId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  expectedCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: {
    zones?: string[];
    municipalities?: string[];
    farms?: string[];
    assigneeUserIds?: string[];
  };
}

export class UpdateFormCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  expectedCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: {
    zones?: string[];
    municipalities?: string[];
    farms?: string[];
    assigneeUserIds?: string[];
  };
}

export class ImportFormsDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  forms!: Array<{
    formKey: string;
    name: string;
    description?: string;
    sectorCode?: string;
    schema?: FormDefinitionSchema;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
