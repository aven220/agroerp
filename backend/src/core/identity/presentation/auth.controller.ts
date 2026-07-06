import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { SessionsService } from '../application/sessions.service';
import { LoginDto, RefreshTokenDto, RegisterDto, MfaCompleteDto } from '../application/dto/auth.dto';
import { Public } from '@/shared/presentation/decorators/public.decorator';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionsService,
    private readonly core: CoreEngineService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new organization and admin user' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto, @Req() req: AgroRequest) {
    return this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
      req.agroContext?.deviceId,
    );
  }

  @Public()
  @Post('login/mfa')
  @ApiOperation({ summary: 'Complete login with MFA TOTP code' })
  completeMfa(@Body() dto: MfaCompleteDto, @Req() req: AgroRequest) {
    return this.authService.completeMfaLogin(
      dto.mfaToken,
      dto.code,
      req.ip,
      req.headers['user-agent'],
      req.agroContext?.deviceId,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(
    @CurrentUser() user: { id: string; organizationId: string; sessionId?: string },
    @Body('refreshToken') refreshToken: string | undefined,
    @Req() req: AgroRequest,
  ) {
    if (refreshToken) {
      await this.sessions.revokeByRefreshToken(refreshToken, 'user_logout');
    } else if (user.sessionId) {
      await this.sessions.revoke(
        user.organizationId,
        user.sessionId,
        'user_logout',
        user.id,
      );
    }

    await this.core.emitUserAction(
      user.organizationId,
      'User',
      user.id,
      EVENT_TYPES.AUTH_LOGGED_OUT,
      {},
      { ctx: req.agroContext },
    );

    return { success: true };
  }
}
