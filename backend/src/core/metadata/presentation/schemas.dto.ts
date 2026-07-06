import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FIELD_TYPES, FieldDefinition } from '@agroerp/shared';

export class FieldDefinitionDto implements FieldDefinition {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty({ enum: FIELD_TYPES })
  @IsString()
  type!: FieldDefinition['type'];

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  validation?: FieldDefinition['validation'];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogId?: string;
}

export class CreateSchemaDto {
  @ApiProperty({ example: 'generic_entity' })
  @IsString()
  @IsNotEmpty()
  resourceType!: string;

  @ApiPropertyOptional({ example: 'Entidad genérica' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ type: [FieldDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinitionDto)
  fields!: FieldDefinitionDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

export class UpdateSchemaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: [FieldDefinitionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinitionDto)
  fields?: FieldDefinitionDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
