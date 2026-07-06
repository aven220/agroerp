import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EscmCatalogDto {
  @ApiProperty() catalogKey!: string;
  @ApiProperty() entryKey!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EscmParameterDto {
  @ApiProperty() parameterKey!: string;
  @ApiProperty() name!: string;
  @ApiProperty() value!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() dataType?: string;
}

export class EscmCustomerDto {
  @ApiProperty() @IsString() customerType!: string;
  @ApiProperty() @IsString() legalName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commercialName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() segmentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channelKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() municipalityCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceListKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryMethodKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incotermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EscmContactDto {
  @ApiProperty() firstName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class EscmAddressDto {
  @ApiProperty() line1!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() line2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class EscmVisitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() visitedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() offline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() visitKey?: string;
}

export class EscmVisitSyncItemDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() visitKey!: string;
  @ApiProperty() visitedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() offline?: boolean;
}

export class EscmVisitSyncDto {
  @ApiProperty({ type: [EscmVisitSyncItemDto] }) visits!: EscmVisitSyncItemDto[];
}

export class EscmPriceListDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceListKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class EscmPriceListItemDto {
  @ApiProperty() itemKey!: string;
  @ApiProperty() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() uomKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxKey?: string;
}

export class EscmCommercialConditionDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conditionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceListKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryMethodKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incotermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() specialTerms?: string;
}

export class EscmResolvePriceDto {
  @ApiProperty() itemKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
}

export class EscmPipelineStageDto {
  @ApiProperty() stageKey!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() defaultProbability?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isClosed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isWon?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLost?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isArchived?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class EscmProspectDto {
  @ApiProperty() companyName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmOpportunityDto {
  @ApiProperty() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stageKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prospectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() competitors?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class EscmOpportunityStageDto {
  @ApiProperty() stageKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() winReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lossReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EscmInteractionDto {
  @ApiProperty() interactionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() opportunityKey?: string;
}

export class EscmActivityDto {
  @ApiProperty() activityType!: string;
  @ApiProperty() subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reminderAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() opportunityKey?: string;
}

export class EscmQuotationLineDto {
  @ApiProperty() itemKey!: string;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() taxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class EscmQuotationDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() lines!: EscmQuotationLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() opportunityKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scenarioLabel?: string;
}

export class EscmQuotationSimulateDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() lines!: EscmQuotationLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scenarioLabel?: string;
}

export class EscmQuotationApproveDto {
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
}

export class EscmConvertQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reserveInventory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() submit?: boolean;
}

export class EscmOrderLineDto {
  @ApiProperty() @IsString() itemKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiProperty() @IsNumber() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() taxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRate?: number;
}

export class EscmOrderDto {
  @ApiProperty() @IsString() customerKey!: string;
  @ApiProperty({ type: [EscmOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscmOrderLineDto)
  lines!: EscmOrderLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() orderType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incotermKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryMethodKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recurrenceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentOrderKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() consolidationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() submit?: boolean;
}

export class EscmOrderSubmitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmOrderTransitionDto {
  @ApiProperty() toStatus!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class EscmOrderPartialDto {
  @ApiProperty() lines!: Array<{ lineKey: string; quantity: number }>;
}

export class EscmOrderConsolidateDto {
  @ApiProperty({ type: [String] }) orderKeys!: string[];
}

export class EscmOrderScheduleDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty({ type: [EscmOrderLineDto] }) lines!: EscmOrderLineDto[];
  @ApiProperty() scheduledAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recurrenceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
}

export class EscmOrderApprovalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
}

export class EscmOrderReservationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forcePartial?: boolean;
}

export class EscmApprovalPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() policyKey?: string;
  @ApiProperty() name!: string;
  @ApiProperty() triggerType!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() thresholdValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() thresholdPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EscmOrderSyncDto {
  @ApiProperty() orders!: Array<{
    clientRef: string;
    customerKey: string;
    lines: EscmOrderLineDto[];
    notes?: string;
  }>;
}

export class EscmCarrierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() carrierKey?: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
}

export class EscmVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carrierKey?: string;
  @ApiProperty() plateNumber!: string;
  @ApiProperty() vehicleType!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacityKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacityM3?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() gpsDeviceId?: string;
}

export class EscmDriverDto {
  @ApiPropertyOptional() @IsOptional() @IsString() driverKey?: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
}

export class EscmPickWaveDto {
  @ApiProperty() warehouseKey!: string;
  @ApiProperty({ type: [String] }) orderKeys!: string[];
  @ApiPropertyOptional() @IsOptional() zoneKeys?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
}

export class EscmPickTaskDto {
  @ApiProperty() quantityPicked!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() lotKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialKey?: string;
}

export class EscmDispatchDto {
  @ApiPropertyOptional() lines?: Array<{ orderLineKey: string; quantity: number; lotKey?: string; serialKey?: string }>;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waveKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmDispatchShipDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
}

export class EscmRouteDto {
  @ApiProperty({ type: [String] }) dispatchKeys!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carrierKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoAssign?: boolean;
}

export class EscmDeliveryDto {
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    quantity: number;
    rejectedQty?: number;
    returnedQty?: number;
    lotKey?: string;
    serialKey?: string;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeKey?: string;
  @ApiProperty() incidentType!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class EscmDeliverySyncDto {
  @ApiProperty() deliveries!: Array<{
    clientRef: string;
    dispatchKey: string;
    lines: Array<{ itemKey: string; quantity: number; rejectedQty?: number; returnedQty?: number }>;
    signatureUrl?: string;
    photoUrls?: string[];
    latitude?: number;
    longitude?: number;
    notes?: string;
  }>;
}

export class EscmOpportunitySyncItemDto {
  @ApiProperty() opportunityKey!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stageKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedValue?: number;
}

export class EscmOpportunitySyncDto {
  @ApiProperty({ type: [EscmOpportunitySyncItemDto] }) updates!: EscmOpportunitySyncItemDto[];
}

export class EscmTaxRuleDto {
  @ApiProperty() ruleKey!: string;
  @ApiProperty() ruleType!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isExempt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
}

export class EscmInvoiceDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    taxKey?: string;
    orderLineKey?: string;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
}

export class EscmInvoiceFromOrderDto {
  @ApiPropertyOptional() lines?: Array<{ orderLineKey: string; quantity: number }>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPartial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() asProforma?: boolean;
}

export class EscmInvoiceConsolidateDto {
  @ApiProperty({ type: [String] }) orderKeys!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() consolidationKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmInvoiceRecurringDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() recurrenceKey!: string;
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    quantity: number;
    unitPrice: number;
    taxKey?: string;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() parentInvoiceKey?: string;
}

export class EscmInvoiceVoidDto {
  @ApiProperty() reason!: string;
}

export class EscmReturnDto {
  @ApiProperty() returnType!: string;
  @ApiProperty() customerKey!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    quantity: number;
    lotKey?: string;
    serialKey?: string;
    reason?: string;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmReturnRejectDto {
  @ApiProperty() reason!: string;
}

export class EscmWarrantyDto {
  @ApiProperty() claimType!: string;
  @ApiProperty() customerKey!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemKey?: string;
  @ApiPropertyOptional() @IsOptional() evidenceUrls?: string[];
}

export class EscmWarrantyApproveDto {
  @ApiProperty() resolutionType!: 'replacement' | 'repair';
}

export class EscmWarrantyRejectDto {
  @ApiProperty() reason!: string;
}

export class EscmWarrantyResolveDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmCreditNoteDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnKey?: string;
}

export class EscmDebitNoteDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ type: [Object] }) lines!: Array<{
    itemKey: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }>;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceKey?: string;
}

