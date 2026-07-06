import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EamAssetStatus, EamAssetType, EamDocumentType, EamLifecycleEventType, EamLocationType } from '@prisma/client';

export class EamFamilyDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class EamSubfamilyDto {
  @IsString() familyKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
}

export class EamClassificationDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() category?: string;
}

export class EamLocationDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsEnum(EamLocationType) locationType!: EamLocationType;
  @IsOptional() @IsString() parentKey?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class EamAssetDto {
  @IsString() name!: string;
  @IsEnum(EamAssetType) assetType!: EamAssetType;
  @IsOptional() @IsString() internalNumber?: string;
  @IsOptional() @IsString() familyKey?: string;
  @IsOptional() @IsString() subfamilyKey?: string;
  @IsOptional() @IsString() classificationKey?: string;
  @IsOptional() @IsString() parentAssetKey?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() supplierKey?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() @Min(0) acquisitionCost?: number;
  @IsOptional() @IsNumber() @Min(0) residualValue?: number;
  @IsOptional() @IsDateString() warrantyExpiresAt?: string;
  @IsOptional() @IsNumber() usefulLifeMonths?: number;
  @IsOptional() @IsString() costCenterKey?: string;
  @IsOptional() @IsString() locationKey?: string;
  @IsOptional() @IsUUID() responsibleUserId?: string;
  @IsOptional() @IsString() purchaseOrderKey?: string;
  @IsOptional() @IsString() description?: string;
}

export class EamStatusDto {
  @IsEnum(EamAssetStatus) toStatus!: EamAssetStatus;
  @IsEnum(EamLifecycleEventType) eventType!: EamLifecycleEventType;
  @IsOptional() @IsString() notes?: string;
}

export class EamTransferDto {
  @IsString() toLocationKey!: string;
  @IsOptional() @IsString() transferType?: 'transfer' | 'relocation';
  @IsOptional() @IsString() notes?: string;
}

export class EamLoanDto {
  @IsString() borrowerName!: string;
  @IsOptional() @IsString() borrowerId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class EamDocumentDto {
  @IsEnum(EamDocumentType) docType!: EamDocumentType;
  @IsString() title!: string;
  @IsString() storageUrl!: string;
}

export class EamScanDto {
  @IsString() code!: string;
  @IsOptional() @IsString() scanType?: 'qr' | 'barcode';
}

export class EamOfflineBatchDto {
  @IsString() deviceId!: string;
  operations!: unknown[];
}
