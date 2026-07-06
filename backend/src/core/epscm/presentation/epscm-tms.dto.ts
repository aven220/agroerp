import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  EpscmTmsCostCategory,
  EpscmTmsDriverStatus,
  EpscmTmsDriverType,
  EpscmTmsOptimizationMode,
  EpscmTmsTelemetrySlotType,
  EpscmTmsTripStatus,
  EpscmTmsVehicleOwnership,
} from '@prisma/client';

export class EpscmTmsVehicleTypeDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() maxWeight?: number;
  @IsOptional() @IsNumber() maxVolume?: number;
}

export class EpscmTmsVehicleDto {
  @IsString() typeKey!: string;
  @IsString() code!: string;
  @IsString() plateNumber!: string;
  @IsOptional() @IsEnum(EpscmTmsVehicleOwnership) ownership?: EpscmTmsVehicleOwnership;
  @IsOptional() @IsNumber() maxWeight?: number;
  @IsOptional() @IsNumber() maxVolume?: number;
}

export class EpscmTmsVehicleDocDto {
  @IsString() docType!: string;
  @IsOptional() @IsString() docNumber?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() storageUrl?: string;
}

export class EpscmTmsDriverDto {
  @IsString() code!: string;
  @IsString() fullName!: string;
  @IsOptional() @IsEnum(EpscmTmsDriverType) driverType?: EpscmTmsDriverType;
  @IsOptional() @IsString() phone?: string;
}

export class EpscmTmsLicenseDto {
  @IsString() category!: string;
  @IsString() licenseNumber!: string;
  @IsOptional() @IsString() expiresAt?: string;
}

export class EpscmTmsRouteDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() scheduledDate?: string;
  @IsOptional() @IsEnum(EpscmTmsOptimizationMode) optimizationMode?: EpscmTmsOptimizationMode;
}

export class EpscmTmsRouteStopDto {
  @IsOptional() @IsString() orderKey?: string;
  @IsOptional() @IsString() customerKey?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() windowStart?: string;
  @IsOptional() @IsString() windowEnd?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() volume?: number;
}

export class EpscmTmsOptimizeDto {
  @IsEnum(EpscmTmsOptimizationMode) mode!: EpscmTmsOptimizationMode;
  @IsOptional() @IsNumber() maxWeight?: number;
  @IsOptional() @IsNumber() maxVolume?: number;
}

export class EpscmTmsAutoRouteDto {
  @IsArray() @IsString({ each: true }) orderKeys!: string[];
}

export class EpscmTmsRescheduleDto {
  @IsString() scheduledDate!: string;
}

export class EpscmTmsScheduleTripDto {
  @IsOptional() @IsString() routeKey?: string;
  @IsOptional() @IsString() scheduledAt?: string;
}

export class EpscmTmsAssignVehicleDto {
  @IsString() vehicleKey!: string;
}

export class EpscmTmsAssignDriverDto {
  @IsString() driverKey!: string;
}

export class EpscmTmsAssignOrdersDto {
  @IsArray() @IsString({ each: true }) orderKeys!: string[];
}

export class EpscmTmsIncidentDto {
  @IsString() incidentType!: string;
  @IsString() description!: string;
}

export class EpscmTmsCloseTripDto {
  @IsOptional() @IsString() observations?: string;
}

export class EpscmTmsDeliveryCompleteDto {
  @IsNumber() deliveredQty!: number;
  @IsOptional() @IsString() issueNotes?: string;
}

export class EpscmTmsDeliveryRejectDto {
  @IsString() rejectionReason!: string;
}

export class EpscmTmsBarcodeDeliveryDto {
  @IsString() barcode!: string;
  @IsNumber() deliveredQty!: number;
}

export class EpscmTmsPodDto {
  @IsOptional() @IsString() signedBy?: string;
  @IsOptional() @IsString() signatureUrl?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() observations?: string;
}

export class EpscmTmsPodAttachmentDto {
  @IsString() fileType!: string;
  @IsString() storageUrl!: string;
}

export class EpscmTmsCostDto {
  @IsEnum(EpscmTmsCostCategory) category!: EpscmTmsCostCategory;
  @IsNumber() amount!: number;
  @IsOptional() @IsString() tripKey?: string;
  @IsOptional() @IsString() routeKey?: string;
  @IsOptional() @IsString() vehicleKey?: string;
  @IsOptional() @IsString() deliveryKey?: string;
  @IsOptional() @IsString() customerKey?: string;
  @IsOptional() @IsString() description?: string;
}

export class EpscmTmsTelemetryDto {
  @IsEnum(EpscmTmsTelemetrySlotType) slotType!: EpscmTmsTelemetrySlotType;
  @IsOptional() @IsString() vehicleKey?: string;
  @IsOptional() @IsString() tripKey?: string;
}

export class EpscmTmsOfflineBatchDto {
  @IsString() deviceId!: string;
  @IsArray() operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}

export class EpscmTmsDriverStatusDto {
  @IsEnum(EpscmTmsDriverStatus) status!: EpscmTmsDriverStatus;
}
