import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthorizationService } from '@agroerp/shared';
import { AuthService } from './application/auth.service';
import { UsersService } from './application/users.service';
import { PolicyEngineService } from './application/policy-engine.service';
import { AccessControlService } from './application/access-control.service';
import { SessionsService } from './application/sessions.service';
import { PoliciesService } from './application/policies.service';
import { RolesService } from './application/roles.service';
import { GroupsService } from './application/groups.service';
import { OrgUnitsService } from './application/org-units.service';
import { DelegationsService } from './application/delegations.service';
import { ServiceAccountsService } from './application/service-accounts.service';
import { PermissionsService } from './application/permissions.service';
import { TeamsService } from './application/teams.service';
import { SubstitutionsService } from './application/substitutions.service';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import {
  PoliciesController,
  RolesController,
  GroupsController,
  OrgUnitsController,
  SessionsController,
  PermissionsController,
  DelegationsController,
  ServiceAccountsController,
  UserScopesController,
  TeamsController,
  SubstitutionsController,
  OrganizationProductController,
} from './presentation/identity.controller';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { OrganizationProductService } from './application/organization-product.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    CoreEngineModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    PoliciesController,
    RolesController,
    GroupsController,
    OrgUnitsController,
    SessionsController,
    PermissionsController,
    DelegationsController,
    ServiceAccountsController,
    UserScopesController,
    TeamsController,
    SubstitutionsController,
    OrganizationProductController,
  ],
  providers: [
    AuthService,
    UsersService,
    PolicyEngineService,
    AccessControlService,
    { provide: AuthorizationService, useExisting: AccessControlService },
    SessionsService,
    PoliciesService,
    RolesService,
    GroupsService,
    OrgUnitsService,
    DelegationsService,
    ServiceAccountsService,
    PermissionsService,
    TeamsService,
    SubstitutionsService,
    OrganizationProductService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    UsersService,
    AccessControlService,
    AuthorizationService,
    PolicyEngineService,
    SessionsService,
    RolesService,
    PoliciesService,
    PermissionsService,
    OrganizationProductService,
    JwtModule,
  ],
})
export class IdentityModule {}
