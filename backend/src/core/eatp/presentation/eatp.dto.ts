import { IsArray, IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class EatpCreateCampaignDto {
  @IsString() campaignKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() seasonKey?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() budgetAmount?: number;
  @IsOptional() @IsArray() objectives?: unknown[];
  @IsOptional() @IsUUID() responsibleId?: string;
}

export class EatpCreateSeasonDto {
  @IsString() seasonKey!: string;
  @IsString() name!: string;
  @IsNumber() yearFrom!: number;
  @IsOptional() @IsNumber() yearTo?: number;
}

export class EatpCreateTaskDto {
  @IsOptional() @IsUUID() fieldLotId?: string;
  @IsOptional() @IsString() campaignId?: string;
  @IsString() laborType!: string;
  @IsString() title!: string;
  @IsOptional() @IsDateString() scheduledDate?: string;
  @IsOptional() @IsArray() crewIds?: string[];
  @IsOptional() @IsArray() equipmentIds?: string[];
  @IsOptional() @IsArray() inputsPlanned?: unknown[];
  @IsOptional() @IsNumber() areaTreatedHa?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() externalId?: string;
}

export class EatpRecordLaborDto {
  @IsUUID() fieldLotId!: string;
  @IsString() laborType!: string;
  @IsDateString() operationDate!: string;
  @IsNumber() areaTreatedHa!: number;
  @IsOptional() @IsArray() inputsUsed?: unknown[];
  @IsOptional() @IsArray() equipmentUsed?: unknown[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsObject() gpsGeo?: Record<string, unknown>;
}

export class EatpScheduleEntryDto {
  @IsString() title!: string;
  @IsString() entryType!: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() campaignId?: string;
  @IsOptional() @IsUUID() fieldLotId?: string;
  @IsOptional() @IsUUID() farmUnitId?: string;
  @IsOptional() @IsArray() crewIds?: string[];
  @IsOptional() @IsArray() equipmentIds?: string[];
  @IsOptional() @IsArray() resourceRefs?: unknown[];
}

export class EatpCropRegistryDto {
  @IsString() registryKey!: string;
  @IsString() cropCode!: string;
  @IsOptional() @IsUUID() fieldLotId?: string;
  @IsOptional() @IsString() ftipCropStandId?: string;
  @IsOptional() @IsString() varietyCode?: string;
  @IsOptional() @IsString() speciesCode?: string;
  @IsOptional() @IsString() seedLotRef?: string;
  @IsOptional() @IsDateString() plantingDate?: string;
  @IsOptional() @IsDateString() harvestEstDate?: string;
  @IsOptional() @IsString() phenoStage?: string;
  @IsOptional() @IsNumber() densityPlantsHa?: number;
  @IsOptional() @IsString() plantingPattern?: string;
}

export class EatpInputBindingDto {
  @IsString() category!: string;
  @IsOptional() @IsString() eimsItemId?: string;
  @IsOptional() @IsString() itemCode?: string;
  @IsOptional() @IsString() unitCode?: string;
  @IsOptional() @IsString() taskId?: string;
  @IsOptional() @IsNumber() quantity?: number;
}

export class EatpQrRegisterDto {
  @IsString() qrCode!: string;
  @IsString() entityType!: string;
  @IsString() entityId!: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EatpBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EatpOfflineBatchDto {
  @IsString() batchKey!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EatpCampaignStatusDto {
  @IsString() status!: 'active' | 'completed' | 'archived';
}
