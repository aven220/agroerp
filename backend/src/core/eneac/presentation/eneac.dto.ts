import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { NotificationRuleDefinition } from '@agroerp/shared';

export class CreateNotificationRuleDto implements NotificationRuleDefinition {
  @ApiProperty() @IsString() @IsNotEmpty() ruleKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() priority?: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) eventTypes!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() eventCategory?: NotificationRuleDefinition['eventCategory'];
  @ApiPropertyOptional() @IsOptional() @IsString() alertSeverity?: NotificationRuleDefinition['alertSeverity'];
  @ApiPropertyOptional() @IsOptional() @IsObject() conditions?: NotificationRuleDefinition['conditions'];
  @ApiProperty() @IsArray() channels!: NotificationRuleDefinition['channels'];
  @ApiProperty() @IsArray() recipients!: NotificationRuleDefinition['recipients'];
  @ApiPropertyOptional() @IsOptional() @IsObject() schedule?: NotificationRuleDefinition['schedule'];
  @ApiPropertyOptional() @IsOptional() @IsObject() escalation?: NotificationRuleDefinition['escalation'];
  @ApiPropertyOptional() @IsOptional() @IsObject() suppression?: NotificationRuleDefinition['suppression'];
  @ApiPropertyOptional() @IsOptional() expiresInHours?: number;
  @ApiPropertyOptional() @IsOptional() maxRetries?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() groupingKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() aiReadiness?: NotificationRuleDefinition['aiReadiness'];
}

export class UpdateNotificationRuleDto extends CreateNotificationRuleDto {}

export class InboxCommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() content!: string;
}

export class InboxAssignDto {
  @ApiProperty() @IsUUID() userId!: string;
}

export class InboxImportantDto {
  @ApiProperty() @IsBoolean() important!: boolean;
}

export class CreateScheduleDto {
  @ApiProperty() @IsUUID() recipientId!: string;
  @ApiProperty() @IsString() scheduleType!: string;
  @ApiProperty() @IsDateString() fireAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cronExpression?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() recurrence?: Record<string, unknown>;
  @ApiProperty() @IsObject() payload!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ruleId?: string;
}

export class RegisterDeviceTokenDto {
  @ApiProperty() @IsString() @IsNotEmpty() token!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() platform?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() deviceId?: string;
}

export class ExternalEventDto {
  @ApiProperty() @IsString() @IsNotEmpty() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aggregateType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() aggregateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() alertSeverity?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notify?: boolean;
}

export class SendNotificationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientId?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alertSeverity?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() channels?: NotificationRuleDefinition['channels'];
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
}
