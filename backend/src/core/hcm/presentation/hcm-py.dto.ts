import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class HcmPyConfigDto {
  @IsOptional() @IsString() configKey?: string;
  @IsString() companyKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() periodicity?: string;
  @IsOptional() @IsNumber() smmlv?: number;
  @IsOptional() @IsNumber() transportAllowance?: number;
  @IsOptional() @IsNumber() uvt?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class HcmPyConceptDto {
  @IsOptional() @IsString() conceptKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() kind!: string;
  @IsString() category!: string;
  @IsOptional() @IsNumber() rate?: number;
  @IsOptional() @IsNumber() fixedAmount?: number;
  @IsOptional() @IsBoolean() isTaxable?: boolean;
  @IsOptional() @IsBoolean() isSocialBase?: boolean;
}

export class HcmPyFundDto {
  @IsOptional() @IsString() fundKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() fundType!: string;
  @IsOptional() @IsString() entityName?: string;
  @IsOptional() @IsString() entityCode?: string;
  @IsOptional() @IsNumber() employeeRate?: number;
  @IsOptional() @IsNumber() employerRate?: number;
}

export class HcmPyPeriodDto {
  @IsString() configKey!: string;
  @IsString() companyKey!: string;
  @IsNumber() year!: number;
  @IsNumber() month!: number;
  @IsOptional() @IsString() paymentDate?: string;
}

export class HcmPyRunDto {
  @IsString() periodKey!: string;
  @IsString() configKey!: string;
  @IsString() companyKey!: string;
}

export class HcmPyBenefitDto {
  @IsString() employeeKey!: string;
  @IsString() benefitType!: string;
  @IsString() name!: string;
  @IsNumber() amount!: number;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
}

export class HcmPyGarnishmentDto {
  @IsString() employeeKey!: string;
  @IsString() garnishmentType!: string;
  @IsOptional() @IsString() creditorName?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsNumber() fixedAmount?: number;
  @IsOptional() @IsNumber() percentage?: number;
  @IsOptional() @IsNumber() balance?: number;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
}

export class HcmPySettlementDto {
  @IsString() employeeKey!: string;
  @IsString() contractKey!: string;
  @IsString() settlementType!: string;
  @IsString() terminationDate!: string;
}

export class HcmPyVacationRequestDto {
  @IsString() employeeKey!: string;
  @IsNumber() days!: number;
  @IsString() startDate!: string;
  @IsOptional() @IsString() reason?: string;
}

export class HcmPyIncomeCertificateDto {
  @IsString() employeeKey!: string;
  @IsNumber() year!: number;
}
