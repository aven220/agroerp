import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '@/shared/infrastructure/middleware/tenant.middleware';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.user;
  },
);
