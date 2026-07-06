import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  userId?: string;
  organizationId?: string;
}

export interface AgroRequest extends Request {
  agroContext?: RequestContext;
  user?: {
    id: string;
    email: string;
    organizationId: string;
    roles: string[];
    permissions: string[];
  };
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: AgroRequest, _res: Response, next: NextFunction) {
    req.agroContext = {
      correlationId:
        (req.headers['x-correlation-id'] as string) ?? uuidv4(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'] as string | undefined,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
    };

    next();
  }
}

export function buildEventMetadata(
  ctx?: Partial<RequestContext>,
): {
  userId?: string;
  deviceId?: string;
  correlationId: string;
  source: 'api';
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    userId: ctx?.userId,
    deviceId: ctx?.deviceId,
    correlationId: ctx?.correlationId ?? uuidv4(),
    source: 'api',
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  };
}
