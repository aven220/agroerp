import { EamConditionMetricKind, EamEnergyType, EamIotProtocol, EamRelSimulationType } from '@prisma/client';

export class EamMetricProfileDto {
  assetType!: string;
  metricKind!: EamConditionMetricKind;
  label!: string;
  unit?: string;
  warnThreshold?: number;
  critThreshold?: number;
}

export class EamConditionReadingDto {
  assetKey!: string;
  metricKind!: EamConditionMetricKind;
  value!: number;
  unit?: string;
  source?: string;
}

export class EamIotSlotDto {
  name!: string;
  protocol!: EamIotProtocol;
  endpointConfig?: Record<string, unknown>;
}

export class EamIotEventDto {
  slotKey!: string;
  payload!: Record<string, unknown>;
  assetKey?: string;
}

export class EamReliabilityEventDto {
  assetKey!: string;
  eventType!: string;
  downtimeHours!: number;
  repairHours!: number;
  costImpact!: number;
  occurredAt!: string;
  resolvedAt?: string;
}

export class EamEnergyReadingDto {
  energyType!: EamEnergyType;
  quantity!: number;
  periodStart!: string;
  periodEnd!: string;
  unitCost!: number;
  assetKey?: string;
  locationKey?: string;
  unit?: string;
}

export class EamSimulationDto {
  name!: string;
  simulationType!: EamRelSimulationType;
  baseline!: Record<string, unknown>;
  parameters!: Record<string, unknown>;
}

export class EamSimulationScenarioDto {
  name!: string;
  parameters!: Record<string, unknown>;
}

export class EamDigitalTwinSyncDto {
  telemetry!: Record<string, unknown>;
  virtualState!: Record<string, unknown>;
}

export class EamDigitalTwinSlotDto {
  assetKey!: string;
  syncConfig?: Record<string, unknown>;
}

export class EamRelOfflineBatchDto {
  deviceId!: string;
  operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}

export class EamPredictiveSuggestionDto {
  assetKey!: string;
}
