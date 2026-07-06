import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PRODUCER_LIFECYCLE_STATUS,
  type ProducerLifecycleStatus,
} from '@agroerp/shared';

export class CreateProducerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  producerTypeCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commercialName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentTypeCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genderCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatusCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryLanguageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationLevelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ethnicGroupCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadSourceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  yearsExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  photoContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  signatureContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxRegimeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentPreferenceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedBuyerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veredaCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  producerNumber?: string;
}

export class UpdateProducerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  producerTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commercialName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentTypeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genderCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatusCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryLanguageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationLevelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ethnicGroupCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadSourceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  yearsExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  photoContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  signatureContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxRegimeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentPreferenceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedBuyerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veredaCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class LifecycleTransitionDto {
  @ApiProperty({ enum: PRODUCER_LIFECYCLE_STATUS })
  @IsIn([...PRODUCER_LIFECYCLE_STATUS])
  toStatus!: ProducerLifecycleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonNotes?: string;
}

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactTypeCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateContactDto extends CreateContactDto {}

export class CreateAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressTypeCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veredaCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gpsAccuracyM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class CreateCertificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schemeCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentContentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentTypeCode!: string;

  @ApiProperty()
  @IsUUID()
  contentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateCommunicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class CreateNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class CreateAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assignmentType!: string;

  @ApiProperty()
  @IsUUID()
  assigneeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LinkFarmDto {
  @ApiProperty()
  @IsUUID()
  farmResourceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class MergeProducersDto {
  @ApiProperty()
  @IsUUID()
  sourceProducerId!: string;

  @ApiProperty()
  @IsUUID()
  targetProducerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncProducerItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateProducerDto)
  data!: CreateProducerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts?: CreateContactDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];
}

export class SyncProducersDto {
  @ApiProperty({ type: [SyncProducerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncProducerItemDto)
  items!: SyncProducerItemDto[];
}

export class CreateSegmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  rules?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;
}

export class ImportProducersDto {
  @ApiProperty({ type: [CreateProducerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProducerDto)
  items!: CreateProducerDto[];
}
