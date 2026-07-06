import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EmfgConsumptionType, EmfgMesCaptureType, EmfgOutputType } from '@prisma/client';

export class EmfgMesExecuteDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  operatorKey?: string;
}

export class EmfgMesConsumeDto {
  @IsOptional()
  @IsString()
  materialKey?: string;

  @IsString()
  componentKey!: string;

  @IsEnum(EmfgConsumptionType)
  consumptionType!: EmfgConsumptionType;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  wasteQty?: number;

  @IsOptional()
  @IsString()
  substituteKey?: string;

  @IsOptional()
  @IsString()
  lotKey?: string;

  @IsOptional()
  @IsString()
  serialKey?: string;

  @IsOptional()
  @IsString()
  authorizedBy?: string;
}

export class EmfgMesProduceDto {
  @IsEnum(EmfgOutputType)
  outputType!: EmfgOutputType;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  orderOpKey?: string;

  @IsOptional()
  @IsString()
  lotKey?: string;

  @IsOptional()
  @IsString()
  serialKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  isPartial?: boolean;
}

export class EmfgMesLotDto {
  @IsString()
  itemKey!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originLotKeys?: string[];

  @IsOptional()
  @IsString()
  destinationKey?: string;
}

export class EmfgMesSerialDto {
  @IsString()
  itemKey!: string;

  @IsOptional()
  @IsString()
  lotKey?: string;

  @IsOptional()
  @IsString()
  serialCode?: string;
}

export class EmfgMesOpExecuteDto {
  @IsOptional()
  @IsString()
  operatorKey?: string;

  @IsOptional()
  @IsString()
  machineKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmfgMesCaptureDto {
  @IsEnum(EmfgMesCaptureType)
  captureType!: EmfgMesCaptureType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  storageUrl?: string;
}

export class EmfgMesOfflineBatchDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsArray()
  actions!: Array<{ type: string; orderKey: string; payload: Record<string, unknown> }>;
}
