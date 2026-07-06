import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { EipConnectorProtocol, EipEventKind, EipProviderType, EipStatus, EipWebhookDirection } from '@agroerp/prisma-eip-client';

export class EipCreateBindingDto {
  @IsString() bindingKey!: string;
  @IsString() ruleKey!: string;
  @IsString() moduleRef!: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsNumber() priority?: number;
}

export class EipSimulateDto {
  @IsObject() payload!: Record<string, unknown>;
}

export class EipTestRulesDto {
  @IsArray() cases!: Array<Record<string, unknown>>;
}

export class EipCreatePolicyDto {
  @IsString() policyKey!: string;
  @IsString() apiKey!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsNumber() ratePerMinute?: number;
  @IsOptional() @IsNumber() ratePerDay?: number;
  @IsOptional() @IsNumber() throttleMs?: number;
  @IsOptional() @IsString() loadBalance?: string;
  @IsOptional() @IsObject() transformReq?: Record<string, unknown>;
  @IsOptional() @IsObject() transformRes?: Record<string, unknown>;
}

export class EipGatewayProxyDto {
  @IsString() method!: string;
  @IsString() path!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsObject() headers?: Record<string, string>;
  @IsOptional() @IsObject() body?: unknown;
  @IsOptional() @IsObject() query?: Record<string, string>;
}

export class EipCreateWebhookDto {
  @IsString() webhookKey!: string;
  @IsString() name!: string;
  @IsEnum(EipWebhookDirection) direction!: EipWebhookDirection;
  @IsOptional() @IsString() targetUrl?: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsArray() eventTypes?: string[];
  @IsOptional() @IsArray() originHosts?: string[];
  @IsOptional() @IsNumber() maxRetries?: number;
}

export class EipWebhookPayloadDto {
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() signature?: string;
}

export class EipCreateEsbRouteDto {
  @IsString() routeKey!: string;
  @IsString() name!: string;
  @IsString() sourceType!: string;
  @IsString() targetType!: string;
  @IsString() sourceRef!: string;
  @IsString() targetRef!: string;
  @IsOptional() @IsObject() transform?: Record<string, unknown>;
  @IsOptional() @IsArray() orchestration?: unknown[];
  @IsOptional() @IsString() syncMode?: string;
  @IsOptional() @IsNumber() priority?: number;
}

export class EipRouteMessageDto {
  @IsString() sourceRef!: string;
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsBoolean() sync?: boolean;
}

export class EipCreateTopicDto {
  @IsString() topicKey!: string;
  @IsString() name!: string;
  @IsEnum(EipEventKind) eventKind!: EipEventKind;
  @IsOptional() @IsBoolean() persist?: boolean;
}

export class EipSubscribeDto {
  @IsString() subscriptionKey!: string;
  @IsString() topicKey!: string;
  @IsString() subscriberRef!: string;
  @IsOptional() @IsString() filterExpr?: string;
}

export class EipPublishEventDto {
  @IsString() topicKey!: string;
  @IsString() eventType!: string;
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsEnum(EipEventKind) eventKind?: EipEventKind;
}

export class EipCreateConnectorDto {
  @IsString() connectorKey!: string;
  @IsString() name!: string;
  @IsEnum(EipConnectorProtocol) protocol!: EipConnectorProtocol;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() endpointUrl?: string;
  @IsOptional() @IsString() authType?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  @IsOptional() @IsArray() tags?: string[];
}

export class EipInvokeConnectorDto {
  @IsObject() payload!: Record<string, unknown>;
}

export class EipConfigureMessagingDto {
  @IsString() providerKey!: string;
  @IsEnum(EipProviderType) providerType!: EipProviderType;
  @IsString() name!: string;
  @IsObject() config!: Record<string, unknown>;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class EipMessagingPublishDto {
  @IsString() topic!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EipBridgeEventDto {
  @IsString() moduleRef!: string;
  @IsString() eventType!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class EipBridgeFlowDto {
  @IsArray() data!: Array<Record<string, unknown>>;
}

export class EipSetStatusDto {
  @IsEnum(EipStatus) status!: EipStatus;
}

export class EipOfflineBatchDto {
  @IsString() deviceId!: string;
  @IsArray() operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}
