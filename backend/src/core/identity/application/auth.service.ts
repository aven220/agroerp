import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, SYSTEM_ROLES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { AccessControlService } from './access-control.service';
import { SessionsService } from './sessions.service';
import { IAM_AUTH_PORT, IamAuthPort } from '@/core/eiamp/domain/iam-auth.port';
import { IamMfaService } from '@/core/eiamp/application/iam-mfa.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly core: CoreEngineService,
    private readonly accessControl: AccessControlService,
    private readonly sessions: SessionsService,
    @Optional() @Inject(IAM_AUTH_PORT) private readonly iam?: IamAuthPort,
    @Optional() private readonly iamMfa?: IamMfaService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });
    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const correlationId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationSlug,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'Administrator',
          slug: SYSTEM_ROLES.ADMIN,
          description: 'Full organization access',
          isSystem: true,
        },
      });

      const permissions = await tx.permission.findMany();
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: adminRole.id,
            permissionId: p.id,
          })),
        });
      }

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: adminRole.id },
      });

      return { org, user, adminRole };
    });

    await this.core.emitUserCreated(
      result.org.id,
      result.user.id,
      {
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: SYSTEM_ROLES.ADMIN,
      },
      {
        ctx: {
          correlationId,
          userId: result.user.id,
          organizationId: result.org.id,
          ipAddress: ip,
          userAgent,
        },
      },
    );

    return await this.buildAuthResponse(result.user, [SYSTEM_ROLES.ADMIN], {});
  }

  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
    deviceId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        userRoles: { include: { role: true } },
        organization: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.organization.status !== 'active') {
      throw new UnauthorizedException('Organization is not active');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      if (this.iam) {
        await this.iam.onLoginFailure(dto.email, user.organizationId, user.id, {
          ipAddress: ip,
          userAgent,
          reason: 'invalid_password',
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.iam) {
      const gate = await this.iam.beforeLogin(
        {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          mfaEnabled: user.mfaEnabled,
          mustChangePassword: user.mustChangePassword,
          failedLoginAttempts: user.failedLoginAttempts,
          lockedAt: user.lockedAt,
          passwordChangedAt: user.passwordChangedAt,
        },
        { ipAddress: ip, userAgent, deviceId, password: dto.password },
      );
      if (!gate.proceed) {
        throw new UnauthorizedException(gate.reason ?? 'access_denied');
      }
      if (gate.mfaRequired && user.mfaEnabled) {
        const mfaToken = this.jwt.sign(
          { sub: user.id, orgId: user.organizationId, purpose: 'mfa_pending' },
          { expiresIn: '5m' },
        );
        return {
          mfaRequired: true,
          mustChangePassword: user.mustChangePassword,
          mfaToken,
        };
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.map((ur) => ur.role.slug);
    const correlationId = uuidv4();

    await this.core.emitAuthLoggedIn(
      user.organizationId,
      user.id,
      { email: user.email, roles },
      {
        ctx: {
          correlationId,
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: ip,
          userAgent,
        },
      },
    );

    if (this.iam) {
      await this.iam.onLoginSuccess(user.id, user.organizationId, { ipAddress: ip, userAgent, deviceId });
    }

    const response = await this.buildAuthResponse(user, roles, {
      ipAddress: ip,
      userAgent,
      deviceId,
    });

    return {
      ...response,
      mfaRequired: user.mfaEnabled,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async completeMfaLogin(
    mfaToken: string,
    code: string,
    ip?: string,
    userAgent?: string,
    deviceId?: string,
  ) {
    let payload: { sub: string; orgId: string; purpose?: string };
    try {
      payload = this.jwt.verify(mfaToken);
    } catch {
      throw new UnauthorizedException('Invalid MFA session');
    }
    if (payload.purpose !== 'mfa_pending') {
      throw new UnauthorizedException('Invalid MFA session');
    }
    if (!this.iamMfa) {
      throw new UnauthorizedException('MFA not available');
    }

    await this.iamMfa.verifyTotp(payload.orgId, payload.sub, code);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        userRoles: { include: { role: true } },
        organization: true,
      },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.slug);
    if (this.iam) {
      await this.iam.onLoginSuccess(user.id, user.organizationId, { ipAddress: ip, userAgent, deviceId });
    }

    const response = await this.buildAuthResponse(user, roles, {
      ipAddress: ip,
      userAgent,
      deviceId,
    });

    return {
      ...response,
      mfaRequired: false,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });

      const session = await this.sessions.findActiveByRefreshToken(refreshToken);
      if (!session || session.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        include: {
          userRoles: { include: { role: true } },
          organization: true,
        },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (user.organization.status !== 'active') {
        throw new UnauthorizedException('Organization is not active');
      }

      const roles = user.userRoles.map((ur) => ur.role.slug);
      const response = await this.buildAuthResponse(user, roles);
      await this.sessions.revoke(
        session.organizationId,
        session.id,
        'token_rotation',
        session.userId,
      );
      return response;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
      })),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private async buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      organizationId: string;
      userType?: string;
    },
    roles: string[],
    options?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      refreshToken?: string;
    },
  ) {
    const access = await this.accessControl.resolveUserAccess(
      user.id,
      user.organizationId,
    );

    const jti = uuidv4();
    const sessionId = uuidv4();
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshMs = this.parseExpiry(refreshExpires);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      roles: access.roles.length ? access.roles : roles,
      // No embeber cientos de permisos en el JWT: rompe nginx (header >8k) y
      // JwtStrategy ya resuelve permisos en cada request vía AccessControlService.
      permissions: [],
      sessionId,
      userType: user.userType,
      jti,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken =
      options?.refreshToken ??
      this.jwt.sign(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires,
      });

    await this.sessions.create({
      userId: user.id,
      organizationId: user.organizationId,
      refreshToken,
      jti,
      sessionId,
      expiresAt: new Date(Date.now() + refreshMs),
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      deviceId: options?.deviceId,
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles: payload.roles,
        permissions: access.permissions,
        scopes: access.scopes,
      },
    };
  }

  private parseExpiry(exp: string): number {
    const match = /^(\d+)([smhd])$/.exec(exp);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(match[1]);
    const unit = match[2];
    const mult =
      unit === 's' ? 1000 :
      unit === 'm' ? 60_000 :
      unit === 'h' ? 3_600_000 :
      86_400_000;
    return n * mult;
  }
}
