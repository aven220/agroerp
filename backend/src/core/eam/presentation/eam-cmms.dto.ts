import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import {
  EamIncidentSeverity,
  EamIncidentType,
  EamMaintExecutionAction,
  EamMaintPlanType,
  EamMaintPriority,
  EamMaintWorkOrderStatus,
  EamSparePartLineStatus,
  EamWorkOrderCostType,
} from '@prisma/client';

export class EamMaintPlanDto {
  @IsString() assetKey!: string;
  @IsString() name!: string;
  @IsEnum(EamMaintPlanType) planType!: EamMaintPlanType;
  @IsOptional() @IsEnum(EamMaintPriority) priority?: EamMaintPriority;
  @IsOptional() @IsNumber() frequencyValue?: number;
  @IsOptional() @IsString() frequencyUnit?: string;
  @IsOptional() @IsString() checklistKey?: string;
}

export class EamMaintActivityDto {
  @IsString() name!: string;
  @IsOptional() @IsNumber() estimatedHours?: number;
  @IsOptional() @IsString() description?: string;
}

export class EamMaintChecklistDto {
  @IsString() name!: string;
  @IsArray() items!: string[];
}

export class EamWorkOrderDto {
  @IsString() assetKey!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(EamMaintPriority) priority?: EamMaintPriority;
}

export class EamWorkOrderApprovalDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class EamWorkOrderScheduleDto {
  @IsDateString() scheduledAt!: string;
}

export class EamExecutionDto {
  @IsEnum(EamMaintExecutionAction) action!: EamMaintExecutionAction;
  @IsOptional() @IsString() technicianKey?: string;
  @IsOptional() @IsNumber() laborMinutes?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() checklistDone?: unknown[];
}

export class EamAttachmentDto {
  @IsString() attachmentType!: string;
  @IsString() storageUrl!: string;
  @IsOptional() @IsString() title?: string;
}

export class EamMeasurementDto {
  @IsString() metricName!: string;
  @IsNumber() metricValue!: number;
  @IsOptional() @IsString() unit?: string;
}

export class EamTechnicianDto {
  @IsString() name!: string;
  @IsOptional() @IsString() specialtyKey?: string;
}

export class EamCrewDto {
  @IsString() code!: string;
  @IsString() name!: string;
}

export class EamAssignmentDto {
  @IsString() technicianKey!: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class EamSparePartDto {
  @IsString() itemKey!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsOptional() @IsString() lotKey?: string;
  @IsOptional() @IsString() serialNumber?: string;
}

export class EamSparePartStatusDto {
  @IsEnum(EamSparePartLineStatus) status!: EamSparePartLineStatus;
  @IsOptional() @IsNumber() unitCost?: number;
}

export class EamCostDto {
  @IsEnum(EamWorkOrderCostType) costType!: EamWorkOrderCostType;
  @IsNumber() amount!: number;
  @IsOptional() @IsString() description?: string;
}

export class EamIncidentDto {
  @IsString() assetKey!: string;
  @IsEnum(EamIncidentType) incidentType!: EamIncidentType;
  @IsString() title!: string;
  @IsEnum(EamIncidentSeverity) severity!: EamIncidentSeverity;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() impact?: string;
}

export class EamSlaDto {
  @IsString() name!: string;
  @IsNumber() responseHours!: number;
  @IsNumber() repairHours!: number;
  @IsOptional() @IsEnum(EamMaintPriority) priority?: EamMaintPriority;
}

export class EamCalendarDto {
  @IsString() technicianKey!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

export class EamSignDto {
  @IsString() signatureUrl!: string;
}

export class EamCmmsOfflineBatchDto {
  @IsString() deviceId!: string;
  operations!: unknown[];
}
