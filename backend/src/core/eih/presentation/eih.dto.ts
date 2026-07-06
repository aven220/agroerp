import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterConnectorDto {
  @ApiProperty() @IsString() @MinLength(2) connectorKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() protocol!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dataFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() syncMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() catalogKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endpointUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
}

export class UpdateConnectorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endpointUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() syncMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dataFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authType?: string;
}

export class CreateFlowDto {
  @ApiProperty() @IsString() @MinLength(2) flowKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceConnectorKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetConnectorKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() syncMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduleCron?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() routingRules?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() validationRules?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsObject() definition?: Record<string, unknown>;
}

export class AddFlowStepDto {
  @ApiProperty() @IsString() stepKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() stepOrder!: number;
  @ApiProperty() @IsString() stepType!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class FieldMappingDto {
  @ApiProperty() @IsString() sourceField!: string;
  @ApiProperty() @IsString() targetField!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transform?: string;
  @ApiPropertyOptional() @IsOptional() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultValue?: string;
}

export class SetFieldMappingsDto {
  @ApiProperty() @IsArray() mappings!: FieldMappingDto[];
}

export class TransformDto {
  @ApiProperty() input!: unknown;
  @ApiProperty() @IsString() inputFormat!: string;
  @ApiProperty() @IsString() outputFormat!: string;
}

export class ExecuteSyncDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() data?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsString() syncMode?: string;
}

export class RegisterWebhookDto {
  @ApiProperty() @IsString() endpointKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() path!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() connectorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() flowId?: string;
}

export class WebhookReceiveDto {
  @ApiProperty() @IsObject() payload!: Record<string, unknown>;
}

export class SuggestMappingsDto {
  @ApiProperty() @IsArray() sourceFields!: string[];
  @ApiProperty() @IsArray() targetFields!: string[];
}
