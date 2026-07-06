import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class EfmBgDimensionNodeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nodeKey?: string;
  @ApiProperty() @IsString() dimensionType!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
}

export class EfmBgBudgetLineDto {
  @ApiProperty() @IsString() periodKey!: string;
  @ApiProperty() @IsString() accountKey!: string;
  @ApiProperty() @IsNumber() budgetAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
}

export class EfmBgBudgetDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() budgetType!: string;
  @ApiProperty() @IsNumber() fiscalYear!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scenario?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() lines?: EfmBgBudgetLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() generateMonthlyFromAnnual?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() annualAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() accountKey?: string;
}

export class EfmBgVersionDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scenario?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() copyFromVersionKey?: string;
}

export class EfmBgValidateDto {
  @ApiProperty() @IsString() periodKey!: string;
  @ApiProperty() @IsString() accountKey!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() sourceModule!: string;
  @ApiProperty() @IsString() sourceDocumentKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
}

export class EfmBgTransferDto {
  @ApiProperty() @IsString() budgetKey!: string;
  @ApiProperty() @IsString() fromAccountKey!: string;
  @ApiProperty() @IsString() toAccountKey!: string;
  @ApiProperty() @IsString() periodKey!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fromCostCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toCostCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EfmBgExceptionApproveDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvedAmount?: number;
}

export class EfmBgReservationDto {
  @ApiProperty() @IsString() budgetKey!: string;
  @ApiProperty() @IsString() periodKey!: string;
  @ApiProperty() @IsString() accountKey!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() sourceModule!: string;
  @ApiProperty() @IsString() sourceDocumentKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
