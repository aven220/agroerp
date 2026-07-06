import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { FIELD_LOT_STATUS, FIELD_OPERATION_TYPES, type FieldLotStatus } from '@agroerp/shared';

export class CreateFieldLotDto {
  @ApiProperty()
  @IsUUID()
  ftipLotUnitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotCode?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lotName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cultivableAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  plantedAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unproductiveAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryCropCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  varietyCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expectedYieldKgHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionSystemCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  altitudeM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  slopePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soilTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landUseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleProducerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateFieldLotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cultivableAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  plantedAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unproductiveAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soilTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landUseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleProducerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  version?: number;
}

export class FieldLotLifecycleDto {
  @ApiProperty({ enum: FIELD_LOT_STATUS })
  @IsIn([...FIELD_LOT_STATUS])
  toStatus!: FieldLotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class UpdateAgronomicStateDto {
  @ApiProperty()
  @IsString()
  primaryCropCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ftipCropStandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  varietyCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  densityPlantsHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expectedYieldKgHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phenologicalStageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  irrigationTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionSystemCode?: string;
}

export class CreateFieldOperationDto {
  @ApiProperty({ enum: FIELD_OPERATION_TYPES })
  @IsIn([...FIELD_OPERATION_TYPES])
  operationTypeCode!: string;

  @ApiProperty()
  @IsDateString()
  operationDate!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.0001)
  areaTreatedHa!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  performedByType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  performerIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managementZoneOpId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  inputsUsed?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  equipmentUsed?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  weatherConditions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  laborCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  inputCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  equipmentCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  transportCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  gpsGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  formSubmissionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  evidenceDocumentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  signatureContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class CreateLotCostDto {
  @ApiProperty()
  @IsString()
  campaignCode!: string;

  @ApiProperty()
  @IsString()
  costCategoryCode!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty()
  @IsDateString()
  costDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateHarvestDto {
  @ApiProperty()
  @IsString()
  campaignCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  harvestedAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualityGradeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fieldOperationId?: string;
}

export class CreateLotDocumentDto {
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
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

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
  @IsDateString()
  capturedAt?: string;
}

export class CreateManagementZoneDto {
  @ApiProperty()
  @IsString()
  zoneCode!: string;

  @ApiProperty()
  @IsString()
  zoneName!: string;

  @ApiProperty()
  @IsString()
  zoneType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  applicationGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  areaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recommendationProfile?: Record<string, unknown>;
}

export class CreateSensorBindingDto {
  @ApiProperty()
  @IsString()
  sensorType!: string;

  @ApiProperty()
  @IsString()
  externalDeviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  locationGeo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  alertThresholds?: Record<string, unknown>;
}

export class SetLotGeometryDto {
  @ApiProperty()
  @IsObject()
  applicationGeo!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class ImportLotsDto {
  @ApiProperty({ type: [CreateFieldLotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldLotDto)
  items!: CreateFieldLotDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}

export class SyncLotItemDto {
  @ApiProperty()
  @IsString()
  externalId!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateFieldLotDto)
  data!: CreateFieldLotDto;
}

export class SyncOperationItemDto {
  @ApiProperty()
  @IsString()
  externalId!: string;

  @ApiProperty()
  @IsUUID()
  fieldLotId!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateFieldOperationDto)
  data!: CreateFieldOperationDto;
}

export class SyncLotsDto {
  @ApiPropertyOptional({ type: [SyncLotItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncLotItemDto)
  lots?: SyncLotItemDto[];

  @ApiPropertyOptional({ type: [SyncOperationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationItemDto)
  operations?: SyncOperationItemDto[];
}

export class VoidOperationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
