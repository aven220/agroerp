import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CaptureSyncSubmissionItemDto {
  @ApiProperty()
  @IsString()
  formId!: string;

  @ApiPropertyOptional({ description: 'Fallback si formId local quedó desfasado' })
  @IsOptional()
  @IsString()
  formKey?: string;

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

export class CaptureSyncFileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;
}

export class CaptureSyncDto {
  @ApiProperty({ type: [CaptureSyncSubmissionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptureSyncSubmissionItemDto)
  submissions!: CaptureSyncSubmissionItemDto[];

  @ApiPropertyOptional({ type: [CaptureSyncFileDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptureSyncFileDto)
  files?: CaptureSyncFileDto[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;
}
