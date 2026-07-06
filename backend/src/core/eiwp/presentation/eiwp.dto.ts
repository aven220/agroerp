import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EiwpRegisterSourceDto {
  @IsString() name!: string;
  @IsString() sourceType!: string;
  @IsOptional() @IsNumber() capacityM3?: number;
  @IsOptional() @IsNumber() currentLevelM3?: number;
  @IsOptional() @IsString() farmUnitId?: string;
}

export class EiwpRegisterNetworkDto {
  @IsString() name!: string;
  @IsString() networkType!: string;
  @IsOptional() @IsString() sourceId?: string;
}

export class EiwpRegisterSectorDto {
  @IsString() name!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() networkId?: string;
  @IsOptional() @IsNumber() areaHa?: number;
  @IsOptional() @IsString() method?: string;
}

export class EiwpLogConsumptionDto {
  @IsOptional() @IsString() sourceId?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() sectorId?: string;
  @IsNumber() volumeM3!: number;
}

export class EiwpScheduleIrrigationDto {
  @IsOptional() @IsString() sectorId?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsString() method!: string;
  @IsOptional() @IsString() mode?: string;
  @IsString() plannedStart!: string;
  @IsOptional() @IsString() plannedEnd?: string;
  @IsOptional() @IsNumber() volumeM3?: number;
}

export class EiwpRescheduleDto {
  @IsString() plannedStart!: string;
  @IsOptional() @IsString() plannedEnd?: string;
}

export class EiwpCompleteIrrigationDto {
  @IsOptional() @IsNumber() volumeM3?: number;
  @IsOptional() @IsNumber() durationMin?: number;
}

export class EiwpRegisterStationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() stationOrigin?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class EiwpWeatherReadingDto {
  @IsString() stationKey!: string;
  @IsString() metric!: string;
  @IsNumber() value!: number;
  @IsOptional() @IsString() unit?: string;
}

export class EiwpForecastDto {
  @IsString() horizon!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsString() validFrom!: string;
  @IsString() validTo!: string;
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsString() providerKey?: string;
}

export class EiwpComputeBalanceDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() sectorId?: string;
  @IsString() periodStart!: string;
  @IsString() periodEnd!: string;
  @IsOptional() @IsNumber() appliedWaterMm?: number;
  @IsOptional() @IsNumber() rainfallMm?: number;
  @IsOptional() @IsNumber() etMm?: number;
  @IsOptional() @IsNumber() cropDemandMm?: number;
}

export class EiwpGenerateAlertsDto {
  @IsOptional() @IsNumber() temperatureC?: number;
  @IsOptional() @IsNumber() humidityPct?: number;
  @IsOptional() @IsNumber() windSpeedKmh?: number;
  @IsOptional() @IsNumber() precipitationMm?: number;
  @IsOptional() @IsNumber() deficitMm?: number;
  @IsOptional() @IsNumber() excessMm?: number;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EiwpAutomationDeviceDto {
  @IsString() name!: string;
  @IsString() deviceType!: string;
  @IsOptional() @IsString() sectorId?: string;
}

export class EiwpAutomationCommandDto {
  @IsString() deviceKey!: string;
  @IsString() commandType!: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EiwpRecommendationDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() phenologyStage?: string;
  @IsOptional() @IsString() soilType?: string;
  @IsNumber() deficitMm!: number;
  @IsNumber() excessMm!: number;
  @IsNumber() availabilityM3!: number;
  @IsOptional() @IsNumber() temperatureC?: number;
}

export class EiwpRainfallDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsNumber() depthMm!: number;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EiwpIncidentDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsString() incidentType!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EiwpBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EiwpOfflineBatchDto {
  @IsString() batchKey!: string;
  @IsObject() payload!: Record<string, unknown>;
}
