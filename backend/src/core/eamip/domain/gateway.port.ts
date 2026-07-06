import { ApiGatewayRequest, ApiGatewayResponse } from '@agroerp/shared';

export interface ApiGatewayPort {
  execute(
    organizationId: string,
    apiKey: string,
    version: string,
    request: ApiGatewayRequest,
    clientContext?: { clientId: string; scopes: string[]; ip?: string },
  ): Promise<ApiGatewayResponse>;
}
