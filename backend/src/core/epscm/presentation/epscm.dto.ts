import { IsDateString, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { EpscmReplenishmentMode, EpscmReplenishmentType } from '@prisma/client';

export class EpscmForecastVersionDto {
  @IsString()
  name!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class EpscmManualForecastDto {
  @IsString()
  itemKey!: string;

  @IsNumber()
  manualQty!: number;
}

export class EpscmDemandHistoryDto {
  @IsString()
  itemKey!: string;

  @IsDateString()
  periodDate!: string;

  @IsNumber()
  actualQty!: number;

  @IsOptional()
  @IsString()
  warehouseKey?: string;
}

export class EpscmReplenishmentPolicyDto {
  @IsString()
  itemKey!: string;

  @IsOptional()
  @IsString()
  warehouseKey?: string;

  @IsOptional()
  @IsNumber()
  minStock?: number;

  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @IsOptional()
  @IsNumber()
  safetyStock?: number;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsEnum(EpscmReplenishmentMode)
  replenishmentMode?: EpscmReplenishmentMode;
}

export class EpscmManualProposalDto {
  @IsString()
  itemKey!: string;

  @IsNumber()
  proposedQty!: number;

  @IsEnum(EpscmReplenishmentType)
  proposalType!: EpscmReplenishmentType;

  @IsOptional()
  @IsString()
  warehouseKey?: string;
}

export class EpscmSupplyPlanDto {
  @IsString()
  name!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  dcKey?: string;

  @IsOptional()
  @IsString()
  companyKey?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsObject()
  constraints?: Record<string, unknown>;
}

export class EpscmSupplyPlanLineDto {
  @IsString()
  itemKey!: string;

  @IsNumber()
  plannedQty!: number;

  @IsOptional()
  @IsString()
  warehouseKey?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class EpscmPlanningCycleDto {
  @IsString()
  versionKey!: string;
}
