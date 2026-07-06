import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EimsCatalogDto {
  @ApiProperty() @IsString() catalogKey!: string;
  @ApiProperty() @IsString() entryKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EimsParameterDto {
  @ApiProperty() @IsString() parameterKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsObject() value!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() dataType?: string;
}

export class EimsWarehouseDto {
  @ApiProperty() @IsString() warehouseKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() warehouseType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() municipality?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EimsLocationDto {
  @ApiProperty() @IsString() warehouseKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() locationType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aisle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() level?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EimsItemDto {
  @ApiProperty() @IsString() itemKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalCode?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() itemTypeKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subcategoryKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() presentationKey?: string;
  @ApiProperty() @IsString() uomKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statusKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() volume?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() height?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shelfLifeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackLot?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegative?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultLocationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() valuationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EimsItemPhotoDto {
  @ApiProperty() @IsString() photoKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class EimsMovementDto {
  @ApiProperty() @IsString() movementType!: string;
  @ApiProperty() @IsString() itemKey!: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fromWarehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toWarehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromLocationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toLocationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerSerial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalSerial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shelfLifeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerOrgKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agriculturalLotCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() transportCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() storageCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() transformCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reasonKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsMovementBatchDto {
  @ApiProperty() movements!: EimsMovementDto[];
}

export class EimsImportCsvDto {
  @ApiProperty() @IsString() csv!: string;
}

export class EimsVoidMovementDto {
  @ApiProperty() @IsString() reason!: string;
}

export class EimsPeriodCloseDto {
  @ApiProperty() @IsString() periodType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() refDate?: string;
}

export class EimsPeriodReasonDto {
  @ApiProperty() @IsString() reason!: string;
}

export class EimsLotDto {
  @ApiProperty() @IsString() itemKey!: string;
  @ApiProperty() @IsString() warehouseKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerSerial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalSerial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shelfLifeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() initialQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerOrgKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agriculturalLotCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsLotReclassifyDto {
  @ApiProperty() @IsString() status!: string;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
}

export class EimsLotIncidentDto {
  @ApiProperty() @IsString() lotKey!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsSerialDto {
  @ApiProperty() @IsString() itemKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerSerial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsSerialMaintenanceDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() performedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsTransformDto {
  @ApiProperty() @IsString() transformType!: string;
  @ApiProperty() parents!: Array<{ lotKey: string; quantity: number }>;
  @ApiProperty() children!: Array<{
    lotKey?: string;
    quantity: number;
    itemKey?: string;
    warehouseKey?: string;
    locationKey?: string;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsSplitDto {
  @ApiProperty() @IsString() lotKey!: string;
  @ApiProperty() parts!: Array<{ quantity: number; lotKey?: string }>;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
}

export class EimsMergeDto {
  @ApiProperty() parents!: Array<{ lotKey: string; quantity: number }>;
  @ApiPropertyOptional() @IsOptional() @IsString() childLotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
}

export class EimsMixDto {
  @ApiProperty() parents!: Array<{ lotKey: string; quantity: number }>;
  @ApiPropertyOptional() @IsOptional() @IsString() childLotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() childQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
}

export class EimsCountAssigneeDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roleKey?: string;
  @ApiPropertyOptional() @IsOptional() warehouseKeys?: string[];
  @ApiPropertyOptional() @IsOptional() locationKeys?: string[];
  @ApiPropertyOptional() @IsOptional() itemKeys?: string[];
}

export class EimsCountPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() countKey?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() countType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() warehouseKeys?: string[];
  @ApiPropertyOptional() @IsOptional() locationKeys?: string[];
  @ApiPropertyOptional() @IsOptional() itemKeys?: string[];
  @ApiPropertyOptional() @IsOptional() categoryKeys?: string[];
  @ApiPropertyOptional() @IsOptional() lotKeys?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() toleranceQtyPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() toleranceCostPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() toleranceQtyAbs?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireSecondCount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireThirdCount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() freezeMovements?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() assignees?: EimsCountAssigneeDto[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsCountAssignDto {
  @ApiProperty() assignees!: EimsCountAssigneeDto[];
}

export class EimsCountCaptureDto {
  @ApiPropertyOptional() @IsOptional() @IsString() lineKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scannedCode?: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() round?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() offline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() captureKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsCountCaptureBatchDto {
  @ApiProperty() captures!: EimsCountCaptureDto[];
}

export class EimsCountApprovalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() decision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectedReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() justification?: string;
}

export class EimsCountCloseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EimsCountPhotoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() lineKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() offline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsReservationDto {
  @ApiProperty() reservationType!: string;
  @ApiProperty() itemKey!: string;
  @ApiProperty() warehouseKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EimsReservationReleaseDto {
  @ApiPropertyOptional() @IsOptional() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EimsReservationReassignDto {
  @ApiPropertyOptional() @IsOptional() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EimsStockLevelDto {
  @ApiProperty() itemKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() minStock?: number;
  @ApiPropertyOptional() @IsOptional() maxStock?: number;
  @ApiPropertyOptional() @IsOptional() safetyStock?: number;
  @ApiPropertyOptional() @IsOptional() reorderPoint?: number;
  @ApiPropertyOptional() @IsOptional() economicOrderQty?: number;
  @ApiPropertyOptional() @IsOptional() coverageDays?: number;
  @ApiPropertyOptional() @IsOptional() leadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() seasonalityFactor?: number;
}

export class EimsSupplyRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() ruleKey?: string;
  @ApiProperty() name!: string;
  @ApiProperty() ruleType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoExecute?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() parameters?: Record<string, unknown>;
}

export class EimsSuggestionRejectDto {
  @ApiProperty() reason!: string;
}

export class EimsScenarioDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() horizonDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() parameters?: Record<string, unknown>;
}

export class EimsReportDefinitionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reportKey?: string;
  @ApiProperty() name!: string;
  @ApiProperty() reportType!: string;
  @ApiPropertyOptional() @IsOptional() columns?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() groupBy?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
}

export class EimsReportRunDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reportKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reportType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() format?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() columns?: string[];
}
