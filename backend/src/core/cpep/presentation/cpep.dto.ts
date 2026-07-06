import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() ticketKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() identityDoc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehiclePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class WeighDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() grossWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tareWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() iotDeviceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scaleKey?: string;
  @ApiPropertyOptional() @IsOptional() contingency?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() contingencyReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class IotWeighDto {
  @ApiProperty() @IsString() deviceKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() weighingType?: string;
}

export class ScaleDto {
  @ApiProperty() @IsString() scaleKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() connectionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() iotDeviceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() certified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() certificationExpiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() precisionKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() host?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() port?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() serialPort?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() baudRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class StartWeighingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scaleKey?: string;
  @ApiPropertyOptional() @IsOptional() contingency?: boolean;
}

export class CaptureReadingDto {
  @ApiProperty() @IsString() weighingType!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() freeze?: boolean;
  @ApiPropertyOptional() @IsOptional() average?: boolean;
  @ApiPropertyOptional() @IsOptional() reread?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class ContingencyDto {
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authorizedBy?: string;
}

export class ManualWeighDto {
  @ApiProperty() @IsString() weighingType!: string;
  @ApiProperty() @IsNumber() weightKg!: number;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}

export class ScaleHeartbeatDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() stable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
}

export class QualityDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() humidityPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() temperatureC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() factor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pasillaPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() brocaPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() blackBeansPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() vinegarBeansPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() brokenBeansPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() foreignMatterPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() impuritiesPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() defectsPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() odor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inspectorComments?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() decision?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() labResults?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() photoKeys?: string[];
}

export class QualityLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() lotCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
}

export class QualitySampleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sampleKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class QualityDecisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() decision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() justification?: string;
}

export class SampleCustodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class QualityReevaluateDto extends QualityDto {
  @ApiProperty() @IsString() justification!: string;
}

export class SettlementDto {
  @ApiProperty() @IsNumber() basePricePerKg!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() qualityPricePerKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bonusesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() penaltiesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() withholdingsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() transportTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() roundingMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundingPrecision?: number;
}

export class PaymentDto {
  @ApiProperty() @IsNumber() paidAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() walletProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deferredUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() payments?: Array<Record<string, unknown>>;
}

export class SettlementSimulateDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() basePricePerKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() qualityPricePerKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() transportTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxesTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() withholdingsTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() roundingMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundingPrecision?: number;
}

export class ProducerSignDto {
  @ApiProperty() @IsString() signerName!: string;
  @ApiProperty() @IsString() signatureData!: string;
}

export class VoidSettlementDto {
  @ApiProperty() @IsString() reason!: string;
}

export class InventoryMovementDto {
  @ApiProperty() @IsString() movementType!: string;
  @ApiProperty() @IsNumber() quantityKg!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toWarehouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
}

export class InventoryRevalueDto {
  @ApiProperty() @IsNumber() unitCost!: number;
  @ApiProperty() @IsString() reason!: string;
}

export class ReportGenerateDto {
  @ApiProperty() @IsString() reportType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() days?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() format?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() filters?: Record<string, unknown>;
}

export class CustomReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() metrics?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() groupBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() days?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() format?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() filters?: Record<string, unknown>;
}

export class PhotoDto {
  @ApiProperty() @IsString() photoKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
}

export class SignatureDto {
  @ApiProperty() @IsString() signerRole!: string;
  @ApiProperty() @IsString() signerName!: string;
  @ApiProperty() @IsString() signatureData!: string;
}

export class SampleDto {
  @ApiProperty() @IsString() sampleKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sampleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() custodyCode?: string;
}

export class PriceConfigDto {
  @ApiProperty() @IsString() configKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() basePricePerKg!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRatePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() withholdingPct?: number;
  @ApiPropertyOptional() @IsOptional() bonusRules?: unknown[];
  @ApiPropertyOptional() @IsOptional() penaltyRules?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CatalogEntryDto {
  @ApiProperty() @IsString() catalogKey!: string;
  @ApiProperty() @IsString() entryKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ParameterDto {
  @ApiProperty() @IsString() parameterKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scopeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scopeRef?: string;
  @ApiProperty() @IsObject() value!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() dataType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ReceptionRuleDto {
  @ApiProperty() @IsString() ruleKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coffeeTypeKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seasonKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() openTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() closeTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxTicketsDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxKgDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minHumidityPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxHumidityPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minQualityScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxQualityScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class PurchaseCenterDto {
  @ApiProperty() @IsString() centerKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() centerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() municipality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ValidateReceptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coffeeTypeKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seasonKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() humidityPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() factor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() qualityScore?: number;
}

export class ConfigReasonDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class WizardArrivalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() producerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() identityDoc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() searchMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nfcTag?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class WizardProducerDto {
  @ApiProperty() @IsString() producerId!: string;
}

export class WizardOriginDto {
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotCode?: string;
}

export class WizardVehicleDto {
  @ApiProperty() @IsString() plate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carrierName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiPropertyOptional() @IsOptional() photoUrls?: string[];
}

export class WizardTurnDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() manualTurn?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() preferential?: boolean;
}

export class WizardConfirmDto {
  @ApiPropertyOptional() @IsOptional() @IsString() signerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureData?: string;
}

export class ReorderTurnsDto {
  @ApiProperty() orderedTicketKeys!: string[];
}

export class PriorityTurnDto {
  @ApiProperty() @IsNumber() priority!: number;
  @ApiPropertyOptional() @IsOptional() preferential?: boolean;
}

export class GateValidateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() producerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coffeeTypeKey?: string;
}