export class EscmWarrantySyncDto {
  @ApiProperty() claims!: Array<{
    clientRef: string;
    claimType: string;
    customerKey: string;
    description: string;
    invoiceKey?: string;
    orderKey?: string;
    itemKey?: string;
    evidenceUrls?: string[];
  }>;
}

export class EscmPaymentDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() paymentMethod!: string;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() supportUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() asAdvance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() allocations?: Array<{ receivableKey?: string; invoiceKey?: string; amount: number }>;
}

export class EscmPaymentVoidDto {
  @ApiProperty() reason!: string;
}

export class EscmCollectionCampaignDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() targetCriteria?: Record<string, unknown>;
}

export class EscmCollectionCallDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() outcome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivableKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmCollectionEscalateDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() toLevel!: number;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivableKey?: string;
}

export class EscmPaymentAgreementDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiPropertyOptional() terms?: Array<{ dueDate: string; amount: number; label?: string }>;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EscmPaymentPromiseDto {
  @ApiProperty() customerKey!: string;
  @ApiProperty() promisedAmount!: number;
  @ApiProperty() promisedDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivableKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agreementKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() supportUrls?: string[];
}

export class EscmPaymentPromiseSyncDto {
  @ApiProperty({ type: [EscmPaymentPromiseDto] }) promises!: EscmPaymentPromiseDto[];
}

export class EscmOpsFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() regionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}

export class EscmReportExportDto {
  @ApiProperty() reportType!: string;
  @ApiProperty() format!: 'csv' | 'excel' | 'pdf';
  @ApiPropertyOptional() @IsOptional() @IsObject() filters?: Record<string, unknown>;
}

export class EscmCustomReportDto {
  @ApiProperty() name!: string;
  @ApiProperty() reportType!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() definition?: Record<string, unknown>;
}

export class EscmSalesTargetDto {
  @ApiProperty() periodKey!: string;
  @ApiProperty() dimension!: string;
  @ApiProperty() metricKey!: string;
  @ApiProperty() targetAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensionKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() actualAmount?: number;
}
