import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { GroupType, OrgUnitType, PolicyEffect } from '@prisma/client';

export class CreatePolicyDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: PolicyEffect }) @IsEnum(PolicyEffect) effect!: PolicyEffect;
  @ApiPropertyOptional() @IsOptional() @IsString() resource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() subject?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePolicyDto extends CreatePolicyDto {}

export class CreateRoleDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() permissionKeys?: string[];
}

export class UpdateRoleDto extends CreateRoleDto {}

export class AssignRoleDto {
  @ApiProperty() @IsUUID() userId!: string;
}

export class CreateGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: GroupType }) @IsOptional() @IsEnum(GroupType) type?: GroupType;
}

export class UpdateGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: GroupType }) @IsOptional() @IsEnum(GroupType) type?: GroupType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateOrgUnitDto {
  @ApiProperty({ enum: OrgUnitType }) @IsEnum(OrgUnitType) type!: OrgUnitType;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateOrgUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateDelegationDto {
  @ApiProperty() @IsUUID() delegateId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() delegatorId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() scopes?: Record<string, unknown>;
  @ApiProperty() @IsDateString() startsAt!: string;
  @ApiProperty() @IsDateString() endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CreateServiceAccountDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() scopes?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

export class RevokeSessionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class AssignUserScopeDto {
  @ApiProperty() @IsString() scopeType!: string;
  @ApiProperty() @IsUUID() scopeId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orgUnitId?: string;
}

export class CreateTeamDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orgUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leaderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTeamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orgUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leaderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateSubstitutionDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty() @IsUUID() substituteId!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() roleSlugs?: string[];
  @ApiProperty() @IsDateString() startsAt!: string;
  @ApiProperty() @IsDateString() endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
