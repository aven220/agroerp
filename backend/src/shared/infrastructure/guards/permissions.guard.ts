import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessContext, AuthorizationService } from '@agroerp/shared';
import { TenantRequest } from '@/shared/infrastructure/middleware/tenant.middleware';
import { IamAuthorizationGatewayService } from '@/core/eiamp/application/iam-authorization-gateway.service';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) =>
  Reflect.metadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly authorization?: AuthorizationService,
    @Optional() private readonly iamGateway?: IamAuthorizationGatewayService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (this.authorization) {
      const accessContext = this.buildAccessContext(request, user);
      const allowed = await this.authorization.authorize(accessContext, required);
      if (allowed) return true;
      if (this.iamGateway) {
        const abacAllowed = await this.iamGateway.authorize(accessContext, required);
        if (abacAllowed) return true;
      }
      throw new ForbiddenException(`Access denied: ${required.join(', ')}`);
    }

    const userPermissions = user.permissions ?? [];
    const hasPermission = required.every((perm) => {
      if (userPermissions.includes('*:*')) return true;
      return userPermissions.includes(perm);
    });

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permissions: ${required.join(', ')}`);
    }

    return true;
  }

  private buildAccessContext(
    request: TenantRequest,
    user: NonNullable<TenantRequest['user']>,
  ): AccessContext {
    const scope: Record<string, string> = {};
    for (const s of user.scopes ?? []) {
      scope[s.scopeType] = s.scopeId;
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      roles: user.roles,
      permissions: user.permissions,
      userType: user.userType,
      sessionId: user.sessionId,
      deviceId: request.headers['x-device-id'] as string | undefined,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      scope,
      metadata: {
        deviceTrusted: request.headers['x-device-trusted'] === 'true',
      },
    };
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const userRoles = request.user?.roles ?? [];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`Missing role: ${requiredRoles.join(' or ')}`);
    }

    return true;
  }
}

export const Roles = (...roles: string[]) => Reflect.metadata('roles', roles);
