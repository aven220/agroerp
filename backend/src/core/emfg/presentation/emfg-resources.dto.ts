import { IsEnum, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { EmfgDowntimeType, EmfgResourceAvailabilityStatus, EmfgResourceCaptureType, EmfgResourceEquipmentType } from '@prisma/client';

export class EmfgResLocationDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class EmfgResCellDto {
  @IsString()
  centerKey!: string;

  @IsOptional()
  @IsString()
  lineKey?: string;

  @IsOptional()
  @IsString()
  locationKey?: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  installedCapacity?: number;
}

export class EmfgResScheduleDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityKey!: string;

  @IsString()
  shiftName!: string;

  @IsNumber()
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsNumber()
  capacityMinutes?: number;
}

export class EmfgResEquipmentDto {
  @IsEnum(EmfgResourceEquipmentType)
  equipmentType!: EmfgResourceEquipmentType;

  @IsOptional()
  @IsString()
  machineKey?: string;

  @IsOptional()
  @IsString()
  workCenterKey?: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  yearBuilt?: number;

  @IsOptional()
  @IsString()
  responsibleKey?: string;
}

export class EmfgResAvailabilityDto {
  @IsEnum(EmfgResourceAvailabilityStatus)
  status!: EmfgResourceAvailabilityStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class EmfgResMaintenancePlanDto {
  @IsString()
  equipmentKey!: string;

  @IsOptional()
  @IsNumber()
  intervalDays?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  nextDueAt?: string;
}

export class EmfgResMaintenanceLogDto {
  @IsString()
  equipmentKey!: string;

  @IsString()
  maintenanceType!: 'preventive' | 'corrective';

  @IsOptional()
  @IsString()
  planKey?: string;

  @IsOptional()
  @IsString()
  technicalNotes?: string;
}

export class EmfgResDowntimeDto {
  @IsOptional()
  @IsString()
  equipmentKey?: string;

  @IsOptional()
  @IsString()
  workCenterKey?: string;

  @IsEnum(EmfgDowntimeType)
  downtimeType!: EmfgDowntimeType;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class EmfgResCaptureDto {
  @IsOptional()
  @IsString()
  equipmentKey?: string;

  @IsEnum(EmfgResourceCaptureType)
  captureType!: EmfgResourceCaptureType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  storageUrl?: string;
}

export class EmfgResOfflineBatchDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsArray()
  actions!: Array<{ type: string; equipmentKey?: string; payload: Record<string, unknown> }>;
}
