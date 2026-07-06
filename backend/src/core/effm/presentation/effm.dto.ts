import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EffmMachineDto {
  @IsString() machineType!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() qrCode?: string;
}

export class EffmImplementDto {
  @IsString() implementType!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsArray() compatibleMachineTypes?: string[];
}

export class EffmCouplingDto {
  @IsString() machineId!: string;
  @IsString() implementId!: string;
  @IsString() action!: string;
}

export class EffmOperatorAssignmentDto {
  @IsString() employeeRef!: string;
  @IsOptional() @IsString() machineId?: string;
  @IsOptional() @IsString() shiftRef?: string;
  @IsOptional() @IsString() licenseType?: string;
  @IsOptional() @IsString() certRef?: string;
}

export class EffmOperationStartDto {
  @IsString() machineId!: string;
  @IsOptional() @IsString() assignmentId?: string;
  @IsOptional() @IsString() laborTaskRef?: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
}

export class EffmOperationEndDto {
  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsNumber() areaCoveredHa?: number;
  @IsOptional() @IsNumber() idleMinutes?: number;
  @IsOptional() @IsNumber() unproductiveMinutes?: number;
}

export class EffmFuelDto {
  @IsString() machineId!: string;
  @IsNumber() liters!: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsString() laborTaskRef?: string;
  @IsOptional() @IsNumber() hoursWorked?: number;
  @IsOptional() @IsNumber() areaHa?: number;
}

export class EffmTelemetryConfigDto {
  @IsString() protocol!: string;
  @IsOptional() @IsString() machineId?: string;
  @IsOptional() @IsString() controllerRef?: string;
}

export class EffmTelemetryIngestDto {
  @IsString() protocol!: string;
  @IsOptional() @IsString() machineId?: string;
  @IsOptional() @IsString() configId?: string;
  payload!: Record<string, unknown>;
}

export class EffmAutoLaborDto {
  @IsString() eventType!: string;
  @IsString() source!: string;
  @IsOptional() @IsString() machineId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() payload?: Record<string, unknown>;
}

export class EffmIncidentDto {
  @IsString() incidentType!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() machineId?: string;
  @IsOptional() @IsArray() photoRefs?: string[];
}

export class EffmBridgeDto {
  @IsString() moduleRef!: string;
  payload!: Record<string, unknown>;
}

export class EffmOfflineBatchDto {
  @IsString() batchKey!: string;
  payload!: Record<string, unknown>;
}
