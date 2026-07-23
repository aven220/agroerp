import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoliciesService } from '../application/policies.service';
import { RolesService } from '../application/roles.service';
import { GroupsService } from '../application/groups.service';
import { OrgUnitsService } from '../application/org-units.service';
import { SessionsService } from '../application/sessions.service';
import { DelegationsService } from '../application/delegations.service';
import { ServiceAccountsService } from '../application/service-accounts.service';
import { PermissionsService } from '../application/permissions.service';
import { AccessControlService } from '../application/access-control.service';
import { TeamsService } from '../application/teams.service';
import { SubstitutionsService } from '../application/substitutions.service';
import {
  AssignRoleDto,
  AssignUserScopeDto,
  CreateDelegationDto,
  CreateGroupDto,
  CreateOrgUnitDto,
  CreatePolicyDto,
  CreateRoleDto,
  CreateServiceAccountDto,
  CreateSubstitutionDto,
  CreateTeamDto,
  RevokeSessionDto,
  UpdateGroupDto,
  UpdateOrgProductLicenseDto,
  UpdateOrgUnitDto,
  UpdatePolicyDto,
  UpdateRoleDto,
  UpdateTeamDto,
} from './identity.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { OrganizationProductService } from '../application/organization-product.service';

@ApiTags('Identity — Policies (PBAC)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get()
  @RequirePermissions('policy:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.policies.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('policy:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.policies.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('policy:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreatePolicyDto,
  ) {
    return this.policies.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('policy:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.policies.update(user.organizationId, id, dto, user.id);
  }
}

@ApiTags('Identity — Roles (RBAC)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.roles.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('role:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.roles.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('role:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateRoleDto,
  ) {
    return this.roles.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(user.organizationId, id, dto, user.id);
  }

  @Post(':id/assign')
  @RequirePermissions('role:update')
  assign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') roleId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roles.assignToUser(
      user.organizationId,
      roleId,
      dto.userId,
      user.id,
    );
  }

  @Delete(':id/users/:userId')
  @RequirePermissions('role:update')
  revoke(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') roleId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.roles.revokeFromUser(
      user.organizationId,
      roleId,
      targetUserId,
      user.id,
    );
  }
}

@ApiTags('Identity — Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @RequirePermissions('group:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.groups.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('group:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.groups.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('group:create')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateGroupDto,
  ) {
    return this.groups.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('group:update')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(user.organizationId, id, dto);
  }

  @Post(':id/members/:userId')
  @RequirePermissions('group:update')
  addMember(
    @CurrentUser() user: { organizationId: string },
    @Param('id') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groups.addMember(user.organizationId, groupId, userId);
  }
}

@ApiTags('Identity — Org Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/org-units')
export class OrgUnitsController {
  constructor(private readonly orgUnits: OrgUnitsService) {}

  @Get()
  @RequirePermissions('org_unit:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.orgUnits.findAll(user.organizationId);
  }

  @Get('tree')
  @RequirePermissions('org_unit:read')
  tree(@CurrentUser() user: { organizationId: string }) {
    return this.orgUnits.findTree(user.organizationId);
  }

  @Post()
  @RequirePermissions('org_unit:create')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateOrgUnitDto,
  ) {
    return this.orgUnits.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('org_unit:update')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOrgUnitDto,
  ) {
    return this.orgUnits.update(user.organizationId, id, dto);
  }
}

@ApiTags('Identity — Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @RequirePermissions('session:read')
  findAll(
    @CurrentUser() user: { organizationId: string; id: string },
  ) {
    return this.sessions.findAll(user.organizationId);
  }

  @Get('me')
  @RequirePermissions('session:read')
  mySessions(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.sessions.findActiveByUser(user.organizationId, user.id);
  }

  @Post(':id/revoke')
  @RequirePermissions('session:admin')
  revoke(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') sessionId: string,
    @Body() dto: RevokeSessionDto,
  ) {
    return this.sessions.revoke(
      user.organizationId,
      sessionId,
      dto.reason ?? 'admin_revoke',
      user.id,
    );
  }

  @Post('users/:userId/revoke-all')
  @RequirePermissions('session:admin')
  revokeAll(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('userId') targetUserId: string,
    @Body() dto: RevokeSessionDto,
  ) {
    return this.sessions.revokeAllForUser(
      user.organizationId,
      targetUserId,
      dto.reason ?? 'admin_revoke_all',
      user.id,
    );
  }
}

