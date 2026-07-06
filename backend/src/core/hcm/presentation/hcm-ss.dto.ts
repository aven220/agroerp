import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class HcmSsExamDto {
  @IsString() employeeKey!: string;
  @IsString() examType!: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() physician?: string;
  @IsOptional() @IsString() nextDueAt?: string;
}

export class HcmSsExamCompleteDto {
  @IsString() fitnessStatus!: string;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() recommendations?: string;
  @IsOptional() @IsString() completedAt?: string;
  @IsOptional() @IsString() nextDueAt?: string;
  @IsOptional() @IsString() documentKey?: string;
  @IsOptional() @IsArray() restrictions?: Array<{
    description: string; startDate: string; endDate?: string; workLimitations?: string;
  }>;
}

export class HcmSsRestrictionDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() examKey?: string;
  @IsString() description!: string;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() workLimitations?: string;
}

export class HcmSsFollowUpDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() examKey?: string;
  @IsString() dueAt!: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmSsRiskDto {
  @IsOptional() @IsString() riskKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() positionKey?: string;
  @IsOptional() @IsString() processArea?: string;
}

export class HcmSsAssessDto {
  @IsString() riskKey!: string;
  @IsNumber() probability!: number;
  @IsNumber() impact!: number;
  @IsOptional() @IsString() assessedAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmSsControlDto {
  @IsString() riskKey!: string;
  @IsString() controlType!: string;
  @IsString() description!: string;
  @IsOptional() @IsBoolean() isImplemented?: boolean;
  @IsOptional() @IsNumber() effectiveness?: number;
}

export class HcmSsMitigationDto {
  @IsString() riskKey!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() ownerKey?: string;
  @IsOptional() @IsString() dueAt?: string;
}

export class HcmSsMitigationProgressDto {
  @IsNumber() completedTasks!: number;
  @IsNumber() totalTasks!: number;
}

export class HcmSsPpeItemDto {
  @IsOptional() @IsString() ppeKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() standard?: string;
  @IsOptional() @IsNumber() usefulLifeDays?: number;
}

export class HcmSsPpePositionDto {
  @IsString() positionKey!: string;
  @IsString() ppeKey!: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
}

export class HcmSsPpeAssignDto {
  @IsString() employeeKey!: string;
  @IsString() ppeKey!: string;
  @IsOptional() @IsNumber() quantity?: number;
}

export class HcmSsPpeDeliveryDto {
  @IsString() employeeKey!: string;
  @IsString() ppeKey!: string;
  @IsString() deliveryType!: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsString() signatureName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class HcmSsPpeSignDto {
  @IsString() signatureName!: string;
}

export class HcmSsOfflineSyncDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsArray() deliveries!: Array<{
    deliveryKey?: string; ppeKey: string; deliveryType: string;
    quantity?: number; signatureName?: string; notes?: string;
  }>;
}

export class HcmSsIncidentDto {
  @IsString() incidentType!: string;
  @IsOptional() @IsString() severity?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() occurredAt!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() employeeKey?: string;
  @IsOptional() @IsString() reportedByKey?: string;
}

export class HcmSsInvestigateDto {
  @IsOptional() @IsString() causes?: string;
  @IsOptional() @IsString() investigationNotes?: string;
}

export class HcmSsIncidentActionDto {
  @IsString() incidentKey!: string;
  @IsString() actionType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() ownerKey?: string;
  @IsOptional() @IsString() dueAt?: string;
}

export class HcmSsEvidenceDto {
  @IsString() incidentKey!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() storageKey?: string;
  @IsOptional() @IsString() caption?: string;
}

export class HcmSsIncidentOfflineDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsArray() incidents!: Array<{
    title: string; incidentType: string; severity?: string;
    occurredAt: string; description?: string; location?: string;
  }>;
}

export class HcmSsWellbeingProgramDto {
  @IsString() name!: string;
  @IsString() programType!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

export class HcmSsWellbeingActivityDto {
  @IsString() programKey!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() capacity?: number;
}

export class HcmSsParticipationDto {
  @IsString() activityKey!: string;
  @IsString() employeeKey!: string;
  @IsOptional() @IsBoolean() attended?: boolean;
  @IsOptional() @IsNumber() feedbackScore?: number;
  @IsOptional() @IsString() notes?: string;
}

export class HcmSsSurveyDto {
  @IsString() title!: string;
  @IsOptional() @IsString() programKey?: string;
  @IsOptional() @IsArray() questions?: unknown[];
}

export class HcmSsInspectionDto {
  @IsString() inspectionType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsString() inspectorKey?: string;
  @IsOptional() @IsString() scheduledAt?: string;
}

export class HcmSsFindingDto {
  @IsString() inspectionKey!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() checklistItem?: string;
  @IsOptional() @IsString() photoKey?: string;
}

export class HcmSsInspectionActionDto {
  @IsString() inspectionKey!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() ownerKey?: string;
  @IsOptional() @IsString() dueAt?: string;
}

export class HcmSsInspectionOfflineDto {
  @IsString() employeeKey!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsArray() inspections!: Array<{
    inspectionType: string; title: string; location?: string;
    findings?: Array<{ description: string; severity?: string; photoKey?: string }>;
    checklist?: Array<{ itemKey: string; label: string; checked?: boolean }>;
  }>;
}

export class HcmSsBulkInspectionDto {
  @IsArray() rows!: Array<{ inspectionType: string; title: string; location?: string; scheduledAt?: string }>;
}

export class HcmSsEmergencyPlanDto {
  @IsString() name!: string;
  @IsOptional() @IsString() workCenterKey?: string;
  @IsOptional() @IsArray() protocols?: unknown[];
  @IsOptional() @IsArray() meetingPoints?: unknown[];
  @IsOptional() @IsArray() schedule?: unknown[];
}

export class HcmSsBrigadeDto {
  @IsString() planKey!: string;
  @IsString() employeeKey!: string;
  @IsString() role!: string;
}

export class HcmSsDrillDto {
  @IsString() planKey!: string;
  @IsString() title!: string;
  @IsString() scheduledAt!: string;
}
