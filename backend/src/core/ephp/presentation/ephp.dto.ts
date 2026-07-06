import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EphpPestCatalogDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() classification!: string;
  @IsOptional() @IsString() biologicalCycle?: string;
  @IsOptional() @IsArray() affectedCrops?: string[];
}

export class EphpPestRecordDto {
  @IsString() pestKey!: string;
  @IsString() infestationLevel!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class EphpDiseaseCatalogDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() causalAgent?: string;
  @IsOptional() @IsString() symptoms?: string;
  @IsOptional() @IsArray() affectedCrops?: string[];
}

export class EphpDiseaseRecordDto {
  @IsString() diseaseKey!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsObject() incidenceMap?: Record<string, unknown>;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class EphpMonitoringDto {
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() monitoringType?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() severityScale?: number;
  @IsOptional() @IsArray() photoRefs?: string[];
  @IsOptional() @IsArray() videoRefs?: string[];
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsArray() findings?: unknown[];
}

export class EphpTreatmentDto {
  @IsString() name!: string;
  @IsString() treatmentType!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsBoolean() isPreventive?: boolean;
}

export class EphpApplicationDto {
  @IsString() productName!: string;
  @IsOptional() @IsString() treatmentKey?: string;
  @IsOptional() @IsString() activeIngredient?: string;
  @IsOptional() @IsNumber() dose?: number;
  @IsOptional() @IsString() doseUnit?: string;
  @IsOptional() @IsNumber() volumeL?: number;
  @IsOptional() @IsString() equipment?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsObject() climateConditions?: Record<string, unknown>;
}

export class EphpIpmPlanDto {
  @IsString() name!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsNumber() actionThreshold?: number;
}

export class EphpIpmEvalDto {
  @IsOptional() @IsNumber() effectiveness?: number;
  @IsOptional() @IsString() notes?: string;
}

export class EphpIntervalRuleDto {
  @IsString() productName!: string;
  @IsOptional() @IsString() activeIngredient?: string;
  @IsOptional() @IsNumber() preHarvestDays?: number;
  @IsOptional() @IsNumber() reEntryHours?: number;
  @IsOptional() @IsBoolean() harvestBlocked?: boolean;
  @IsOptional() @IsBoolean() accessBlocked?: boolean;
}

export class EphpMrlDto {
  @IsString() countryCode!: string;
  @IsString() activeIngredient!: string;
  @IsNumber() maxResiduePpm!: number;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsString() marketType?: string;
}

export class EphpMrlValidateDto {
  @IsString() activeIngredient!: string;
  @IsString() countryCode!: string;
  @IsNumber() residuePpm!: number;
  @IsOptional() @IsString() cropCode?: string;
}

export class EphpFrameworkDto {
  @IsString() name!: string;
  @IsString() frameworkType!: string;
}

export class EphpChecklistDto {
  @IsString() frameworkKey!: string;
  @IsString() title!: string;
  @IsArray() items!: unknown[];
  @IsOptional() @IsNumber() completedPct?: number;
}

export class EphpGenerateAlertsDto {
  @IsOptional() @IsString() infestationLevel?: string;
  @IsOptional() @IsString() diseaseSeverity?: string;
  @IsOptional() @IsBoolean() mrlCompliant?: boolean;
  @IsOptional() @IsBoolean() intervalActive?: boolean;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EphpBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EphpOfflineBatchDto {
  @IsString() batchKey!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EphpIpmEvaluateDto {
  @IsString() infestationLevel!: string;
  @IsNumber() threshold!: number;
}
