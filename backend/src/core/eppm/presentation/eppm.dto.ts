import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEppmPluginDto {
  @ApiProperty() @IsString() @MinLength(3) pluginKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() vendor!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorType?: string;
  @ApiProperty() @IsString() pluginType!: string;
  @ApiProperty() @IsString() categoryKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visibility?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() manifest?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() screenshots?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() documentation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() license?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() compatibility?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
}

export class InstallPluginDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}

export class PluginReviewDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class ScheduleUpdateDto {
  @ApiProperty() @IsString() toVersion!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
}

export class ValidateManifestDto {
  @ApiProperty() @IsObject() manifest!: Record<string, unknown>;
}

export class RegisterDeveloperDto {
  @ApiProperty() @IsString() developerKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() contactEmail!: string;
}

export class CloneConfigDto {
  @ApiProperty() @IsString() targetPluginKey!: string;
}

export class ToggleAutoUpdateDto {
  @ApiProperty() @IsBoolean() autoUpdate!: boolean;
}
