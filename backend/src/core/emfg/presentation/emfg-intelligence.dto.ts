import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { EmfgIntelligenceExportFormat, EmfgIntelligenceSimulationType } from '@prisma/client';

export class EmfgIntelligenceSimulationDto {
  @IsString()
  name!: string;

  @IsEnum(EmfgIntelligenceSimulationType)
  simulationType!: EmfgIntelligenceSimulationType;

  @IsObject()
  inputParams!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isAuthorized?: boolean;
}

export class EmfgIntelligenceCompareDto {
  @IsString({ each: true })
  simulationKeys!: string[];
}

export class EmfgIntelligenceExportDto {
  @IsString()
  exportType!: string;

  @IsEnum(EmfgIntelligenceExportFormat)
  format!: EmfgIntelligenceExportFormat;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class EmfgIntelligenceAiRequestDto {
  @IsObject()
  payload!: Record<string, unknown>;
}

export class EmfgIntelligenceFiltersDto {
  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  entityKey?: string;

  @IsOptional()
  @IsString()
  centerKey?: string;

  @IsOptional()
  @IsString()
  lineKey?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
