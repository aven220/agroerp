import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateLayerDto {
  @ApiProperty()
  @IsString()
  layerCode!: string;

  @ApiProperty()
  @IsString()
  layerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  layerType?: string;

  @ApiProperty()
  @IsString()
  sourceModule!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sourceQuery?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geometryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  styleRules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minZoom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxZoom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refreshIntervalMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class GeometryDto {
  @ApiProperty()
  @IsObject()
  geometry!: Record<string, unknown>;
}

export class MeasureDistanceDto {
  @ApiProperty()
  @IsNumber()
  lat1!: number;

  @ApiProperty()
  @IsNumber()
  lng1!: number;

  @ApiProperty()
  @IsNumber()
  lat2!: number;

  @ApiProperty()
  @IsNumber()
  lng2!: number;
}

export class BufferDto {
  @ApiProperty()
  @IsObject()
  geometry!: Record<string, unknown>;

  @ApiProperty()
  @IsNumber()
  distanceM!: number;
}

export class IntersectDto {
  @ApiProperty()
  @IsObject()
  geometryA!: Record<string, unknown>;

  @ApiProperty()
  @IsObject()
  geometryB!: Record<string, unknown>;
}

export class ContainsDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiProperty()
  @IsObject()
  geometry!: Record<string, unknown>;
}

export class GeofenceCheckDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}

export class CreateGeofenceDto {
  @ApiProperty()
  @IsString()
  geofenceCode!: string;

  @ApiProperty()
  @IsString()
  geofenceName!: string;

  @ApiProperty()
  @IsString()
  entityType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty()
  @IsString()
  geometryType!: string;

  @ApiProperty()
  @IsObject()
  geometry!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  radiusM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertOnEnter?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertOnExit?: boolean;
}

export class RouteStopDto {
  @ApiProperty()
  @IsString()
  stopName!: string;

  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  routeCode!: string;

  @ApiProperty()
  @IsString()
  routeName!: string;

  @ApiProperty({ type: [RouteStopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops!: RouteStopDto[];
}

export class OptimizeRouteDto {
  @ApiProperty({ type: [RouteStopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops!: RouteStopDto[];
}

export class AnalysisDto {
  @ApiProperty()
  @IsString()
  analysisType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}

export class ImportGeoDto {
  @ApiProperty()
  @IsString()
  format!: string;

  @ApiProperty()
  @IsString()
  layerCode!: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;
}

export class ExportGeoDto {
  @ApiProperty()
  @IsString()
  format!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  layerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  features?: Record<string, unknown>[];
}

export class GeocodeDto {
  @ApiProperty()
  @IsString()
  query!: string;
}

export class ReverseGeocodeDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;
}

export class MobileSyncDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tracks?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  captures?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  layerRefresh?: boolean;
}

export class ClusterDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  points!: Array<{ lat: number; lng: number; properties?: Record<string, unknown> }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cellSizeDeg?: number;
}
