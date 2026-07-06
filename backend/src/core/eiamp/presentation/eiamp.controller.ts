import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { Public } from '@/shared/presentation/decorators/public.decorator';
import { IamSecurityPolicyService } from '../application/iam-security-policy.service';
import { IamAuditService } from '../application/iam-audit.service';
import { IamAnomalyService } from '../application/iam-anomaly.service';
import { IamMfaService } from '../application/iam-mfa.service';
import { IamSessionAdminService } from '../application/iam-session-admin.service';
import { IamRoleManagementService } from '../application/iam-role-management.service';
import { IamUserAdminService } from '../application/iam-user-admin.service';
import { IamRowPolicyService } from '../application/iam-row-policy.service';
import { IamFieldPolicyService } from '../application/iam-field-policy.service';
import { IamOAuthService } from '../application/iam-oauth.service';
import { AccessControlService } from '@/core/identity/application/access-control.service';
import { RolesService } from '@/core/identity/application/roles.service';
import { UsersService } from '@/core/identity/application/users.service';
import { PoliciesService } from '@/core/identity/application/policies.service';
import { PermissionsService } from '@/core/identity/application/permissions.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ChangePasswordDto,
  CloneRoleDto,
  CreateFieldPolicyDto,
  CreateRowPolicyDto,
  ImportRoleDto,
  MfaVerifyDto,
  OAuthTokenDto,
  RegisterOAuthClientDto,
  RegisterSsoProviderDto,
  ResetPasswordDto,
  TemporaryRoleDto,
  UpdateSecurityPolicyDto,
} from './eiamp.dto';

