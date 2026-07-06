import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EfmApSupplierDto {
  @ApiProperty() @IsString() supplierKey!: string;
  @ApiProperty() @IsString() legalName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paymentTermsDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditLimit?: number;
}

export class EfmApInvoiceLineDto {
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiProperty() @IsNumber() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderLineKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptLineKey?: string;
}

export class EfmApRegisterInvoiceDto {
  @ApiProperty() @IsString() supplierKey!: string;
  @ApiProperty() @IsString() issueDate!: string;
  @ApiProperty({ type: [EfmApInvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EfmApInvoiceLineDto)
  lines!: EfmApInvoiceLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierInvoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceModule?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceDocumentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paymentTermsDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() withholdingAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() poQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() receiptQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() poUnitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoValidate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPost?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmApExceptionDto {
  @ApiProperty() justification!: string;
}

export class EfmApNoteDto {
  @ApiProperty() relatedInvoiceKey!: string;
  @ApiProperty() supplierKey!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() reason!: string;
}

export class EfmApPaymentAllocationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() payableKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
  @ApiProperty() amount!: number;
}

export class EfmApCreatePaymentDto {
  @ApiProperty() supplierKey!: string;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() earlyDiscountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() submitForApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() allocations?: EfmApPaymentAllocationDto[];
}

export class EfmApAdvanceDto {
  @ApiProperty() supplierKey!: string;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class EfmApScheduleDto {
  @ApiProperty() supplierKey!: string;
  @ApiProperty() scheduledDate!: string;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() payableKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() earlyDiscountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmApBatchDto {
  @ApiProperty() scheduledDate!: string;
  @ApiProperty({ type: [String] }) scheduleKeys!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class EfmApApprovalActionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() delegatedFromUserId?: string;
}

export class EfmApBlockDto {
  @ApiProperty() blocked!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EfmApHoldDto {
  @ApiProperty() reason!: string;
}

export class EfmApIncidentDto {
  @ApiProperty() supplierKey!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentKey?: string;
}

export class EfmApResolveIncidentDto {
  @ApiProperty() resolution!: string;
}
