import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EopsUpsertGlobalConfigDto {
  @IsString() configKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsObject() value!: Record<string, unknown>;
  @IsOptional() @IsString() environment?: string;
}

export class EopsUpsertTenantConfigDto {
  @IsString() tenantKey!: string;
  @IsString() configKey!: string;
  @IsObject() value!: Record<string, unknown>;
}

export class EopsUpsertModuleConfigDto {
  @IsString() moduleRef!: string;
  @IsString() configKey!: string;
  @IsObject() value!: Record<string, unknown>;
}

export class EopsEnvVariableDto {
  @IsString() varKey!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsString() environment?: string;
  @IsOptional() @IsBoolean() isSecret?: boolean;
  @IsOptional() @IsString() valueRef?: string;
}

export class EopsMaintenanceDto {
  @IsString() windowKey!: string;
  @IsString() title!: string;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsString() message?: string;
}

export class EopsScheduledTaskDto {
  @IsString() taskKey!: string;
  @IsString() name!: string;
  @IsString() cron!: string;
  @IsString() handlerRef!: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EopsFeatureFlagDto {
  @IsString() flagKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsNumber() rolloutPct?: number;
  @IsOptional() @IsString() environment?: string;
  @IsOptional() @IsString() clientRef?: string;
}

export class EopsDynamicConfigDto {
  @IsString() configKey!: string;
  @IsObject() value!: Record<string, unknown>;
  @IsOptional() @IsString() namespace?: string;
  @IsOptional() @IsString() environment?: string;
}

export class EopsBackupScheduleDto {
  @IsString() scheduleKey!: string;
  @IsString() name!: string;
  @IsString() targetType!: string;
  @IsString() cron!: string;
  @IsOptional() @IsNumber() retentionDays?: number;
}

export class EopsRunBackupDto {
  @IsOptional() @IsString() scheduleKey?: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EopsRestoreDto {
  @IsString() backupRunKey!: string;
  @IsOptional() @IsBoolean() validate?: boolean;
}

export class EopsLicenseDto {
  @IsString() licenseKey!: string;
  @IsString() planKey!: string;
  @IsOptional() @IsNumber() seats?: number;
  @IsOptional() @IsNumber() trialDays?: number;
}

export class EopsSubscriptionDto {
  @IsString() subscriptionKey!: string;
  @IsString() planKey!: string;
  @IsOptional() @IsString() renewsAt?: string;
}

export class EopsSecurityPolicyDto {
  @IsString() policyKey!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsObject() rules!: Record<string, unknown>;
  @IsOptional() @IsString() severity?: string;
}

export class EopsSecretDto {
  @IsString() secretKey!: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsNumber() rotationDays?: number;
}

export class EopsDeploymentDto {
  @IsString() deploymentKey!: string;
  @IsString() version!: string;
  @IsOptional() @IsString() environment?: string;
  @IsOptional() @IsString() changelog?: string;
}

export class EopsWorkerJobDto {
  @IsString() queueName!: string;
  @IsString() handlerRef!: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class EopsHaProfileDto {
  @IsString() profileKey!: string;
  @IsString() name!: string;
  @IsString() strategy!: string;
  @IsObject() config!: Record<string, unknown>;
}

export class EopsBridgeDto {
  @IsString() moduleRef!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EopsQueueSampleDto {
  @IsString() queueKey!: string;
  @IsNumber() depth!: number;
  @IsNumber() consumers!: number;
  @IsNumber() lagMs!: number;
}
