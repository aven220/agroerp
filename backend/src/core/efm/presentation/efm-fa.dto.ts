import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class EfmFaCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryKey?: string;
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() assetClass!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isIntangible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultDepreciationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() defaultUsefulLifeMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() defaultResidualPercent?: number;
}

export class EfmFaAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() assetKey?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() categoryKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetClass?: string;
  @ApiProperty() @IsString() acquisitionDate!: string;
  @ApiProperty() @IsNumber() acquisitionCost!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() residualValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() usefulLifeMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() depreciationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitsOfProduction?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceDocumentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoActivate?: boolean;
}

export class EfmFaLocationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleUserId?: string;
}

export class EfmFaDepreciationRunDto {
  @ApiProperty() @IsString() periodKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() runType?: string;
  @ApiPropertyOptional() @IsOptional() assetKeys?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reprocess?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reprocessReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() periodUnits?: number;
}

export class EfmFaTransferDto {
  @ApiProperty() @IsString() assetKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toBranchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toLocationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toLocationDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toResponsibleUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toCostCenterKey?: string;
  @ApiProperty() @IsString() transferDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EfmFaRevaluationDto {
  @ApiProperty() @IsString() assetKey!: string;
  @ApiProperty() @IsString() revaluationType!: string;
  @ApiProperty() @IsNumber() newNbv!: number;
  @ApiProperty() @IsString() revaluationDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EfmFaMaintenanceDto {
  @ApiProperty() @IsString() assetKey!: string;
  @ApiProperty() @IsString() maintenanceType!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiProperty() @IsString() maintenanceDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCapitalized?: boolean;
}

export class EfmFaDisposalDto {
  @ApiProperty() @IsString() assetKey!: string;
  @ApiProperty() @IsString() disposalType!: string;
  @ApiProperty() @IsString() disposalDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() proceedsAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() buyerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() createTreasuryMovement?: boolean;
}

export class EfmFaPhysicalInventoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryKey?: string;
}

export class EfmFaScanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() assetKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetTag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actualLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmFaPhotoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fileKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
}

export class EfmFaIncidentDto {
  @ApiProperty() @IsString() incidentType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
  @ApiProperty() @IsString() description!: string;
}
