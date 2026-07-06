import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { AiServiceType } from '@agroerp/shared';
import { EintEtlMode, EintNotificationChannel, EintReportFormat } from '@agroerp/prisma-eint-client';

export class EintAiInvokeDto {
  @IsString() serviceType!: AiServiceType;
  @IsString() prompt!: string;
  @IsOptional() @IsString() moduleRef?: string;
}

export class EintChatDto {
  @IsString() message!: string;
}

export class EintAssistantChatDto {
  @IsString() message!: string;
}

export class EintCreateProviderDto {
  @IsString() providerKey!: string;
  @IsString() name!: string;
  @IsString() vendor!: string;
  @IsOptional() @IsString() environment?: string;
  @IsOptional() @IsString() modelDefault?: string;
  @IsOptional() @IsNumber() quotaDaily?: number;
  @IsOptional() @IsNumber() fallbackOrder?: number;
}

export class EintCreateDimensionDto {
  @IsString() dimensionKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() sourceModule!: string;
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class EintCreateFactDto {
  @IsString() factKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() sourceModule!: string;
  @IsOptional() @IsObject() measures?: Record<string, unknown>;
}

export class EintLoadSnapshotDto {
  @IsArray() records!: Array<Record<string, unknown>>;
}

export class EintCreateEtlJobDto {
  @IsString() jobKey!: string;
  @IsString() name!: string;
  @IsString() sourceModule!: string;
  @IsOptional() @IsString() targetFactKey?: string;
  @IsOptional() @IsEnum(EintEtlMode) mode?: EintEtlMode;
  @IsOptional() @IsString() schedule?: string;
  @IsOptional() @IsObject() transform?: Record<string, string>;
}

export class EintRunEtlDto {
  @IsOptional() @IsArray() data?: Array<Record<string, unknown>>;
}

export class EintCreateKpiDto {
  @IsString() kpiKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() moduleRef!: string;
  @IsOptional() @IsString() formula?: string;
  @IsOptional() @IsNumber() targetValue?: number;
}

export class EintQueryDto {
  @IsObject() query!: Record<string, unknown>;
}

export class EintCreateReportDto {
  @IsString() templateKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsObject() definition!: Record<string, unknown>;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsArray() groupings?: unknown[];
}

export class EintRunReportDto {
  @IsEnum(EintReportFormat) format!: EintReportFormat;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
}

export class EintScheduleReportDto {
  @IsString() scheduleKey!: string;
  @IsString() cron!: string;
  @IsArray() recipients!: string[];
}

export class EintUpdateDashboardDto {
  @IsObject() layout!: Record<string, unknown>;
  @IsArray() widgets!: unknown[];
}

export class EintCreateNotificationRuleDto {
  @IsString() ruleKey!: string;
  @IsString() name!: string;
  @IsString() eventType!: string;
  @IsOptional() @IsNumber() priority?: number;
  @IsOptional() @IsArray() channels?: EintNotificationChannel[];
  @IsOptional() @IsBoolean() isPredictive?: boolean;
}

export class EintDispatchNotificationDto {
  @IsString() eventType!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EintBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EintCompareDto {
  @IsArray() values!: number[];
}
