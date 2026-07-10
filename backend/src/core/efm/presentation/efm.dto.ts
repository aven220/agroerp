import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EfmCoaVersionDto {
  @ApiProperty() name!: string;
  @ApiProperty() effectiveFrom!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cloneFromKey?: string;
}

export class EfmAccountDto {
  @ApiProperty() versionKey!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nature?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentAccountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isControl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAuxiliary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPostingAllowed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() controlAccountKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hierarchyLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EfmParameterDto {
  @ApiProperty() parameterKey!: string;
  @ApiProperty() name!: string;
  @ApiProperty() value!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() dataType?: string;
}

export class EfmCompanyDto {
  @ApiProperty() @IsString() @IsNotEmpty() companyKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() legalName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() baseCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class EfmBranchDto {
  @ApiProperty() branchKey!: string;
  @ApiProperty() companyKey!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionKey?: string;
}

export class EfmCostCenterDto {
  @ApiProperty() costCenterKey!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentKey?: string;
}

export class EfmProfitCenterDto {
  @ApiProperty() profitCenterKey!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
}

export class EfmProjectDto {
  @ApiProperty() projectKey!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
}

export class EfmCurrencyDto {
  @ApiProperty() currencyKey!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() symbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() exchangeRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBase?: boolean;
}

export class EfmFiscalYearDto {
  @ApiProperty() year!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
}

export class EfmAccountingRuleDto {
  @ApiProperty() name!: string;
  @ApiProperty() sourceModule!: string;
  @ApiProperty() eventType!: string;
  @ApiProperty() debitAccountKey!: string;
  @ApiProperty() creditAccountKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ruleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() conditions?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() exceptions?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsObject() validations?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coaVersionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class EfmJournalLineDto {
  @ApiProperty() accountKey!: string;
  @ApiProperty() debit!: number;
  @ApiProperty() credit!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profitCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmJournalEntryDto {
  @ApiProperty() sourceModule!: string;
  @ApiProperty() sourceDocumentType!: string;
  @ApiProperty() sourceDocumentKey!: string;
  @ApiProperty() description!: string;
  @ApiProperty() entryDate!: string;
  @ApiProperty({ type: [EfmJournalLineDto] }) lines!: EfmJournalLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPost?: boolean;
}

export class EfmGenerateFromEventDto {
  @ApiProperty() eventType!: string;
  @ApiProperty() payload!: Record<string, unknown>;
}

export class EfmSimulateRuleDto {
  @ApiProperty() eventType!: string;
  @ApiProperty() payload!: Record<string, unknown>;
}

export class EfmVoucherTypeDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherTypeKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() numberPadding?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resetPeriod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPost?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() originAllowed?: string;
}

export class EfmManualVoucherDto {
  @ApiProperty() voucherTypeKey!: string;
  @ApiProperty() description!: string;
  @ApiProperty() entryDate!: string;
  @ApiProperty({ type: [EfmJournalLineDto] }) lines!: EfmJournalLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() companyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() submitForApproval?: boolean;
}

export class EfmVoucherActionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
}
