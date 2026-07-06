import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmDimensionService } from './efm-dimension.service';
import { DEFAULT_BG_DIMENSIONS } from '../domain/efm-budget.engine';

@Injectable()
export class EfmBgDimensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly dimensions: EfmDimensionService,
  ) {}

  async hierarchy(organizationId: string) {
    const [costCenters, profitCenters, projects, nodes, companies, branches] = await Promise.all([
      this.dimensions.listCostCenters(organizationId),
      this.dimensions.listProfitCenters(organizationId),
      this.dimensions.listProjects(organizationId),
      this.prisma.efmBgDimensionNode.findMany({ where: { organizationId, isActive: true }, orderBy: { code: 'asc' } }),
      this.dimensions.listCompanies(organizationId),
      this.dimensions.listBranches(organizationId),
    ]);
    return { costCenters, profitCenters, projects, dimensionNodes: nodes, companies, branches };
  }

  listNodes(organizationId: string, dimensionType?: string) {
    return this.prisma.efmBgDimensionNode.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(dimensionType ? { dimensionType: dimensionType as never } : {}),
      },
      orderBy: [{ dimensionType: 'asc' }, { code: 'asc' }],
    });
  }

  async upsertNode(organizationId: string, userId: string, input: {
    nodeKey?: string;
    dimensionType: string;
    code: string;
    name: string;
    companyKey?: string;
    parentKey?: string;
    costCenterKey?: string;
    projectKey?: string;
    profitCenterKey?: string;
  }) {
    const nodeKey = input.nodeKey ?? `${input.dimensionType.toUpperCase().slice(0, 2)}-${input.code.toUpperCase()}`;
    const row = await this.prisma.efmBgDimensionNode.upsert({
      where: { organizationId_nodeKey: { organizationId, nodeKey } },
      create: {
        organizationId,
        nodeKey,
        dimensionType: input.dimensionType as never,
        code: input.code,
        name: input.name,
        companyKey: input.companyKey,
        parentKey: input.parentKey,
        costCenterKey: input.costCenterKey,
        projectKey: input.projectKey,
        profitCenterKey: input.profitCenterKey,
      },
      update: {
        name: input.name,
        companyKey: input.companyKey,
        parentKey: input.parentKey,
        costCenterKey: input.costCenterKey,
        projectKey: input.projectKey,
        profitCenterKey: input.profitCenterKey,
      },
    });
    await this.audit.log(organizationId, 'EfmBgDimensionNode', nodeKey, 'upserted', userId);
    return row;
  }

  async seed(organizationId: string, userId: string) {
    await this.dimensions.seed(organizationId, userId);
    await this.dimensions.upsertCostCenter(organizationId, userId, {
      costCenterKey: 'CC-OPS',
      code: '200',
      name: 'Operaciones',
      companyKey: 'CO-MAIN',
      parentKey: 'CC-ADMIN',
    });
    await this.dimensions.upsertProfitCenter(organizationId, userId, {
      profitCenterKey: 'PC-MAIN',
      code: 'PC01',
      name: 'Centro beneficio principal',
      companyKey: 'CO-MAIN',
    });
    await this.dimensions.upsertProject(organizationId, userId, {
      projectKey: 'PRJ-MAIN',
      code: 'P001',
      name: 'Proyecto principal',
      companyKey: 'CO-MAIN',
      costCenterKey: 'CC-OPS',
    });

    for (const node of DEFAULT_BG_DIMENSIONS) {
      await this.prisma.efmBgDimensionNode.upsert({
        where: { organizationId_nodeKey: { organizationId, nodeKey: node.nodeKey } },
        create: {
          organizationId,
          nodeKey: node.nodeKey,
          dimensionType: node.dimensionType as never,
          code: node.code,
          name: node.name,
          parentKey: 'parentKey' in node ? node.parentKey : undefined,
          companyKey: 'CO-MAIN',
        },
        update: {},
      });
    }

    await this.audit.log(organizationId, 'EfmBgDimensionNode', 'seed', 'completed', userId);
    return this.hierarchy(organizationId);
  }
}
