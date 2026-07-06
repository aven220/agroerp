import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface TenantRequest extends Request {
  organizationId?: string;
  user?: {
    id: string;
    email: string;
    organizationId: string;
    userType?: string;
    sessionId?: string;
    roles: string[];
    permissions: string[];
    scopes?: { scopeType: string; scopeId: string }[];
  };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const orgId = req.user?.organizationId;

    if (!orgId) {
      return next();
    }

    req.organizationId = orgId;
    await this.prisma.setTenantContext(orgId);
    next();
  }
}

@Injectable()
export class RequireTenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    if (!req.organizationId) {
      throw new UnauthorizedException('Tenant context required');
    }
    next();
  }
}
