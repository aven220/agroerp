import { IsArray, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CacheSetDto {
  @ApiProperty() @IsString() @MinLength(1) cacheKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() layer?: string;
  @ApiProperty() @IsObject() value!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ttlSeconds?: number;
}

export class SlowQueryDto {
  @ApiProperty() @IsString() sqlText!: string;
  @ApiProperty() @IsNumber() durationMs!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tableNames?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() rowsExamined?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() planSummary?: Record<string, unknown>;
}

export class PerfMetricDto {
  @ApiProperty() @IsString() metricKey!: string;
  @ApiProperty() @IsString() kind!: string;
  @ApiProperty() @IsNumber() value!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() labels?: Record<string, unknown>;
}

export class PerfMetricBatchDto {
  @ApiProperty() @IsArray() metrics!: PerfMetricDto[];
}

export class BundleMetricDto {
  @ApiProperty() @IsString() bundleKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() sizeBytes!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gzipBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() chunkCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() platform?: string;
}

export class MobilePerfDto {
  @ApiProperty() @IsString() deviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() startupMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() memoryMb?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batteryPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fps?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() syncMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() listRenderMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() offlineOps?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class BenchmarkDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() scenario!: string;
}

export class ArchiveJobDto {
  @ApiProperty() @IsString() tableName!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() olderThanDays?: number;
}

export class PartitionJobDto {
  @ApiProperty() @IsString() tableName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() strategy?: string;
}
