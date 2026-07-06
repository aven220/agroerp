import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class HcmTaShiftDto {
  @IsOptional() @IsString() shiftKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() shiftType!: string;
  @IsString() startTime!: string;
  @IsString() endTime!: string;
  @IsOptional() @IsNumber() breakMinutes?: number;
  @IsOptional() @IsNumber() lunchMinutes?: number;
  @IsOptional() @IsBoolean() crossesMidnight?: boolean;
  @IsOptional() @IsNumber() graceMinutes?: number;
}

export class HcmTaCalendarDto {
  @IsString() name!: string;
  @IsNumber() year!: number;
  @IsOptional() @IsString() companyKey?: string;
  @IsOptional() @IsString() branchKey?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class HcmTaHolidayDto {
  @IsString() calendarKey!: string;
  @IsString() name!: string;
  @IsString() holidayDate!: string;
  @IsOptional() @IsBoolean() isNational?: boolean;
  @IsOptional() @IsBoolean() isPaid?: boolean;
}

export class HcmTaScheduleDto {
  @IsOptional() @IsString() scheduleKey?: string;
  @IsString() name!: string;
  @IsString() workMode!: string;
  @IsOptional() @IsNumber() weeklyHours?: number;
  @IsOptional() @IsNumber() dailyHours?: number;
  @IsOptional() @IsBoolean() flexibleStart?: boolean;
  @IsOptional() @IsNumber() flexWindowMinutes?: number;
  @IsOptional() @IsArray() breakRules?: unknown[];
  @IsOptional() @IsArray() lunchRules?: unknown[];
}

export class HcmTaAssignmentDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() shiftKey?: string;
  @IsOptional() @IsString() scheduleKey?: string;
  @IsOptional() @IsString() calendarKey?: string;
  @IsString() effectiveFrom!: string;
  @IsOptional() @IsString() effectiveTo?: string;
  @IsOptional() @IsString() rotationGroup?: string;
  @IsOptional() @IsString() workMode?: string;
}

export class HcmTaSwapDto {
  @IsString() requesterKey!: string;
  @IsString() fromShiftKey!: string;
  @IsString() swapDate!: string;
  @IsOptional() @IsString() toShiftKey?: string;
  @IsOptional() @IsString() targetEmployeeKey?: string;
  @IsOptional() @IsString() reason?: string;
}

export class HcmTaSwapDecisionDto {
  @IsBoolean() approved!: boolean;
}

export class HcmTaGeofenceDto {
  @IsOptional() @IsString() geofenceKey?: string;
  @IsString() name!: string;
  @IsNumber() latitude!: number;
  @IsNumber() longitude!: number;
  @IsOptional() @IsNumber() radiusMeters?: number;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() branchKey?: string;
}

export class HcmTaPunchDto {
  @IsString() employeeKey!: string;
  @IsString() punchType!: string;
  @IsString() punchSource!: string;
  @IsOptional() @IsString() punchedAt?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() geofenceKey?: string;
  @IsOptional() @IsString() qrToken?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsBoolean() isManual?: boolean;
  @IsOptional() @IsString() justification?: string;
}

export class HcmTaOfflineSyncDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsArray() punches!: Array<{ punchType: string; punchedAt: string; latitude?: number; longitude?: number; geofenceKey?: string }>;
}

export class HcmTaCorrectionDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() punchKey?: string;
  @IsString() requestedPunchType!: string;
  @IsString() requestedAt!: string;
  @IsString() reason!: string;
}

export class HcmTaCorrectionDecisionDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() reviewNotes?: string;
}

export class HcmTaNoveltyDto {
  @IsString() employeeKey!: string;
  @IsString() noveltyType!: string;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() hours?: number;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class HcmTaNoveltyDecisionDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() payrollPeriod?: string;
}

export class HcmTaLocationValidateDto {
  @IsNumber() latitude!: number;
  @IsNumber() longitude!: number;
}
