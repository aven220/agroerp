import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class HepProfileUpdateDto {
  @IsOptional() @IsString() employeeKey?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() personalEmail?: string;
  @IsOptional() @IsString() personalPhone?: string;
  @IsOptional() @IsString() personalMobile?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() bio?: string;
}

export class HepLoginDto {
  @IsOptional() @IsString() employeeKey?: string;
}

export class HepRequestCreateDto {
  @IsString() requestType!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() hours?: number;
  @IsOptional() @IsNumber() days?: number;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsBoolean() submit?: boolean;
  @IsOptional() @IsString() employeeKey?: string;
}

export class HepRequestAttachmentDto {
  @IsString() requestKey!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() storageKey?: string;
  @IsOptional() @IsNumber() fileSize?: number;
  @IsOptional() @IsString() caption?: string;
}

export class HepRequestDecisionDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() comment?: string;
}

export class HepRequestCancelDto {
  @IsOptional() @IsString() reason?: string;
}

export class HepCertificateCreateDto {
  @IsString() certificateType!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsString() employeeKey?: string;
}

export class HepPayslipBulkDto {
  @IsArray() payslipKeys!: string[];
}

export class HepOfflineSaveDto {
  @IsString() sourceType!: string;
  @IsString() sourceKey!: string;
  @IsString() title!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() pdfBase64?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() periodCode?: string;
}
