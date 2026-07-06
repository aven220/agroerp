import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBreRuleDto {
  @ApiProperty() @IsString() @MinLength(2) ruleKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() triggerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() eventTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() eventCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() expressions?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() actions?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() dependencies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() schedule?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() decisionTableKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateBreRuleDto extends CreateBreRuleDto {}

export class CloneBreRuleDto {
  @ApiProperty() @IsString() newKey!: string;
  @ApiProperty() @IsString() newName!: string;
}

export class SimulateBreRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() eventType?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() event?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
}

export class SimulateBatchDto {
  @ApiProperty() @IsString() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class CreateBreGroupDto {
  @ApiProperty() @IsString() groupKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateDecisionTableDto {
  @ApiProperty() @IsString() tableKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() inputs?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() outputs?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() rows?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() hitPolicy?: string;
}

export class ImportBreRuleDto extends CreateBreRuleDto {}
