import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AccessControlService } from '../application/access-control.service';
import { SessionsService } from '../application/sessions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly sessions: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const tokenPurpose = (payload as JwtPayload & { purpose?: string }).purpose;
    if (tokenPurpose === 'mfa_pending') {
      throw new UnauthorizedException('Invalid token type');
    }
    if (!payload.sessionId) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.orgId,
        deletedAt: null,
        status: 'active',
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.expiresAt && user.expiresAt < new Date()) {
      throw new UnauthorizedException('User account expired');
    }

    if (payload.sessionId) {
      const valid = await this.sessions.validateSession(
        payload.sessionId,
        payload.jti,
      );
      if (!valid) {
        throw new UnauthorizedException('Session revoked or expired');
      }
      await this.sessions.touch(payload.sessionId);
    }

    const access = await this.accessControl.resolveUserAccess(
      user.id,
      user.organizationId,
    );

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      userType: user.userType,
      sessionId: payload.sessionId,
      roles: access.roles,
      permissions: access.permissions,
      scopes: access.scopes,
    };
  }
}
