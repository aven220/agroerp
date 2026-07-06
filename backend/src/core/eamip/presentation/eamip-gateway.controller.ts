import {
  All,
  Controller,
  Headers,
  Ip,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@/shared/presentation/decorators/public.decorator';
import { ApiGatewayService } from '../application/api-gateway.service';
import { ApiSecurityService } from '../application/api-security.service';

@ApiTags('EAMIP — API Gateway')
@Controller('gateway/v1')
export class EamipGatewayController {
  constructor(
    private readonly gateway: ApiGatewayService,
    private readonly security: ApiSecurityService,
  ) {}

  @Public()
  @All(':apiKey/*')
  @ApiOperation({ summary: 'Reverse proxy gateway' })
  async proxy(
    @Param('apiKey') apiKey: string,
    @Param() params: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-api-key') apiKeyHeader?: string,
    @Ip() ip?: string,
    @Query() query?: Record<string, string>,
  ) {
    const rawKey = apiKeyHeader ?? (req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
    if (!rawKey) {
      res.status(401).json({ message: 'API key required' });
      return;
    }

    const client = await this.security.validateApiKey(rawKey, ip);
    const wildcard = params['0'] ?? '';
    const version = wildcard.split('/')[0] || 'v1';
    const subPath = wildcard.slice(version.length) || '/';

    const result = await this.gateway.execute(
      client.organizationId,
      apiKey,
      version,
      {
        method: req.method,
        path: subPath.startsWith('/') ? subPath : `/${subPath}`,
        body: req.body,
        query,
        headers: {
          Authorization: req.headers.authorization ?? '',
          'X-Forwarded-For': ip ?? '',
        },
      },
      { clientId: client.clientId, scopes: client.scopes, ip },
    );

    if (result.headers?.['content-type']) {
      res.setHeader('content-type', result.headers['content-type']);
    }
    res.status(result.statusCode).json(result.body);
  }
}
