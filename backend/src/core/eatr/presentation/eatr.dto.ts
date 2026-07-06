import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EatrTraceEventDto {
  @IsString() eventType!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() productionLotId?: string;
  @IsOptional() @IsString() sourceModule?: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EatrProductionLotDto {
  @IsOptional() @IsString() lotType?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsNumber() quantityKg?: number;
}

export class EatrMergeLotsDto {
  @IsArray() sourceLotKeys!: string[];
  @IsOptional() @IsString() targetLotKey?: string;
}

export class EatrSplitLotDto {
  @IsArray() parts!: Array<{ quantityKg: number }>;
}

export class EatrCommercialLotDto {
  @IsOptional() @IsString() productionLotId?: string;
  @IsOptional() @IsString() presentation?: string;
  @IsOptional() @IsNumber() quantityKg?: number;
}

export class EatrCustodyDto {
  @IsOptional() @IsString() productionLotId?: string;
  @IsOptional() @IsString() fromParty?: string;
  @IsOptional() @IsString() toParty?: string;
  @IsOptional() @IsString() fromLocation?: string;
  @IsOptional() @IsString() toLocation?: string;
}

export class EatrHarvestScheduleDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsString() plannedDate!: string;
  @IsOptional() @IsString() crewName?: string;
}

export class EatrHarvestRecordDto {
  @IsNumber() producedKg!: number;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsNumber() lossKg?: number;
  @IsOptional() @IsNumber() wasteKg?: number;
  @IsOptional() @IsNumber() areaHa?: number;
}

export class EatrWeighingDto {
  @IsNumber() grossKg!: number;
  @IsOptional() @IsString() harvestLotKey?: string;
  @IsOptional() @IsNumber() tareKg?: number;
}

export class EatrPostharvestDto {
  @IsString() stepType!: string;
  @IsOptional() @IsString() commercialLotId?: string;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EatrQualityDto {
  @IsOptional() @IsString() commercialLotId?: string;
  @IsOptional() @IsNumber() moisturePct?: number;
  @IsOptional() @IsNumber() defectsPct?: number;
  @IsOptional() @IsString() caliber?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EatrPackageDto {
  @IsString() packageType!: string;
  @IsOptional() @IsString() commercialLotId?: string;
  @IsOptional() @IsString() presentation?: string;
}

export class EatrExportMarketDto {
  @IsString() countryCode!: string;
  @IsString() marketName!: string;
}

export class EatrShipmentDto {
  @IsOptional() @IsString() marketKey?: string;
  @IsOptional() @IsString() containerRef?: string;
  @IsOptional() @IsBoolean() coldChain?: boolean;
}

export class EatrTraceQueryDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() productionLotId?: string;
  @IsOptional() @IsString() commercialKey?: string;
}

export class EatrBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EatrOfflineBatchDto {
  @IsString() batchKey!: string;
  @IsObject() payload!: Record<string, unknown>;
}
