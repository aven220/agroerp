import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmCatalogService } from './escm-catalog.service';
import { EscmParameterService } from './escm-parameter.service';
import { EscmPipelineService } from './escm-pipeline.service';
import { EscmOrderApprovalService } from './escm-order-approval.service';
import { EscmTaxService } from './escm-tax.service';

@Injectable()
export class EscmConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogs: EscmCatalogService,
    private readonly parameters: EscmParameterService,
    private readonly pipeline: EscmPipelineService,
    private readonly orderApprovals: EscmOrderApprovalService,
    private readonly tax: EscmTaxService,
    private readonly audit: EscmAuditService,
  ) {}

  async center(organizationId: string) {
    const [
      catalogs,
      parameters,
      customersCount,
      activeCustomers,
      prospects,
      priceLists,
      conditions,
      promotions,
      recentAudit,
      crmProspects,
      openOpportunities,
      quotations,
      salesOrders,
      pendingOrderApprovals,
      ordersByStatus,
    ] = await Promise.all([
      this.catalogs.list(organizationId),
      this.parameters.list(organizationId),
      this.prisma.escmCustomer.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.escmCustomer.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      this.prisma.escmCustomer.count({ where: { organizationId, deletedAt: null, status: 'prospect' } }),
      this.prisma.escmPriceList.count({ where: { organizationId, isActive: true } }),
      this.prisma.escmCommercialCondition.count({ where: { organizationId, isActive: true } }),
      this.prisma.escmPromotion.count({ where: { organizationId, isActive: true } }),
      this.audit.findAll(organizationId, 30),
      this.prisma.escmProspect.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.escmOpportunity.count({ where: { organizationId, deletedAt: null, status: 'open' } }),
      this.prisma.escmQuotation.count({ where: { organizationId, isCurrent: true } }),
      this.prisma.escmSalesOrder.count({ where: { organizationId } }),
      this.prisma.escmOrderApproval.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.escmSalesOrder.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);
    return {
      catalogKeys: this.catalogs.catalogKeys(),
      catalogsCount: catalogs.length,
      parametersCount: parameters.length,
      customersCount,
      activeCustomers,
      prospects,
      priceListsCount: priceLists,
      conditionsCount: conditions,
      promotionsCount: promotions,
      crmProspects,
      openOpportunities,
      quotationsCount: quotations,
      salesOrdersCount: salesOrders,
      pendingOrderApprovals,
      ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count._all])),
      recentAudit,
    };
  }

  async seed(organizationId: string, userId: string) {
    const catalogs = await this.catalogs.seedDefaults(organizationId, userId);
    const parameters = await this.parameters.seedDefaults(organizationId, userId);
    const pipeline = await this.pipeline.seedDefaults(organizationId, userId);
    const approvalPolicies = await this.orderApprovals.seedPolicies(organizationId, userId);
    const taxRules = await this.tax.seedDefaults(organizationId, userId);
    await this.audit.log(organizationId, 'Config', 'seed', 'seeded', userId, {
      catalogs: catalogs.count,
      parameters: parameters.count,
      pipeline: pipeline.count,
      approvalPolicies: approvalPolicies.length,
      taxRules: taxRules.created.length,
    });
    return { catalogs, parameters, pipeline, approvalPolicies, taxRules, seeded: true };
  }
}