@ApiTags('EIAMP — Identity & Access Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eiamp')
export class EiampController {
  constructor(
    private readonly policies: IamSecurityPolicyService,
    private readonly audit: IamAuditService,
    private readonly anomaly: IamAnomalyService,
    private readonly mfa: IamMfaService,
    private readonly sessions: IamSessionAdminService,
    private readonly roles: IamRoleManagementService,
    private readonly users: IamUserAdminService,
    private readonly rowPolicy: IamRowPolicyService,
    private readonly fieldPolicy: IamFieldPolicyService,
    private readonly oauth: IamOAuthService,
    private readonly permissions: PermissionsService,
    private readonly accessControl: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
    private readonly pbac: PoliciesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('center')
  @RequirePermissions('iam:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, policy, alerts, sessions] = await Promise.all([
      this.audit.dashboard(user.organizationId),
      this.policies.getOrCreate(user.organizationId),
      this.anomaly.listAlerts(user.organizationId, true),
      this.sessions.listSessions(user.organizationId),
    ]);
    const userCount = await this.prisma.user.count({ where: { organizationId: user.organizationId, deletedAt: null } });
    const roleCount = await this.prisma.role.count({ where: { organizationId: user.organizationId } });
    return { dashboard, policy, alerts, activeSessions: sessions.filter((s) => s.status === 'active').length, userCount, roleCount };
  }

  @Get('security-policy')
  @RequirePermissions('iam:policy:manage')
  getPolicy(@CurrentUser() user: { organizationId: string }) {
    return this.policies.getOrCreate(user.organizationId);
  }

  @Patch('security-policy')
  @RequirePermissions('iam:policy:manage')
  updatePolicy(@CurrentUser() user: { organizationId: string }, @Body() dto: UpdateSecurityPolicyDto) {
    return this.policies.update(user.organizationId, dto as Prisma.IamSecurityPolicyUpdateInput);
  }

  @Get('audit')
  @RequirePermissions('iam:audit:read')
  auditLog(
    @CurrentUser() user: { organizationId: string },
    @Query('eventType') eventType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.audit.findAll(user.organizationId, { eventType, userId });
  }

  @Get('anomalies')
  @RequirePermissions('iam:read')
  anomalies(@CurrentUser() user: { organizationId: string }) {
    return this.anomaly.listAlerts(user.organizationId);
  }

  @Post('anomalies/:id/resolve')
  @RequirePermissions('iam:admin')
  resolveAnomaly(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.anomaly.resolve(user.organizationId, id);
  }

  @Post('mfa/totp/setup')
  @RequirePermissions('iam:mfa:manage')
  setupMfa(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.mfa.setupTotp(user.organizationId, user.id);
  }

  @Post('mfa/totp/verify')
  @RequirePermissions('iam:mfa:manage')
  verifyMfa(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: MfaVerifyDto) {
    return this.mfa.verifyTotp(user.organizationId, user.id, dto.code, dto.factorId);
  }

  @Get('mfa/factors')
  @RequirePermissions('iam:read')
  listMfa(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.mfa.listFactors(user.organizationId, user.id);
  }

  @Get('sessions')
  @RequirePermissions('iam:session:manage')
  listSessions(@CurrentUser() user: { organizationId: string }, @Query('userId') userId?: string) {
    return this.sessions.listSessions(user.organizationId, userId);
  }

  @Delete('sessions/:id')
  @RequirePermissions('iam:session:manage')
  revokeSession(@CurrentUser() user: { id: string; organizationId: string }, @Param('id') id: string) {
    return this.sessions.revokeSession(user.organizationId, id, user.id);
  }

  @Get('devices')
  @RequirePermissions('iam:session:manage')
  devices(@CurrentUser() user: { organizationId: string }, @Query('userId') userId?: string) {
    return this.sessions.listDevices(user.organizationId, userId);
  }

  @Get('users')
  @RequirePermissions('iam:user:manage')
  listUsers(@CurrentUser() user: { organizationId: string }) {
    return this.usersService.findAll(user.organizationId);
  }

  @Post('users/:id/reset-password')
  @RequirePermissions('iam:user:manage')
  resetPassword(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') userId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.users.resetPassword(user.organizationId, userId, dto.newPassword, user.id);
  }

  @Post('users/:id/lock')
  @RequirePermissions('iam:user:manage')
  lockUser(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.users.lockUser(user.organizationId, userId, reason ?? 'admin_lock', user.id);
  }

  @Post('users/:id/unlock')
  @RequirePermissions('iam:user:manage')
  unlockUser(@CurrentUser() user: { id: string; organizationId: string }, @Param('id') userId: string) {
    return this.users.unlockUser(user.organizationId, userId, user.id);
  }

  @Post('change-password')
  @RequirePermissions('iam:read')
  changePassword(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.organizationId, user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('roles')
  @RequirePermissions('iam:role:manage')
  listRoles(@CurrentUser() user: { organizationId: string }) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Post('roles/:id/clone')
  @RequirePermissions('iam:role:manage')
  cloneRole(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') roleId: string,
    @Body() dto: CloneRoleDto,
  ) {
    return this.roles.cloneRole(user.organizationId, roleId, dto.newSlug, dto.newName, user.id);
  }

  @Post('roles/:id/version')
  @RequirePermissions('iam:role:manage')
  versionRole(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') roleId: string,
    @Body('changelog') changelog?: string,
  ) {
    return this.roles.versionRole(user.organizationId, roleId, user.id, changelog);
  }

  @Get('roles/:id/versions')
  @RequirePermissions('iam:role:manage')
  roleVersions(@CurrentUser() user: { organizationId: string }, @Param('id') roleId: string) {
    return this.roles.listVersions(user.organizationId, roleId);
  }

  @Get('roles/:id/export')
  @RequirePermissions('iam:role:manage')
  exportRole(@CurrentUser() user: { organizationId: string }, @Param('id') roleId: string) {
    return this.roles.exportRole(user.organizationId, roleId);
  }

  @Post('roles/import')
  @RequirePermissions('iam:role:manage')
  importRole(@CurrentUser() user: { organizationId: string }, @Body() dto: ImportRoleDto) {
    return this.roles.importRole(user.organizationId, dto);
  }

  @Post('roles/temporary')
  @RequirePermissions('iam:role:manage')
  temporaryRole(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: TemporaryRoleDto) {
    return this.roles.grantTemporaryRole(
      user.organizationId,
      dto.userId,
      dto.roleId,
      user.id,
      new Date(dto.startsAt),
      new Date(dto.endsAt),
      dto.reason,
    );
  }

  @Get('permissions')
  @RequirePermissions('iam:read')
  listPermissions() {
    return this.permissions.findAll();
  }

  @Get('permissions/effective')
  @RequirePermissions('iam:read')
  effectivePermissions(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.accessControl.resolveUserAccess(user.id, user.organizationId);
  }

  @Get('pbac/policies')
  @RequirePermissions('iam:policy:manage')
  listPbac(@CurrentUser() user: { organizationId: string }) {
    return this.pbac.findAll(user.organizationId);
  }

  @Get('row-policies')
  @RequirePermissions('iam:policy:manage')
  rowPolicies(@CurrentUser() user: { organizationId: string }, @Query('resourceType') resourceType?: string) {
    return this.rowPolicy.findAll(user.organizationId, resourceType);
  }

  @Post('row-policies')
  @RequirePermissions('iam:policy:manage')
  createRowPolicy(@CurrentUser() user: { organizationId: string }, @Body() dto: CreateRowPolicyDto) {
    return this.rowPolicy.create(user.organizationId, dto);
  }

  @Get('field-policies')
  @RequirePermissions('iam:policy:manage')
  fieldPolicies(@CurrentUser() user: { organizationId: string }, @Query('resourceType') resourceType?: string) {
    return this.fieldPolicy.findAll(user.organizationId, resourceType);
  }

  @Post('field-policies')
  @RequirePermissions('iam:policy:manage')
  createFieldPolicy(@CurrentUser() user: { organizationId: string }, @Body() dto: CreateFieldPolicyDto) {
    return this.fieldPolicy.create(user.organizationId, dto);
  }

  @Post('oauth/clients')
  @RequirePermissions('iam:sso:manage')
  registerOAuth(@CurrentUser() user: { organizationId: string }, @Body() dto: RegisterOAuthClientDto) {
    return this.oauth.registerClient(user.organizationId, dto);
  }

  @Get('oauth/clients')
  @RequirePermissions('iam:sso:manage')
  listOAuth(@CurrentUser() user: { organizationId: string }) {
    return this.oauth.listClients(user.organizationId);
  }

  @Post('sso/providers')
  @RequirePermissions('iam:sso:manage')
  registerSso(@CurrentUser() user: { organizationId: string }, @Body() dto: RegisterSsoProviderDto) {
    return this.prisma.iamSsoProvider.create({
      data: {
        organizationId: user.organizationId,
        providerKey: dto.providerKey,
        providerType: dto.providerType,
        name: dto.name,
        issuerUrl: dto.issuerUrl,
        clientId: dto.clientId,
      },
    });
  }

  @Get('sso/providers')
  @RequirePermissions('iam:sso:manage')
  listSso(@CurrentUser() user: { organizationId: string }) {
    return this.prisma.iamSsoProvider.findMany({ where: { organizationId: user.organizationId } });
  }
}

@ApiTags('EIAMP — OAuth2')
@Controller('eiamp/oauth')
export class EiampOAuthController {
  constructor(private readonly oauth: IamOAuthService) {}

  @Public()
  @Post('token')
  @ApiOperation({ summary: 'OAuth2 token endpoint' })
  async token(@Body() dto: OAuthTokenDto) {
    const result = await this.oauth.token(dto.client_id, dto.client_secret, dto.grant_type);
    if (!result) return { error: 'invalid_client' };
    return result;
  }
}
