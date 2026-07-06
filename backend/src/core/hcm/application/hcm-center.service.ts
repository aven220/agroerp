import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmOrgService } from './hcm-org.service';
import { HcmEmployeeService } from './hcm-employee.service';
import { HcmContractService } from './hcm-contract.service';

@Injectable()
export class HcmCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly org: HcmOrgService,
    private readonly employees: HcmEmployeeService,
    private readonly contracts: HcmContractService,
  ) {}

  async center(organizationId: string) {
    const [
      employeeCount,
      activeEmployees,
      companyCount,
      departmentCount,
      positionCount,
      contractCount,
      activeContracts,
      documentCount,
      recentHires,
      expiringContracts,
    ] = await Promise.all([
      this.prisma.hcmEmployee.count({ where: { organizationId } }),
      this.prisma.hcmEmployee.count({ where: { organizationId, employmentStatus: 'active' } }),
      this.prisma.hcmCompany.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmDepartment.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmPosition.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmContract.count({ where: { organizationId } }),
      this.prisma.hcmContract.count({ where: { organizationId, status: 'active' } }),
      this.prisma.hcmEmployeeDocument.count({ where: { organizationId } }),
      this.prisma.hcmEmployee.findMany({
        where: { organizationId, employmentStatus: 'active' },
        orderBy: { hireDate: 'desc' },
        take: 5,
        select: { employeeKey: true, displayName: true, hireDate: true, departmentKey: true },
      }),
      this.prisma.hcmContract.findMany({
        where: {
          organizationId,
          status: 'active',
          endDate: { lte: new Date(Date.now() + 30 * 86400000) },
        },
        take: 10,
        include: { employee: { select: { displayName: true } } },
      }),
    ]);

    return {
      employeeCount,
      activeEmployees,
      companyCount,
      departmentCount,
      positionCount,
      contractCount,
      activeContracts,
      documentCount,
      recentHires,
      expiringContracts,
    };
  }

  async seed(organizationId: string, userId: string) {
    await this.org.seed(organizationId, userId);

    const existing = await this.prisma.hcmEmployee.count({ where: { organizationId } });
    if (existing === 0) {
      const ceo = await this.employees.create(organizationId, userId, {
        employeeNumber: 'EMP-00001',
        firstName: 'Ana',
        lastName: 'García',
        documentNumber: '1010101010',
        email: 'ana.garcia@agroerp.com',
        companyKey: 'CO-MAIN',
        branchKey: 'BR-HQ',
        departmentKey: 'DEPT-HR',
        positionKey: 'POS-HR',
        costCenterKey: 'CC-ADMIN',
        hireDate: `${new Date().getFullYear()}-01-15`,
      });

      await this.employees.create(organizationId, userId, {
        employeeNumber: 'EMP-00002',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        documentNumber: '2020202020',
        email: 'carlos.rodriguez@agroerp.com',
        companyKey: 'CO-MAIN',
        branchKey: 'BR-HQ',
        departmentKey: 'DEPT-FIN',
        positionKey: 'POS-CFO',
        managerEmployeeKey: ceo.employeeKey,
        costCenterKey: 'CC-OPS',
        hireDate: `${new Date().getFullYear()}-02-01`,
      });

      await this.employees.create(organizationId, userId, {
        employeeNumber: 'EMP-00003',
        firstName: 'María',
        lastName: 'López',
        documentNumber: '3030303030',
        email: 'maria.lopez@agroerp.com',
        companyKey: 'CO-MAIN',
        branchKey: 'BR-HQ',
        departmentKey: 'DEPT-OPS',
        positionKey: 'POS-OPS',
        costCenterKey: 'CC-OPS',
        hireDate: `${new Date().getFullYear()}-03-10`,
      });

      const emps = await this.prisma.hcmEmployee.findMany({ where: { organizationId }, take: 3 });
      for (const emp of emps) {
        const existing = await this.prisma.hcmContract.count({ where: { organizationId, employeeKey: emp.employeeKey } });
        if (existing === 0) {
          await this.contracts.create(organizationId, userId, {
            employeeKey: emp.employeeKey,
            contractType: emp.positionKey === 'POS-OPS' ? 'fixed_term' : 'indefinite',
            startDate: emp.hireDate?.toISOString().slice(0, 10) ?? `${new Date().getFullYear()}-01-01`,
            salary: 3500000,
            positionKey: emp.positionKey ?? undefined,
            workCenterKey: emp.workCenterKey ?? undefined,
          });
        }
      }
    }

    await this.audit.log(organizationId, 'HcmConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async mobileSync(organizationId: string) {
    const [center, employees, org, contracts, documents] = await Promise.all([
      this.center(organizationId),
      this.employees.list(organizationId, { status: 'active' }),
      this.org.hierarchy(organizationId),
      this.prisma.hcmContract.findMany({ where: { organizationId, status: 'active' }, take: 100 }),
      this.prisma.hcmEmployeeDocument.findMany({ where: { organizationId }, take: 100, include: { versions: { take: 1, orderBy: { versionNumber: 'desc' } } } }),
    ]);
    return { center, employees, org, contracts, documents, syncedAt: new Date().toISOString() };
  }
}
