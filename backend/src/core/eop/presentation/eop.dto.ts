import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestLogDto {
  @ApiProperty() @IsString() level!: string;
  @ApiProperty() @IsString() component!: string;
  @ApiProperty() @IsString() serviceName!: string;
  @ApiProperty() @IsString() message!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() traceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() spanId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class IngestLogBatchDto {
  @ApiProperty() @IsArray() logs!: IngestLogDto[];
}

export class IngestTraceSpanDto {
  @ApiProperty() @IsString() traceId!: string;
  @ApiProperty() @IsString() spanId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentSpanId?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() component!: string;
  @ApiProperty() @IsString() serviceName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statusCode?: string;
  @ApiProperty() @IsNumber() durationMs!: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @ApiProperty() @IsString() startedAt!: string;
  @ApiProperty() @IsString() endedAt!: string;
}

export class IngestMetricDto {
  @ApiProperty() @IsString() metricKey!: string;
  @ApiProperty() @IsString() kind!: string;
  @ApiProperty() @IsNumber() value!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apiPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() labels?: Record<string, unknown>;
}

export class IngestMetricBatchDto {
  @ApiProperty() @IsArray() metrics!: IngestMetricDto[];
}

export class TrackErrorDto {
  @ApiProperty() @IsString() component!: string;
  @ApiProperty() @IsString() serviceName!: string;
  @ApiProperty() @IsString() message!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stackTrace?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() traceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class CreateAlertRuleDto {
  @ApiProperty() @IsString() @MinLength(2) ruleKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() component?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metricKind?: string;
  @ApiProperty() @IsString() operator!: string;
  @ApiProperty() @IsNumber() threshold!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() windowSeconds?: number;
}

export class OpenIncidentDto {
  @ApiProperty() @IsString() @MinLength(2) incidentKey!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() component?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceName?: string;
}

export class UpdateIncidentStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class IngestRumDto {
  @ApiProperty() @IsString() sessionId!: string;
  @ApiProperty() @IsString() pagePath!: string;
  @ApiProperty() @IsString() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() durationMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() userAgent?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class IngestMobileDto {
  @ApiProperty() @IsString() deviceId!: string;
  @ApiProperty() @IsString() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stackTrace?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() durationMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOffline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() appVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class IngestMobileBatchDto {
  @ApiProperty() @IsArray() events!: IngestMobileDto[];
}

export class RecordAiUsageDto {
  @ApiProperty() @IsString() modelKey!: string;
  @ApiProperty() @IsString() provider!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tokensIn?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tokensOut?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costUsd?: number;
  @ApiProperty() @IsNumber() durationMs!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() success?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() qualityScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() errorMessage?: string;
}

export class RegisterSyntheticDto {
  @ApiProperty() @IsString() checkKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() targetUrl!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() expectedStatus?: number;
}
