import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EmfgCostLineType, EmfgCostScope } from '@prisma/client';

export class EmfgCostVersionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsArray()
  lines?: Array<{ scope: EmfgCostScope; refKey: string; itemKey?: string; unitCost: number; quantity?: number }>;
}

export class EmfgCostLineUpdateDto {
  @IsNumber()
  unitCost!: number;
}

export class EmfgCostActualDto {
  @IsEnum(EmfgCostLineType)
  lineType!: EmfgCostLineType;

  @IsOptional()
  @IsString()
  componentKey?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitCost!: number;

  @IsOptional()
  @IsString()
  lotKey?: string;
}

export class EmfgCostComputeDto {
  @IsOptional()
  @IsNumber()
  salesPrice?: number;
}
