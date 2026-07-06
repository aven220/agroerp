import { IsArray, IsBoolean, IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class HcmRcVacancyDto {
  @IsString() title!: string;
  @IsOptional() @IsString() positionKey?: string;
  @IsOptional() @IsString() departmentKey?: string;
  @IsOptional() @IsString() companyKey?: string;
  @IsOptional() @IsString() branchKey?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() jobProfile?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsNumber() salaryMin?: number;
  @IsOptional() @IsNumber() salaryMax?: number;
  @IsOptional() @IsString() currencyKey?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() targetHireDate?: string;
  @IsOptional() @IsNumber() @Min(1) headcount?: number;
  @IsOptional() @IsString() hiringManagerKey?: string;
  @IsOptional() @IsArray() competencies?: Array<{ name: string; category: string; weight?: number; minScore?: number; isRequired?: boolean }>;
}

export class HcmRcApprovalActionDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() comments?: string;
}

export class HcmRcPublishDto {
  @IsOptional() @IsBoolean() internal?: boolean;
  @IsOptional() @IsBoolean() external?: boolean;
}

export class HcmRcStatusDto {
  @IsString() status!: string;
}

export class HcmRcCandidateDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsString() resumeUrl?: string;
  @IsOptional() @IsString() resumeContent?: string;
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() sourceRef?: string;
}

export class HcmRcImportCandidatesDto {
  @IsArray() rows!: HcmRcCandidateDto[];
}

export class HcmRcApplyDto {
  @IsString() vacancyKey!: string;
  @IsString() candidateKey!: string;
}

export class HcmRcTalentPoolDto {
  @IsString() candidateKey!: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class HcmRcReferralDto {
  @IsString() candidateKey!: string;
  @IsString() referrerEmployeeKey!: string;
  @IsOptional() @IsString() vacancyKey?: string;
  @IsOptional() @IsBoolean() bonusEligible?: boolean;
}

export class HcmRcCampaignDto {
  @IsOptional() @IsString() campaignKey?: string;
  @IsString() name!: string;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class HcmRcJobFairDto {
  @IsOptional() @IsString() fairKey?: string;
  @IsString() name!: string;
  @IsOptional() @IsString() location?: string;
  @IsString() eventDate!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class HcmRcInterviewDto {
  @IsString() candidateKey!: string;
  @IsString() vacancyKey!: string;
  @IsOptional() @IsString() stageKey?: string;
  @IsOptional() @IsString() interviewerKey?: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsNumber() durationMinutes?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() meetingUrl?: string;
}

export class HcmRcCompleteInterviewDto {
  @IsOptional() @IsNumber() rating?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;
}

export class HcmRcAssessmentDto {
  @IsString() candidateKey!: string;
  @IsString() vacancyKey!: string;
  @IsString() assessmentType!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() score?: number;
  @IsOptional() @IsNumber() maxScore?: number;
  @IsOptional() @IsBoolean() passed?: boolean;
}

export class HcmRcEvaluationDto {
  @IsString() candidateKey!: string;
  @IsString() vacancyKey!: string;
  @IsNumber() score!: number;
  @IsOptional() @IsNumber() maxScore?: number;
  @IsOptional() @IsString() competencyKey?: string;
  @IsOptional() @IsString() evaluatorKey?: string;
  @IsOptional() @IsString() comments?: string;
}

export class HcmRcCompareDto {
  @IsArray() candidateKeys!: string[];
}

export class HcmRcOfferDto {
  @IsString() vacancyKey!: string;
  @IsString() candidateKey!: string;
  @IsNumber() salary!: number;
  @IsString() contractType!: string;
  @IsString() startDate!: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() positionKey?: string;
  @IsOptional() @IsString() departmentKey?: string;
  @IsOptional() @IsString() branchKey?: string;
  @IsOptional() @IsString() managerKey?: string;
  @IsOptional() @IsArray() iamRoleKeys?: string[];
}

export class HcmRcSignatureDto {
  @IsString() signerName!: string;
  @IsEmail() signerEmail!: string;
  @IsOptional() @IsString() signatureData?: string;
  @IsOptional() @IsString() ipAddress?: string;
}

export class HcmRcOnboardingTaskDto {
  @IsString() status!: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class HcmRcInductionDto {
  @IsString() inductionDate!: string;
}
