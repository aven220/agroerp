import { Injectable } from '@nestjs/common';
import { AccessContext } from '@agroerp/shared';
import { IamAbacService } from './iam-abac.service';
import { IamRowPolicyService } from './iam-row-policy.service';
import { IamFieldPolicyService } from './iam-field-policy.service';
import { IamAuditService } from './iam-audit.service';

@Injectable()
export class IamAuthorizationGatewayService {
  constructor(
    private readonly abac: IamAbacService,
    private readonly rowPolicy: IamRowPolicyService,
    private readonly fieldPolicy: IamFieldPolicyService,
    private readonly audit: IamAuditService,
  ) {}

  async authorize(context: AccessContext, required: string[], attributes?: Record<string, unknown>) {
    for (const perm of required) {
      const [resource, action] = perm.split(':');
      const abacResult = await this.abac.evaluate(context, resource, action, attributes);
      if (!abacResult.allowed) {
        await this.audit.record(context.organizationId, 'access_denied', {
          userId: context.userId,
          details: { permission: perm, policyId: abacResult.policyId },
          ipAddress: context.ipAddress,
        });
        return false;
      }
    }
    return true;
  }

  async filterResourceRows<T extends Record<string, unknown>>(
    organizationId: string,
    resourceType: string,
    rows: T[],
    userRoles: string[],
    userScopes: Record<string, string>,
  ) {
    const policies = await this.rowPolicy.findAll(organizationId, resourceType);
    return this.rowPolicy.filterRows(rows, policies, userRoles, userScopes);
  }

  async secureFields<T extends Record<string, unknown>>(
    organizationId: string,
    resourceType: string,
    record: T,
    userRoles: string[],
    userPermissions: string[],
  ) {
    const policies = await this.fieldPolicy.findAll(organizationId, resourceType);
    return this.fieldPolicy.applyFieldSecurity(record, policies, userRoles, userPermissions);
  }
}
