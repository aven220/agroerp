import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EaceProducerDto {
  @IsString() producerRef!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() region?: string;
}

export class EaceFarmAuthDto {
  @IsString() farmRef!: string;
  @IsOptional() @IsString() farmName?: string;
  @IsOptional() crops?: unknown[];
  @IsOptional() campaigns?: unknown[];
}

export class EaceDocumentDto {
  @IsString() docType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() fileRef?: string;
}

export class EaceOrgDto {
  @IsString() orgType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() region?: string;
}

export class EaceGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() parentOrgId?: string;
}

export class EaceMemberDto {
  @IsString() producerRef!: string;
  @IsOptional() @IsString() orgId?: string;
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @IsString() role?: string;
}

export class EaceRepresentativeDto {
  @IsString() name!: string;
  @IsString() role!: string;
  @IsOptional() @IsString() contactEmail?: string;
}

export class EaceProgramDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

export class EaceAgreementDto {
  @IsString() title!: string;
  @IsOptional() @IsString() signedAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() terms?: Record<string, unknown>;
}

export class EaceContractDto {
  @IsString() producerRef!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() buyerRef?: string;
  @IsOptional() @IsString() contractNumber?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() conditions?: Record<string, unknown>;
  @IsOptional() pricing?: Record<string, unknown>;
}

export class EaceContractCropDto {
  @IsString() cropCode!: string;
  @IsOptional() @IsString() variety?: string;
  @IsOptional() @IsNumber() committedVolume?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() qualitySpecs?: Record<string, unknown>;
}

export class EaceContractScheduleDto {
  @IsString() milestone!: string;
  @IsOptional() @IsString() dueDate?: string;
}

export class EaceComplianceDto {
  @IsString() metric!: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsNumber() actualValue?: number;
}

export class EaceContractorDto {
  @IsString() contractorType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() services?: unknown[];
}

export class EaceEvaluationDto {
  @IsNumber() score!: number;
  @IsOptional() @IsString() comments?: string;
}

export class EaceAdvisorDto {
  @IsString() name!: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() contactEmail?: string;
}

export class EaceAssignmentDto {
  @IsString() producerRef!: string;
  @IsOptional() @IsString() fieldLotRef?: string;
}

export class EaceVisitDto {
  @IsString() producerRef!: string;
  @IsOptional() @IsString() fieldLotRef?: string;
  @IsString() visitDate!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() recommendations?: unknown[];
  @IsOptional() observations?: unknown[];
  @IsOptional() photos?: unknown[];
  @IsOptional() report?: Record<string, unknown>;
}

export class EaceListingDto {
  @IsString() listingType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() sellerRef?: string;
  @IsOptional() priceRef?: Record<string, unknown>;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class EaceApiCredentialDto {
  @IsString() name!: string;
  @IsOptional() @IsString() apiVersion?: string;
  @IsOptional() @IsArray() scopes?: string[];
  @IsOptional() @IsString() expiresAt?: string;
}

export class EaceKnowledgeDto {
  @IsString() itemType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() mediaRef?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class EaceBridgeDto {
  @IsString() moduleRef!: string;
  @IsOptional() payload?: Record<string, unknown>;
}

export class EaceOfflineBatchDto {
  @IsString() batchKey!: string;
  payload!: Record<string, unknown>;
}

export class EaceNotificationDto {
  @IsString() recipientRef!: string;
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() channel?: string;
}
