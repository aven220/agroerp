import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  DEFAULT_HCM_HIERARCHY_LEVELS,
  DEFAULT_HCM_POSITIONS,
  buildOrgTree,
  generateHcmKey,
} from '../domain/hcm-workforce.engine';

@Injectable()
export class HcmOrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  async hierarchy(organizationId: string) {
    const [companies, branches, areas, departments, processes, teams, workCenters, positions, levels, orgNodes] =
      await Promise.all([
        this.prisma.hcmCompany.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmBranch.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmArea.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmDepartment.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmProcess.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmWorkTeam.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmWorkCenter.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmPosition.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.hcmHierarchyLevel.findMany({ where: { organizationId, isActive: true }, orderBy: { rank: 'asc' } }),
        this.prisma.hcmOrgChartNode.findMany({ where: { organizationId }, orderBy: { sortOrder: 'asc' } }),
      ]);
    return {
      companies,
      branches,
      areas,
      departments,
      processes,
      teams,
      workCenters,
      positions,
      levels,
      orgChart: buildOrgTree(orgNodes.map((n) => ({
        nodeKey: n.nodeKey,
        nodeType: n.nodeType,
        refKey: n.refKey,
        parentNodeKey: n.parentNodeKey,
        title: n.title,
        sortOrder: n.sortOrder,
      }))),
    };
  }

  listCompanies(organizationId: string) {
    return this.prisma.hcmCompany.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async upsertCompany(organizationId: string, userId: string, input: {
    companyKey?: string; code: string; name: string; legalName?: string; taxId?: string; efmCompanyKey?: string;
  }) {
    const companyKey = input.companyKey ?? generateHcmKey('CO', (await this.prisma.hcmCompany.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hcmCompany.findFirst({ where: { organizationId, companyKey } });
    const row = existing
      ? await this.prisma.hcmCompany.update({
          where: { id: existing.id },
          data: { code: input.code, name: input.name, legalName: input.legalName, taxId: input.taxId, efmCompanyKey: input.efmCompanyKey },
        })
      : await this.prisma.hcmCompany.create({
          data: { organizationId, companyKey, code: input.code, name: input.name, legalName: input.legalName, taxId: input.taxId, efmCompanyKey: input.efmCompanyKey },
        });
    await this.audit.log(organizationId, 'HcmCompany', companyKey, existing ? 'updated' : 'created', userId);
    return row;
  }

  async upsertBranch(organizationId: string, userId: string, input: {
    branchKey?: string; companyKey: string; code: string; name: string; efmBranchKey?: string; address?: string; city?: string;
  }) {
    const branchKey = input.branchKey ?? generateHcmKey('BR', (await this.prisma.hcmBranch.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hcmBranch.findFirst({ where: { organizationId, branchKey } });
    const row = existing
      ? await this.prisma.hcmBranch.update({
          where: { id: existing.id },
          data: { code: input.code, name: input.name, efmBranchKey: input.efmBranchKey, address: input.address, city: input.city },
        })
      : await this.prisma.hcmBranch.create({
          data: { organizationId, branchKey, companyKey: input.companyKey, code: input.code, name: input.name, efmBranchKey: input.efmBranchKey, address: input.address, city: input.city },
        });
    await this.audit.log(organizationId, 'HcmBranch', branchKey, existing ? 'updated' : 'created', userId);
    return row;
  }

  async upsertDepartment(organizationId: string, userId: string, input: {
    departmentKey?: string; areaKey: string; code: string; name: string; parentDeptKey?: string; costCenterKey?: string; managerEmployeeKey?: string;
  }) {
    const departmentKey = input.departmentKey ?? generateHcmKey('DEPT', (await this.prisma.hcmDepartment.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hcmDepartment.findFirst({ where: { organizationId, departmentKey } });
    const row = existing
      ? await this.prisma.hcmDepartment.update({
          where: { id: existing.id },
          data: { code: input.code, name: input.name, parentDeptKey: input.parentDeptKey, costCenterKey: input.costCenterKey, managerEmployeeKey: input.managerEmployeeKey },
        })
      : await this.prisma.hcmDepartment.create({
          data: { organizationId, departmentKey, areaKey: input.areaKey, code: input.code, name: input.name, parentDeptKey: input.parentDeptKey, costCenterKey: input.costCenterKey, managerEmployeeKey: input.managerEmployeeKey },
        });
    await this.audit.log(organizationId, 'HcmDepartment', departmentKey, existing ? 'updated' : 'created', userId);
    return row;
  }

  async upsertArea(organizationId: string, userId: string, input: {
    areaKey?: string; branchKey: string; code: string; name: string; parentAreaKey?: string;
  }) {
    const areaKey = input.areaKey ?? generateHcmKey('AREA', (await this.prisma.hcmArea.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hcmArea.findFirst({ where: { organizationId, areaKey } });
    const row = existing
      ? await this.prisma.hcmArea.update({ where: { id: existing.id }, data: { code: input.code, name: input.name, parentAreaKey: input.parentAreaKey } })
      : await this.prisma.hcmArea.create({ data: { organizationId, areaKey, branchKey: input.branchKey, code: input.code, name: input.name, parentAreaKey: input.parentAreaKey } });
    await this.audit.log(organizationId, 'HcmArea', areaKey, existing ? 'updated' : 'created', userId);
    return row;
  }

  async upsertPosition(organizationId: string, userId: string, input: {
    positionKey?: string; code: string; name: string; departmentKey?: string; hierarchyLevelKey?: string; costCenterKey?: string; description?: string;
  }) {
    const positionKey = input.positionKey ?? generateHcmKey('POS', (await this.prisma.hcmPosition.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.hcmPosition.findFirst({ where: { organizationId, positionKey } });
    const row = existing
      ? await this.prisma.hcmPosition.update({
          where: { id: existing.id },
          data: { code: input.code, name: input.name, departmentKey: input.departmentKey, hierarchyLevelKey: input.hierarchyLevelKey, costCenterKey: input.costCenterKey, description: input.description },
        })
      : await this.prisma.hcmPosition.create({
          data: { organizationId, positionKey, code: input.code, name: input.name, departmentKey: input.departmentKey, hierarchyLevelKey: input.hierarchyLevelKey, costCenterKey: input.costCenterKey, description: input.description },
        });
    await this.audit.log(organizationId, 'HcmPosition', positionKey, existing ? 'updated' : 'created', userId);
    return row;
  }

  async rebuildOrgChart(organizationId: string, userId: string) {
    await this.prisma.hcmOrgChartNode.deleteMany({ where: { organizationId } });
    const [companies, departments, employees] = await Promise.all([
      this.prisma.hcmCompany.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmDepartment.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmEmployee.findMany({ where: { organizationId, employmentStatus: 'active' } }),
    ]);

    let seq = 1;
    const companyNodeKeys = new Map<string, string>();
    for (const c of companies) {
      const nodeKey = generateHcmKey('ORG', seq++);
      companyNodeKeys.set(c.companyKey, nodeKey);
      await this.prisma.hcmOrgChartNode.create({
        data: { organizationId, nodeKey, nodeType: 'company', refKey: c.companyKey, title: c.name, sortOrder: seq },
      });
    }

    const deptNodeKeys = new Map<string, string>();
    for (const d of departments) {
      const nodeKey = generateHcmKey('ORG', seq++);
      deptNodeKeys.set(d.departmentKey, nodeKey);
      await this.prisma.hcmOrgChartNode.create({
        data: {
          organizationId,
          nodeKey,
          nodeType: 'department',
          refKey: d.departmentKey,
          parentNodeKey: d.parentDeptKey ? deptNodeKeys.get(d.parentDeptKey) : undefined,
          title: d.name,
          sortOrder: seq,
        },
      });
    }

    for (const e of employees) {
      const parent = e.departmentKey ? deptNodeKeys.get(e.departmentKey) : e.companyKey ? companyNodeKeys.get(e.companyKey) : undefined;
      await this.prisma.hcmOrgChartNode.create({
        data: {
          organizationId,
          nodeKey: generateHcmKey('ORG', seq++),
          nodeType: 'employee',
          refKey: e.employeeKey,
          parentNodeKey: parent,
          title: e.displayName,
          sortOrder: seq,
        },
      });
    }

    await this.audit.log(organizationId, 'HcmOrgChart', 'rebuild', 'completed', userId);
    return this.hierarchy(organizationId);
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmCompany.count({ where: { organizationId } });
    if (existing > 0) return this.hierarchy(organizationId);

    const efmCompany = await this.prisma.efmCompany.findFirst({ where: { organizationId, isActive: true } });
    const company = await this.upsertCompany(organizationId, userId, {
      companyKey: 'CO-MAIN',
      code: 'MAIN',
      name: 'Empresa principal',
      legalName: efmCompany?.legalName ?? 'AgroERP S.A.S.',
      taxId: efmCompany?.taxId ?? '900000000-1',
      efmCompanyKey: efmCompany?.companyKey ?? 'CO-MAIN',
    });

    const efmBranch = await this.prisma.efmBranch.findFirst({ where: { organizationId, isActive: true } });
    const branch = await this.upsertBranch(organizationId, userId, {
      branchKey: 'BR-HQ',
      companyKey: company.companyKey,
      code: 'HQ',
      name: 'Sede principal',
      efmBranchKey: efmBranch?.branchKey,
      city: 'Bogotá',
    });

    const area = await this.upsertArea(organizationId, userId, {
      areaKey: 'AREA-CORP',
      branchKey: branch.branchKey,
      code: 'CORP',
      name: 'Corporativo',
    });

    const costCenter = await this.prisma.efmCostCenter.findFirst({ where: { organizationId, isActive: true } });
    await this.upsertDepartment(organizationId, userId, {
      departmentKey: 'DEPT-HR',
      areaKey: area.areaKey,
      code: 'HR',
      name: 'Talento Humano',
      costCenterKey: costCenter?.costCenterKey ?? 'CC-ADMIN',
    });
    await this.upsertDepartment(organizationId, userId, {
      departmentKey: 'DEPT-FIN',
      areaKey: area.areaKey,
      code: 'FIN',
      name: 'Finanzas',
      costCenterKey: costCenter?.costCenterKey ?? 'CC-OPS',
    });
    await this.upsertDepartment(organizationId, userId, {
      departmentKey: 'DEPT-OPS',
      areaKey: area.areaKey,
      code: 'OPS',
      name: 'Operaciones',
      costCenterKey: 'CC-OPS',
    });

    for (const lvl of DEFAULT_HCM_HIERARCHY_LEVELS) {
      await this.prisma.hcmHierarchyLevel.create({ data: { organizationId, ...lvl } });
    }

    for (const pos of DEFAULT_HCM_POSITIONS) {
      await this.upsertPosition(organizationId, userId, {
        ...pos,
        departmentKey: pos.code.startsWith('HR') ? 'DEPT-HR' : pos.code.startsWith('ACC') || pos.code.startsWith('CFO') ? 'DEPT-FIN' : 'DEPT-OPS',
      });
    }

    const wcKey = generateHcmKey('WC', 1);
    await this.prisma.hcmWorkCenter.create({
      data: { organizationId, workCenterKey: wcKey, branchKey: branch.branchKey, code: 'WC-HQ', name: 'Centro trabajo principal', costCenterKey: costCenter?.costCenterKey },
    });

    const deptOps = await this.prisma.hcmDepartment.findFirst({ where: { organizationId, departmentKey: 'DEPT-OPS' } });
    if (deptOps) {
      const procKey = generateHcmKey('PROC', 1);
      await this.prisma.hcmProcess.create({
        data: { organizationId, processKey: procKey, departmentKey: deptOps.departmentKey, code: 'PROC-MAIN', name: 'Proceso operativo principal' },
      });
      await this.prisma.hcmWorkTeam.create({
        data: { organizationId, teamKey: generateHcmKey('TEAM', 1), processKey: procKey, code: 'TEAM-A', name: 'Equipo operativo A' },
      });
    }

    await this.rebuildOrgChart(organizationId, userId);
    await this.audit.log(organizationId, 'HcmConfig', 'seed', 'completed', userId);
    return this.hierarchy(organizationId);
  }
}
