import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  EpscmWmsLocationType,
  EpscmWmsPickMode,
  EpscmWmsTransferType,
} from '@prisma/client';

export class EpscmWmsZoneDto {
  @IsString() warehouseKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() zoneType?: string;
}

export class EpscmWmsAisleDto {
  @IsString() zoneKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
}

export class EpscmWmsRackDto {
  @IsString() aisleKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
}

export class EpscmWmsLevelDto {
  @IsString() rackKey!: string;
  @IsNumber() levelNumber!: number;
  @IsString() code!: string;
}

export class EpscmWmsLocationDto {
  @IsString() warehouseKey!: string;
  @IsOptional() @IsString() levelKey?: string;
  @IsOptional() @IsString() zoneKey?: string;
  @IsString() code!: string;
  @IsOptional() @IsEnum(EpscmWmsLocationType) locationType?: EpscmWmsLocationType;
  @IsOptional() @IsNumber() capacityQty?: number;
  @IsOptional() @IsNumber() mapX?: number;
  @IsOptional() @IsNumber() mapY?: number;
  @IsOptional() @IsNumber() mapZ?: number;
}

export class EpscmWmsSuggestDto {
  @IsString() warehouseKey!: string;
  @IsString() itemKey!: string;
  @IsNumber() qty!: number;
}

export class EpscmWmsRelocateDto {
  @IsString() fromLocationKey!: string;
  @IsString() toLocationKey!: string;
  @IsString() itemKey!: string;
  @IsNumber() qty!: number;
  @IsOptional() @IsString() lotKey?: string;
}

export class EpscmWmsConsolidateDto {
  @IsString() targetLocationKey!: string;
  @IsArray() @IsString({ each: true }) sourceLocationKeys!: string[];
}

export class EpscmWmsTransferLineDto {
  @IsString() itemKey!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() fromLocationKey?: string;
  @IsOptional() @IsString() toLocationKey?: string;
}

export class EpscmWmsTransferDto {
  @IsEnum(EpscmWmsTransferType) transferType!: EpscmWmsTransferType;
  @IsOptional() @IsString() fromWarehouseKey?: string;
  @IsOptional() @IsString() toWarehouseKey?: string;
  @IsOptional() @IsString() fromDcKey?: string;
  @IsOptional() @IsString() toDcKey?: string;
  @IsOptional() @IsString() fromCompanyKey?: string;
  @IsOptional() @IsString() toCompanyKey?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => EpscmWmsTransferLineDto) lines!: EpscmWmsTransferLineDto[];
}

export class EpscmWmsWaveDto {
  @IsString() warehouseKey!: string;
  @IsEnum(EpscmWmsPickMode) pickMode!: EpscmWmsPickMode;
  @IsArray() @IsString({ each: true }) orderKeys!: string[];
  @IsOptional() @IsNumber() priority?: number;
}

export class EpscmWmsPickTaskDto {
  @IsString() orderKey!: string;
  @IsString() itemKey!: string;
  @IsOptional() @IsString() locationKey?: string;
  @IsNumber() requestedQty!: number;
  @IsOptional() @IsNumber() priority?: number;
}

export class EpscmWmsConfirmPickDto {
  @IsNumber() pickedQty!: number;
  @IsOptional() @IsString() pickerKey?: string;
}

export class EpscmWmsBarcodePickDto {
  @IsString() barcode!: string;
  @IsNumber() pickedQty!: number;
}

export class EpscmWmsPackBoxDto {
  @IsOptional() @IsString() labelCode?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() length?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
}

export class EpscmWmsDispatchPrepareDto {
  @IsString() orderKey!: string;
  @IsString() warehouseKey!: string;
}

export class EpscmWmsDispatchShipDto {
  @IsString() lineKey!: string;
  @IsNumber() shippedQty!: number;
}

export class EpscmWmsReceiptScheduleDto {
  @IsString() warehouseKey!: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsString() purchaseKey?: string;
}

export class EpscmWmsReceiptFromPoDto {
  @IsString() purchaseKey!: string;
  @IsString() warehouseKey!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EpscmWmsReceiptLineInputDto)
  lines?: EpscmWmsReceiptLineInputDto[];
}

export class EpscmWmsReceiptLineInputDto {
  @IsString() itemKey!: string;
  @IsNumber() expectedQty!: number;
}

export class EpscmWmsReceiveLineDto {
  @IsNumber() receivedQty!: number;
  @IsOptional() @IsString() locationKey?: string;
  @IsOptional() @IsString() issueNotes?: string;
}

export class EpscmWmsBarcodeReceiveDto {
  @IsString() barcode!: string;
  @IsNumber() receivedQty!: number;
  @IsOptional() @IsString() locationKey?: string;
}

export class EpscmWmsCrossDockDto {
  @IsString() receiptKey!: string;
  @IsOptional() @IsString() orderKey?: string;
}

export class EpscmWmsCrossDockAssignDto {
  @IsString() warehouseKey!: string;
}

export class EpscmWmsOfflineBatchDto {
  @IsString() deviceId!: string;
  @IsArray() operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}

export class EpscmWmsCaptureDto {
  @IsString() refType!: string;
  @IsString() refKey!: string;
  @IsString() storageUrl!: string;
  @IsOptional() @IsString() captureType?: string;
}
