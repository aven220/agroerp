import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EpscmCollabAiSlotType, EpscmCollabPartnerType, EpscmCollabTaskStatus } from '@prisma/client';

export class EpscmCollabPartnerDto {
  @IsEnum(EpscmCollabPartnerType) partnerType!: EpscmCollabPartnerType;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() email?: string;
}

export class EpscmCollabLinkUserDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() role?: string;
}

export class EpscmCollabConfirmOrderDto {
  @IsNumber() confirmedQty!: number;
  @IsOptional() @IsString() notes?: string;
}

export class EpscmCollabDeliveryDateDto {
  @IsString() promisedDate!: string;
  @IsOptional() @IsString() notes?: string;
}

export class EpscmCollabInvoiceDto {
  @IsString() invoiceNumber!: string;
  @IsNumber() amount!: number;
  @IsOptional() @IsString() purchaseKey?: string;
  @IsOptional() @IsString() storageUrl?: string;
}

export class EpscmCollabDocumentDto {
  @IsString() refType!: string;
  @IsString() refKey!: string;
  @IsString() docType!: string;
  @IsString() storageUrl!: string;
}

export class EpscmCollabCertificateDto {
  @IsString() certType!: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() storageUrl?: string;
}

export class EpscmCollabOperatorStatusDto {
  @IsString() status!: string;
  @IsOptional() @IsString() notes?: string;
}

export class EpscmCollabEvidenceDto {
  @IsString() evidenceType!: string;
  @IsString() storageUrl!: string;
}

export class EpscmCollabContractDto {
  @IsString() partnerKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
}

export class EpscmCollabSlaDto {
  @IsString() name!: string;
  @IsOptional() @IsNumber() targetPct?: number;
}

export class EpscmCollabComplianceDto {
  @IsNumber() actualPct!: number;
  @IsString() periodStart!: string;
  @IsString() periodEnd!: string;
}

export class EpscmCollabThreadDto {
  @IsString() subject!: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refKey?: string;
}

export class EpscmCollabMessageDto {
  @IsString() body!: string;
}

export class EpscmCollabCommentDto {
  @IsString() refType!: string;
  @IsString() refKey!: string;
  @IsString() body!: string;
}

export class EpscmCollabTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refKey?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() dueAt?: string;
}

export class EpscmCollabTrackingDto {
  @IsString() refType!: string;
  @IsString() refKey!: string;
  @IsString() eventType!: string;
  @IsOptional() @IsString() description?: string;
}

export class EpscmCollabSimulationDto {
  @IsString() name!: string;
  @IsString() simulationType!: string;
}

export class EpscmCollabScenarioDto {
  @IsString() name!: string;
  parameters!: Record<string, unknown>;
}

export class EpscmCollabAiDto {
  @IsEnum(EpscmCollabAiSlotType) slotType!: EpscmCollabAiSlotType;
}

export class EpscmCollabOfflineBatchDto {
  @IsString() deviceId!: string;
  @IsArray() operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}
