import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IAM_ANOMALY_SEVERITIES, IAM_MFA_TYPES, IAM_SECURITY_EVENT_TYPES } from '@agroerp/shared';

export class UpdateSecurityPolicyDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(6) @Max(128) minPasswordLength?: number;
  @IsOptional() @IsBoolean() requireUppercase?: boolean;
  @IsOptional() @IsBoolean() requireLowercase?: boolean;
  @IsOptional() @IsBoolean() requireNumbers?: boolean;
  @IsOptional() @IsBoolean() requireSymbols?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) passwordExpiryDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) passwordHistoryCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) maxFailedAttempts?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24 * 60) lockoutMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) sessionTimeoutMinutes?: number;
  @IsOptional() @IsBoolean() mfaRequired?: boolean;
  @IsOptional() @IsArray() allowedCountries?: string[];
  @IsOptional() @IsArray() allowedIpRanges?: string[];
  @IsOptional() @IsArray() blockedIpRanges?: string[];
  @IsOptional() @IsObject() allowedHours?: Record<string, unknown>;
}

export class MfaVerifyDto {
  @IsString() code!: string;
  @IsOptional() @IsString() factorId?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() newPassword!: string;
}

export class ResetPasswordDto {
  @IsString() newPassword!: string;
}

export class CloneRoleDto {
  @IsString() newSlug!: string;
  @IsString() newName!: string;
}

export class ImportRoleDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() permissions!: Array<{ resource: string; action: string }>;
}

export class TemporaryRoleDto {
  @IsString() userId!: string;
  @IsString() roleId!: string;
  @IsString() startsAt!: string;
  @IsString() endsAt!: string;
  @IsOptional() @IsString() reason?: string;
}

export class CreateRowPolicyDto {
  @IsString() resourceType!: string;
  @IsString() policyKey!: string;
  @IsOptional() @IsString() effect?: string;
  @IsString() attribute!: string;
  @IsString() operator!: string;
  @IsString() value!: string;
  @IsOptional() @IsArray() roles?: string[];
}

export class CreateFieldPolicyDto {
  @IsString() resourceType!: string;
  @IsString() fieldPath!: string;
  @IsOptional() @IsString() effect?: string;
  @IsOptional() @IsArray() roles?: string[];
  @IsOptional() @IsArray() permissions?: string[];
}

export class RegisterOAuthClientDto {
  @IsString() name!: string;
  @IsString() clientId!: string;
  @IsArray() redirectUris!: string[];
  @IsOptional() @IsArray() scopes?: string[];
}

export class OAuthTokenDto {
  @IsString() client_id!: string;
  @IsString() client_secret!: string;
  @IsString() grant_type!: string;
}

export class RegisterSsoProviderDto {
  @IsString() providerKey!: string;
  @IsString() providerType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() issuerUrl?: string;
  @IsOptional() @IsString() clientId?: string;
}