@ApiTags('Identity — Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/permissions')
export class PermissionsController {
  constructor(
    private readonly permissions: PermissionsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @RequirePermissions('role:read')
  findAll() {
    return this.permissions.findAll();
  }

  @Get('me/effective')
  @RequirePermissions('user:read')
  async myEffective(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.accessControl.resolveUserAccess(user.id, user.organizationId);
  }
}

@ApiTags('Identity — Delegations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/delegations')
export class DelegationsController {
  constructor(private readonly delegations: DelegationsService) {}

  @Get()
  @RequirePermissions('user:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.delegations.findAll(user.organizationId);
  }

  @Post()
  @RequirePermissions('user:update')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateDelegationDto,
  ) {
    return this.delegations.create(user.organizationId, dto, user.id);
  }

  @Post(':id/revoke')
  @RequirePermissions('user:update')
  revoke(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.delegations.revoke(user.organizationId, id, user.id);
  }
}

@ApiTags('Identity — Service Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/service-accounts')
export class ServiceAccountsController {
  constructor(private readonly serviceAccounts: ServiceAccountsService) {}

  @Get()
  @RequirePermissions('service_account:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.serviceAccounts.findAll(user.organizationId);
  }

  @Post()
  @RequirePermissions('service_account:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateServiceAccountDto,
  ) {
    return this.serviceAccounts.create(user.organizationId, dto, user.id);
  }

  @Post(':id/api-keys')
  @RequirePermissions('service_account:create')
  createKey(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') serviceAccountId: string,
    @Body('name') name: string,
  ) {
    return this.serviceAccounts.createApiKey(
      user.organizationId,
      serviceAccountId,
      name,
      user.id,
    );
  }
}

@ApiTags('Identity — User Scopes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/users/:userId/scopes')
export class UserScopesController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertUserInOrg(organizationId: string, userId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('User not found');
  }

  @Get()
  @RequirePermissions('user:read')
  async list(
    @CurrentUser() user: { organizationId: string },
    @Param('userId') userId: string,
  ) {
    await this.assertUserInOrg(user.organizationId, userId);
    return this.prisma.userScope.findMany({ where: { userId } });
  }

  @Post()
  @RequirePermissions('user:update')
  async assign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('userId') userId: string,
    @Body() dto: AssignUserScopeDto,
  ) {
    await this.assertUserInOrg(user.organizationId, userId);
    return this.prisma.userScope.create({
      data: {
        userId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        orgUnitId: dto.orgUnitId,
        grantedBy: user.id,
      },
    });
  }

  @Delete(':scopeId')
  @RequirePermissions('user:update')
  async remove(
    @CurrentUser() user: { organizationId: string },
    @Param('userId') userId: string,
    @Param('scopeId') scopeId: string,
  ) {
    await this.assertUserInOrg(user.organizationId, userId);
    return this.prisma.userScope.deleteMany({ where: { id: scopeId, userId } });
  }
}

@ApiTags('Identity — Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @RequirePermissions('team:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.teams.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('team:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.teams.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('team:create')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateTeamDto,
  ) {
    return this.teams.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('team:update')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(user.organizationId, id, dto);
  }

  @Post(':id/members/:userId')
  @RequirePermissions('team:update')
  addMember(
    @CurrentUser() user: { organizationId: string },
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Body('role') role?: string,
  ) {
    return this.teams.addMember(user.organizationId, teamId, userId, role);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('team:update')
  removeMember(
    @CurrentUser() user: { organizationId: string },
    @Param('id') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teams.removeMember(user.organizationId, teamId, userId);
  }
}

@ApiTags('Identity — Substitutions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/substitutions')
export class SubstitutionsController {
  constructor(private readonly substitutions: SubstitutionsService) {}

  @Get()
  @RequirePermissions('user:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.substitutions.findAll(user.organizationId);
  }

  @Post()
  @RequirePermissions('user:update')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateSubstitutionDto,
  ) {
    return this.substitutions.create(user.organizationId, dto, user.id);
  }

  @Post(':id/revoke')
  @RequirePermissions('user:update')
  revoke(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.substitutions.revoke(user.organizationId, id, user.id);
  }
}

@ApiTags('Identity — Organization product')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identity/organization/product-license')
export class OrganizationProductController {
  constructor(private readonly orgProduct: OrganizationProductService) {}

  @Get()
  @RequirePermissions('organization:read')
  @ApiOperation({ summary: 'Paquete / módulos contratados de la organización' })
  get(@CurrentUser() user: { organizationId: string }) {
    return this.orgProduct.getLicense(user.organizationId);
  }

  @Patch()
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Actualizar paquete / módulos de la organización' })
  update(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: UpdateOrgProductLicenseDto,
  ) {
    return this.orgProduct.updateLicense(user.organizationId, {
      packageId: dto.packageId,
      enabledModules: dto.enabledModules ?? [],
    });
  }
}
