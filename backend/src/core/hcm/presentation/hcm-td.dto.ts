import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class HcmTdCourseDto {
  @IsOptional() @IsString() courseKey?: string;
  @IsString() code!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() courseType!: string;
  @IsString() courseOrigin!: string;
  @IsString() modality!: string;
  @IsOptional() @IsNumber() durationHours?: number;
  @IsOptional() @IsArray() competencyKeys?: string[];
}

export class HcmTdScheduleDto {
  @IsString() courseKey!: string;
  @IsString() startAt!: string;
  @IsString() endAt!: string;
  @IsString() modality!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() instructor?: string;
  @IsOptional() @IsNumber() capacity?: number;
}

export class HcmTdEnrollmentDto {
  @IsString() courseKey!: string;
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() scheduleKey?: string;
}

export class HcmTdAttendanceDto {
  @IsBoolean() attended!: boolean;
  @IsOptional() @IsNumber() sessionsTotal?: number;
  @IsOptional() @IsNumber() sessionsAttended?: number;
}

export class HcmTdCertificationDto {
  @IsOptional() @IsString() certificationKey?: string;
  @IsString() employeeKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsString() issuedAt!: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsNumber() renewalDays?: number;
  @IsOptional() @IsString() courseKey?: string;
}

export class HcmTdRenewCertDto {
  @IsString() newExpiresAt!: string;
}

export class HcmTdCompetencyDto {
  @IsOptional() @IsString() competencyKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() competencyType!: string;
  @IsOptional() @IsString() description?: string;
}

export class HcmTdAssessDto {
  @IsString() employeeKey!: string;
  @IsString() competencyKey!: string;
  @IsString() currentLevel!: string;
  @IsString() targetLevel!: string;
  @IsOptional() @IsString() improvementPlan?: string;
}

export class HcmTdBulkCompetencyDto {
  @IsArray() rows!: HcmTdAssessDto[];
}

export class HcmTdCycleDto {
  @IsString() name!: string;
  @IsNumber() year!: number;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
}

export class HcmTdEvaluationDto {
  @IsString() cycleKey!: string;
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() evaluatorKey?: string;
  @IsString() evaluationType!: string;
  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class HcmTdEvaluationScoreDto {
  @IsArray() scores!: Array<{
    criterionKey: string; criterionName: string; competencyKey?: string;
    score: number; maxScore?: number; weight?: number; comments?: string;
  }>;
}

export class HcmTdBulkEvaluationDto {
  @IsString() cycleKey!: string;
  @IsString() evaluationType!: string;
  @IsArray() employeeKeys!: string[];
}

export class HcmTdObjectiveDto {
  @IsString() employeeKey!: string;
  @IsString() objectiveType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsNumber() currentValue?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsString() startDate!: string;
  @IsString() dueDate!: string;
  @IsOptional() @IsString() parentKey?: string;
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class HcmTdObjectiveProgressDto {
  @IsNumber() currentValue!: number;
}

export class HcmTdCareerPlanDto {
  @IsString() employeeKey!: string;
  @IsString() planType!: string;
  @IsOptional() @IsString() currentPositionKey?: string;
  @IsOptional() @IsString() targetPositionKey?: string;
  @IsOptional() @IsBoolean() isHighPotential?: boolean;
  @IsOptional() @IsString() successorForKey?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() targetDate?: string;
}

export class HcmTdReadinessDto {
  @IsNumber() readinessScore!: number;
}

export class HcmTdPlanAssignDto {
  @IsString() planKey!: string;
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() dueDate?: string;
}
