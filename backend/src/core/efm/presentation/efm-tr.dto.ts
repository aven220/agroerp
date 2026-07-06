import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EfmTrBankDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() swiftCode?: string;
}

export class EfmTrBankAccountDto {
  @ApiProperty() bankKey!: string;
  @ApiProperty() accountNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() glAccountKey?: string;
}

export class EfmTrBankSignerDto {
  @ApiProperty() accountKey!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxAmount?: number;
}

export class EfmTrCashBoxDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cashBoxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cashBoxType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxBalance?: number;
}

export class EfmTrOpenSessionDto {
  @ApiProperty() openingBalance!: number;
}

export class EfmTrCloseSessionDto {
  @ApiProperty() closingBalance!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmTrCashCountDto {
  @ApiProperty() countedAmount!: number;
  @ApiPropertyOptional() @IsOptional() denominations?: Record<string, unknown>;
}

export class EfmTrMovementDto {
  @ApiProperty() movementType!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() movementDate!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromAccountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toAccountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cashBoxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apPaymentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() arPaymentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmTrImportStatementDto {
  @ApiProperty() bankAccountKey!: string;
  @ApiProperty() format!: string;
  @ApiProperty() content!: string;
  @ApiProperty() periodFrom!: string;
  @ApiProperty() periodTo!: string;
  @ApiProperty() openingBalance!: number;
  @ApiProperty() closingBalance!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fileName?: string;
}

export class EfmTrStartReconciliationDto {
  @ApiProperty() bankAccountKey!: string;
  @ApiProperty() periodFrom!: string;
  @ApiProperty() periodTo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statementKey?: string;
}

export class EfmTrManualMatchDto {
  @ApiProperty() statementLineId!: string;
  @ApiProperty() movementKey!: string;
}

export class EfmTrAdjustmentDto {
  @ApiProperty() amount!: number;
  @ApiProperty() description!: string;
}

export class EfmTrVoidDto {
  @ApiProperty() reason!: string;
}
