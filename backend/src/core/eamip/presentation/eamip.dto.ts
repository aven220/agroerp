import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  API_AUTH_TYPES,
  API_CONNECTOR_TYPES,
  API_DEFINITION_STATUSES,
  API_DOMAINS,
  API_HTTP_METHODS,
} from '@agroerp/shared';

export class CreateApiDefinitionDto {
  @IsString() @MaxLength(100) apiKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn([...API_DOMAINS]) domain!: string;
  @IsString() basePath!: string;
  @IsString() moduleRef!: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn([...API_AUTH_TYPES]) authType?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsObject() corsConfig?: Record<string, unknown>;
}

export class CreateApiRouteDto {
  @IsString() routeKey!: string;
  @IsIn([...API_HTTP_METHODS]) method!: string;
  @IsString() path!: string;
  @IsString() upstreamPath!: string;
  @IsString() moduleRef!: string;
  @IsOptional() @IsString() apiVersionId?: string;
  @IsOptional() timeoutMs?: number;
  @IsOptional() retryCount?: number;
}

export class CreateApiVersionDto {
  @IsString() version!: string;
  @IsOptional() @IsString() changelog?: string;
  @IsOptional() @IsObject() openApiSpec?: Record<string, unknown>;
}

export class CreateApiClientDto {
  @IsString() clientKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() scopes?: string[];
  @IsOptional() rateLimitPerMinute?: number;
  @IsOptional() rateLimitPerDay?: number;
  @IsOptional() @IsArray() whitelistIps?: string[];
  @IsOptional() @IsArray() blacklistIps?: string[];
}

export class CreateApiKeyDto {
  @IsString() name!: string;
  @IsOptional() expiresAt?: string;
}

export class CreateApiConnectorDto {
  @IsString() connectorKey!: string;
  @IsIn([...API_CONNECTOR_TYPES]) connectorType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsIn([...API_AUTH_TYPES]) authType?: string;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsString() healthUrl?: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class GatewayProxyDto {
  @IsString() method!: string;
  @IsString() path!: string;
  @IsOptional() @IsObject() body?: unknown;
  @IsOptional() @IsObject() query?: Record<string, string>;
}

export class UpdateApiClientStatusDto {
  @IsIn(['active', 'suspended', 'revoked']) status!: 'active' | 'suspended' | 'revoked';
}

export class ApiCatalogFilterDto {
  @IsOptional() @IsIn([...API_DOMAINS]) domain?: string;
  @IsOptional() @IsIn([...API_DEFINITION_STATUSES]) status?: string;
}
