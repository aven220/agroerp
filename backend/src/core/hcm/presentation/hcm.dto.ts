import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import type { HcmContractType, HcmDocumentType, HcmEmploymentStatus } from '@prisma/client';

export class HcmCompanyDto {
  @IsOptional() @IsString() companyKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() efmCompanyKey?: string;
}

export class HcmBranchDto {
  @IsOptional() @IsString() branchKey?: string;
  @IsString() companyKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() efmBranchKey?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
}

export class HcmAreaDto {
  @IsOptional() @IsString() areaKey?: string;
  @IsString() branchKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() parentAreaKey?: string;
}

export class HcmDepartmentDto {
  @IsOptional() @IsString() departmentKey?: string;
  @IsString() areaKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() parentDeptKey?: string;
  @IsOptional() @IsString() costCenterKey?: string;
  @IsOptional() @IsString() managerEmployeeKey?: string;
}

export class HcmPositionDto {
  @IsOptional() @IsString() positionKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() departmentKey?: string;
  @IsOptional() @IsString() hierarchyLevelKey?: string;
  @IsOptional() @IsString() costCenterKey?: string;
  @IsOptional() @IsString() description?: string;
}

export class HcmEmployeeDto {
  @IsString() employeeNumber!: string;
  @IsString() firstName!: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() secondLastName?: string;
  @IsOptional() @IsString() documentType?: string;
  @IsString() documentNumber!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsString() companyKey!: string;
  @IsOptional() @IsString() branchKey?: string;
  @IsOptional() @IsString() departmentKey?: string;
  @IsOptional() @IsString() positionKey?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() teamKey?: string;
  @IsOptional() @IsString() managerEmployeeKey?: string;
  @IsOptional() @IsString() costCenterKey?: string;
  @IsOptional() @IsString() hireDate?: string;
  @IsOptional() @IsString() userId?: string;
}

export class HcmTransferDto {
  @IsOptional() @IsString() toCompanyKey?: string;
  @IsOptional() @IsString() toDepartmentKey?: string;
  @IsOptional() @IsString() toPositionKey?: string;
  @IsString() effectiveDate!: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmStatusChangeDto {
  @IsString() status!: HcmEmploymentStatus;
  @IsString() effectiveDate!: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmDependentDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsString() relationship!: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsBoolean() isBeneficiary?: boolean;
}

export class HcmEmergencyContactDto {
  @IsString() name!: string;
  @IsString() relationship!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class HcmAuthorizedUpdateDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
}

export class HcmContractDto {
  @IsString() employeeKey!: string;
  @IsString() contractType!: HcmContractType;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() salary?: number;
  @IsOptional() @IsString() currencyKey?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() positionKey?: string;
  @IsOptional() @IsString() contractNumber?: string;
}

export class HcmRenewContractDto {
  @IsString() renewalType!: 'renewal' | 'extension';
  @IsString() newEndDate!: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmTerminateContractDto {
  @IsString() terminationDate!: string;
  @IsString() reason!: string;
}

export class HcmDocumentUploadDto {
  @IsString() documentType!: HcmDocumentType;
  @IsString() title!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() contentType?: string;
  @IsOptional() @IsString() contentBase64?: string;
  @IsOptional() @IsString() contentUrl?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class HcmBulkImportDto {
  @IsArray() rows!: Array<Record<string, string>>;
}
