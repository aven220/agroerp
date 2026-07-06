import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowDefinitionSchema } from '@agroerp/shared';

export class CreateWorkflowDefinitionDto {
  @ApiProperty() @IsString() @IsNotEmpty() workflowKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiProperty() @IsObject() definition!: WorkflowDefinitionSchema;
}

export class CreateWorkflowVersionDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() definition?: WorkflowDefinitionSchema;
  @ApiPropertyOptional() @IsOptional() @IsString() changelog?: string;
}

export class UpdateWorkflowVersionDto extends CreateWorkflowVersionDto {}

export class CloneWorkflowDefinitionDto {
  @ApiProperty() @IsString() @IsNotEmpty() workflowKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
}

export class ImportWorkflowDefinitionDto {
  @ApiProperty() @IsString() @IsNotEmpty() content!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workflowKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() publish?: boolean;
}

export class StartWorkflowInstanceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() workflowKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() versionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() resourceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() context?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
}

export class ExecuteTransitionDto {
  @ApiProperty() @IsString() @IsNotEmpty() transitionKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() gpsLocation?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsUUID() signatureFileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() instanceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => StartWorkflowInstanceDto)
  start?: StartWorkflowInstanceDto;
}

export class SyncTransitionsDto {
  @ApiProperty({ type: [ExecuteTransitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExecuteTransitionDto)
  transitions!: ExecuteTransitionDto[];
}

export class AddWorkflowCommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() content!: string;
}

export class ReassignTaskDto {
  @ApiProperty() @IsUUID() userId!: string;
}

export class AddWorkflowAttachmentDto {
  @ApiProperty() @IsUUID() fileId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transitionId?: string;
}
