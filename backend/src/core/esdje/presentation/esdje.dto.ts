import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEsdjeJobDto {
  @ApiProperty() @IsString() @MinLength(2) jobKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobType?: string;
  @ApiProperty() @IsString() handlerType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() queueKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() schedule?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() cronExpression?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() runAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() eventTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() dependencies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() maxRetries?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() retryStrategy?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() retryDelayMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() timeoutMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() parallelism?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() businessDaysOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateEsdjeJobDto extends CreateEsdjeJobDto {}

export class CloneEsdjeJobDto {
  @ApiProperty() @IsString() newKey!: string;
  @ApiProperty() @IsString() newName!: string;
}

export class CreateEsdjeQueueDto {
  @ApiProperty() @IsString() queueKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxConcurrency?: number;
}

export class CreateMaintenanceWindowDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() startsAt!: string;
  @ApiProperty() @IsString() endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() blockAllJobs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() allowedQueues?: string[];
}
