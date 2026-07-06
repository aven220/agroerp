import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EappMeasureAreaDto {
  @IsObject()
  geometry!: Record<string, unknown>;
}

export class EappMeasureDistanceDto {
  @IsNumber()
  lat1!: number;

  @IsNumber()
  lng1!: number;

  @IsNumber()
  lat2!: number;

  @IsNumber()
  lng2!: number;
}

export class EappMeasureLineDto {
  @IsArray()
  coordinates!: number[][];
}

export class EappPolygonEditDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityKey!: string;

  @IsObject()
  before!: Record<string, unknown>;

  @IsObject()
  after!: Record<string, unknown>;
}

export class EappCreatePoiDto {
  @IsString()
  name!: string;

  @IsString()
  poiType!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  altitudeM?: number;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsString()
  farmUnitId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class EappCreateInfraDto {
  @IsString()
  name!: string;

  @IsString()
  infraType!: string;

  @IsObject()
  geometry!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsString()
  farmUnitId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class EappCreateSubdivisionDto {
  @IsString()
  parentLotId!: string;

  @IsString()
  childLotCode!: string;

  @IsString()
  name!: string;

  @IsObject()
  geometry!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  coords?: Array<[number, number]>;
}

export class EappCreateThematicMapDto {
  @IsString()
  name!: string;

  @IsString()
  mapType!: string;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsString()
  campaignKey?: string;

  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isHistorical?: boolean;
}

export class EappCreateCustomIndexDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  formula?: string;
}

export class EappRecordIndexReadingDto {
  @IsString()
  indexKey!: string;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  rasterRef?: string;
}

export class EappRegisterDeviceDto {
  @IsString()
  name!: string;

  @IsString()
  deviceType!: string;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsString()
  farmUnitId?: string;

  @IsOptional()
  @IsString()
  vendor?: string;
}

export class EappIngestReadingDto {
  @IsString()
  deviceKey!: string;

  @IsString()
  metric!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class EappDroneAssetDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class EappDroneMissionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsString()
  farmUnitId?: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  plannedAt?: string;
}

export class EappDroneFlightDto {
  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsNumber()
  photoCount?: number;

  @IsOptional()
  @IsBoolean()
  hasOrtomosaic?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDem?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPointCloud?: boolean;
}

export class EappRecordInspectionDto {
  @IsOptional()
  @IsString()
  fieldLotId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  photoRefs?: string[];

  @IsOptional()
  @IsArray()
  findings?: unknown[];
}

export class EappBridgeDto {
  @IsString()
  moduleRef!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class EappOfflineBatchDto {
  @IsString()
  batchKey!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class EappSatelliteSceneDto {
  @IsString()
  sourceVendor!: string;

  @IsOptional()
  @IsString()
  sceneKey?: string;

  @IsOptional()
  @IsNumber()
  cloudCoverPct?: number;
}
