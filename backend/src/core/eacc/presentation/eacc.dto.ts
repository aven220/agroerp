import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EaccFrameworkDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() frameworkType!: string;
  @IsOptional() @IsString() description?: string;
}

export class EaccCertificationDto {
  @IsString() certType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() certNumber?: string;
  @IsOptional() @IsString() frameworkId?: string;
  @IsOptional() @IsString() issuedAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() responsibleId?: string;
}

export class EaccRequirementDto {
  @IsString() code!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() frameworkId?: string;
  @IsOptional() @IsString() certificationId?: string;
  @IsOptional() @IsString() responsibleId?: string;
  @IsOptional() @IsString() dueDate?: string;
}

export class EaccChecklistDto {
  @IsString() name!: string;
  @IsOptional() @IsString() certType?: string;
  @IsOptional() @IsString() auditType?: string;
  @IsOptional() @IsArray() items?: Array<{ question: string; requirementId?: string }>;
}

export class EaccChecklistItemDto {
  @IsOptional() @IsString() signatureRef?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EaccEvidenceDto {
  @IsString() title!: string;
  @IsOptional() @IsString() requirementId?: string;
  @IsOptional() @IsString() auditId?: string;
  @IsOptional() @IsString() documentRef?: string;
  @IsOptional() @IsString() photoRef?: string;
  @IsOptional() @IsString() signatureRef?: string;
}

export class EaccAuditPlanDto {
  @IsString() name!: string;
  @IsString() auditType!: string;
  @IsOptional() @IsString() plannedStart?: string;
  @IsOptional() @IsString() plannedEnd?: string;
  @IsOptional() @IsString() auditorName?: string;
}

export class EaccAuditDto {
  @IsString() auditType!: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() certificationId?: string;
  @IsOptional() @IsString() auditorName?: string;
}

export class EaccFindingDto {
  @IsString() auditId!: string;
  @IsString() findingType!: string;
  @IsOptional() @IsString() severity?: string;
  @IsString() description!: string;
}

export class EaccCorrectiveActionDto {
  @IsString() findingId!: string;
  @IsString() actionType!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() responsibleId?: string;
  @IsOptional() @IsString() dueDate?: string;
}

export class EaccDocumentLinkDto {
  @IsString() documentRef!: string;
  @IsString() docType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityKey?: string;
  @IsOptional() @IsString() signatureRef?: string;
}

export class EaccSustainabilityDto {
  @IsString() indicatorId!: string;
  @IsNumber() value!: number;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EaccSustainabilityIndicatorDto {
  @IsString() category!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() targetValue?: number;
}

export class EaccEsgIndicatorDto {
  @IsString() pillar!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsNumber() currentValue?: number;
}

export class EaccEsgObjectiveDto {
  @IsString() pillar!: string;
  @IsString() title!: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsString() dueDate?: string;
}

export class EaccEsgReportDto {
  @IsString() title!: string;
  @IsOptional() @IsString() periodStart?: string;
  @IsOptional() @IsString() periodEnd?: string;
}

export class EaccFootprintConfigDto {
  @IsString() footprintType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() calculationRef?: string;
  @IsOptional() @IsString() unit?: string;
}

export class EaccFootprintRecordDto {
  @IsString() configId!: string;
  @IsNumber() value!: number;
  @IsOptional() @IsNumber() offsetValue?: number;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EaccSafetyTrainingDto {
  @IsString() title!: string;
  @IsOptional() @IsString() trainerName?: string;
  @IsOptional() @IsNumber() trainedCount?: number;
}

export class EaccPpeDeliveryDto {
  @IsString() ppeType!: string;
  @IsOptional() @IsString() employeeRef?: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsString() deliveredBy?: string;
}

export class EaccSafetyIncidentDto {
  @IsString() incidentType!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() fieldLotId?: string;
}

export class EaccSafetyInspectionDto {
  @IsOptional() @IsString() inspectorName?: string;
  @IsOptional() @IsNumber() score?: number;
  @IsOptional() @IsString() signatureRef?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EaccWorkPermitDto {
  @IsString() workType!: string;
  @IsOptional() @IsString() authorizedBy?: string;
  @IsOptional() @IsString() validFrom?: string;
  @IsOptional() @IsString() validUntil?: string;
}

export class EaccBridgeDto {
  @IsString() moduleRef!: string;
  payload!: Record<string, unknown>;
}

export class EaccOfflineBatchDto {
  @IsString() batchKey!: string;
  payload!: Record<string, unknown>;
}
