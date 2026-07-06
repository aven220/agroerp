import { IsNumber, IsOptional, IsString } from 'class-validator';

export class EaipModelDto {
  @IsString() name!: string;
  @IsString() serviceType!: string;
  @IsOptional() @IsString() providerRef?: string;
  @IsOptional() config?: Record<string, unknown>;
  @IsOptional() @IsNumber() costLimit?: number;
}

export class EaipPredictionDto {
  @IsString() serviceType!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() @IsString() targetDate?: string;
  @IsOptional() input?: Record<string, unknown>;
}

export class EaipRecommendationDto {
  @IsString() category!: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() fieldLotId?: string;
  @IsOptional() @IsString() cropCode?: string;
  @IsOptional() factors?: Record<string, number>;
}

export class EaipSimulationDto {
  @IsString() simulationType!: string;
  @IsString() name!: string;
  @IsOptional() baseScenario?: Record<string, unknown>;
  @IsOptional() scenarios?: Array<{ name: string; parameters: Record<string, unknown> }>;
}

export class EaipTwinDto {
  @IsString() entityType!: string;
  @IsString() entityRef!: string;
  @IsString() name!: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class EaipTwinSyncDto {
  @IsString() source!: string;
  @IsOptional() telemetry?: Record<string, unknown>;
  @IsOptional() payload?: Record<string, unknown>;
}

export class EaipAssistantSessionDto {
  @IsOptional() @IsString() title?: string;
}

export class EaipAssistantMessageDto {
  @IsString() content!: string;
}

export class EaipBridgeDto {
  @IsString() moduleRef!: string;
  payload!: Record<string, unknown>;
}

export class EaipOfflineBatchDto {
  @IsString() batchKey!: string;
  payload!: Record<string, unknown>;
}
