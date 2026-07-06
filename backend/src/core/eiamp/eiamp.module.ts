import { Global, Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '@/core/identity/identity.module';
import { EventsModule } from '@/core/events/events.module';
import { EiampController, EiampOAuthController } from './presentation/eiamp.controller';
import { IamAuthEnforcementService, IAM_AUTH_PORT } from './application/iam-auth-enforcement.service';
import { IamSecurityPolicyService } from './application/iam-security-policy.service';
import { IamAuditService } from './application/iam-audit.service';
import { IamAnomalyService } from './application/iam-anomaly.service';
import { IamMfaService } from './application/iam-mfa.service';
import { IamSessionAdminService } from './application/iam-session-admin.service';
import { IamRoleManagementService } from './application/iam-role-management.service';
import { IamUserAdminService } from './application/iam-user-admin.service';
import { IamRowPolicyService } from './application/iam-row-policy.service';
import { IamFieldPolicyService } from './application/iam-field-policy.service';
import { IamOAuthService } from './application/iam-oauth.service';
import { IamAbacService } from './application/iam-abac.service';
import { IamAuthorizationGatewayService } from './application/iam-authorization-gateway.service';

@Global()
@Module({
  imports: [forwardRef(() => IdentityModule), EventsModule],
  controllers: [EiampController, EiampOAuthController],
  providers: [
    IamAuthEnforcementService,
    { provide: IAM_AUTH_PORT, useExisting: IamAuthEnforcementService },
    IamSecurityPolicyService,
    IamAuditService,
    IamAnomalyService,
    IamMfaService,
    IamSessionAdminService,
    IamRoleManagementService,
    IamUserAdminService,
    IamRowPolicyService,
    IamFieldPolicyService,
    IamOAuthService,
    IamAbacService,
    IamAuthorizationGatewayService,
  ],
  exports: [IAM_AUTH_PORT, IamAuthorizationGatewayService, IamAuditService, IamAuthEnforcementService, IamMfaService],
})
export class EiampModule {}
