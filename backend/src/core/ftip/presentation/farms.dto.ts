import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { FARM_UNIT_STATUS, type FarmUnitStatus } from '@agroerp/shared';

export class CreateFarmDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  farmName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmCode?: string;

  @ApiProperty()
  @IsString()
  farmTypeCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionSystemCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veredaCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centroidLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centroidLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  boundaryGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  agriculturalAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenureTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  producerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateFarmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionSystemCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veredaCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  agriculturalAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  forestAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenureTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class FarmLifecycleDto {
  @ApiProperty({ enum: FARM_UNIT_STATUS })
  @IsIn([...FARM_UNIT_STATUS])
  toStatus!: FarmUnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class SetGeometryDto {
  @ApiProperty()
  @IsObject()
  geometryGeo!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  captureMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  captureAccuracyM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class LinkProducerDto {
  @ApiProperty()
  @IsUUID()
  producerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationshipType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateParcelDto {
  @ApiProperty()
  @IsString()
  parcelCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parcelName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  boundaryGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  areaHa?: number;
}

export class CreateLotDto {
  @ApiProperty()
  @IsString()
  lotCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  boundaryGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  areaHa?: number;
}

export class CreateCropStandDto {
  @ApiProperty()
  @IsUUID()
  lotUnitId!: string;

  @ApiProperty()
  @IsString()
  speciesCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  varietyCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  densityPlantsHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedYieldKgHa?: number;
}

export class CreateTerritoryDocumentDto {
  @ApiProperty()
  @IsString()
  documentTypeCode!: string;

  @ApiProperty()
  @IsUUID()
  contentId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  gpsGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateNaturalResourceDto {
  @ApiProperty()
  @IsString()
  resourceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geometryGeo?: Record<string, unknown>;
}

export class CreateInfrastructureDto {
  @ApiProperty()
  @IsString()
  infraType!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geometryGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  capacityKgDay?: number;
}

export class CreateRiskDto {
  @ApiProperty()
  @IsString()
  riskTypeCode!: string;

  @ApiProperty()
  @IsString()
  riskLevel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geometryGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SyncFarmItemDto {
  @ApiProperty()
  @IsString()
  externalId!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateFarmDto)
  data!: CreateFarmDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  boundaryGeo?: Record<string, unknown>;
}

export class SyncFarmsDto {
  @ApiProperty({ type: [SyncFarmItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncFarmItemDto)
  items!: SyncFarmItemDto[];
}

export class ImportFarmsDto {
  @ApiProperty({ type: [CreateFarmDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFarmDto)
  items!: CreateFarmDto[];
}
