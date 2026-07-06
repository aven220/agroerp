import { IsArray, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty() @IsString() @MinLength(2) deviceKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() deviceType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() protocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mqttTopic?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class AssignDeviceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() farmId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupKey?: string;
}

export class TagDeviceDto {
  @ApiProperty() @IsArray() tags!: string[];
}

export class CreateDeviceGroupDto {
  @ApiProperty() @IsString() groupKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
}

export class IngestTelemetryDto {
  @ApiProperty() @IsString() deviceKey!: string;
  @ApiProperty() @IsString() metricKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() valueText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batteryLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() signalQuality?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class IngestBatchDto {
  @ApiProperty() @IsArray() readings!: IngestTelemetryDto[];
}

export class DeviceCommandDto {
  @ApiProperty() @IsObject() command!: Record<string, unknown>;
}

export class CreateFirmwareReleaseDto {
  @ApiProperty() @IsString() releaseKey!: string;
  @ApiProperty() @IsString() deviceType!: string;
  @ApiProperty() @IsString() version!: string;
  @ApiProperty() @IsString() checksum!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() downloadUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() releaseNotes?: string;
}

export class RegisterGatewayDto {
  @ApiProperty() @IsString() gatewayKey!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hostname?: string;
}

export class UpdateTwinDesiredDto {
  @ApiProperty() @IsObject() desired!: Record<string, unknown>;
}
