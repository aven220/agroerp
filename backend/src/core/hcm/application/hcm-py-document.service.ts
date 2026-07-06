import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { generatePyKey } from '../domain/hcm-payroll.engine';
import type { HcmPyDocumentType } from '@prisma/client';

@Injectable()
export class HcmPyDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { employeeKey?: string; documentType?: HcmPyDocumentType }) {
    return this.prisma.hcmPyDocument.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.documentType ? { documentType: filters.documentType } : {}),
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async generatePayslipDocument(organizationId: string, userId: string, payslipKey: string) {
    const payslip = await this.prisma.hcmPyPayslip.findFirst({
      where: { organizationId, payslipKey },
      include: { lines: true, run: true },
    });
    if (!payslip) throw new NotFoundException('Desprendible no encontrado');

    const employee = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employeeKey: payslip.employeeKey } });
    const documentKey = generatePyKey('DOC', Date.now() % 1000000);
    const doc = await this.prisma.hcmPyDocument.create({
      data: {
        organizationId,
        documentKey,
        employeeKey: payslip.employeeKey,
        documentType: 'payslip',
        referenceKey: payslipKey,
        title: `Desprendible ${payslip.periodCode}`,
        periodCode: payslip.periodCode,
        content: {
          employee: employee ? { employeeKey: employee.employeeKey, fullName: `${employee.firstName} ${employee.lastName}` } : {},
          payslip: {
            baseSalary: payslip.baseSalary,
            totalEarnings: payslip.totalEarnings,
            totalDeductions: payslip.totalDeductions,
            netPay: payslip.netPay,
            lines: payslip.lines,
          },
        },
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyDocument', documentKey, 'payslip_generated', userId);
    return doc;
  }

  async generateLaborCertificate(organizationId: string, userId: string, employeeKey: string) {
    const employee = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, employeeKey },
      include: { contracts: { where: { status: 'active' }, take: 1 } },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const documentKey = generatePyKey('DOC', Date.now() % 1000000);
    const contract = employee.contracts[0];
    const doc = await this.prisma.hcmPyDocument.create({
      data: {
        organizationId,
        documentKey,
        employeeKey,
        documentType: 'labor_certificate',
        title: 'Certificado laboral',
        content: {
          employee: { fullName: `${employee.firstName} ${employee.lastName}`, employeeKey },
          contract: contract ? { contractKey: contract.contractKey, startDate: contract.startDate, salary: contract.salary } : null,
          issuedAt: new Date().toISOString(),
        },
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyDocument', documentKey, 'labor_certificate', userId);
    return doc;
  }

  async generateIncomeCertificate(organizationId: string, userId: string, employeeKey: string, year: number) {
    const payslips = await this.prisma.hcmPyPayslip.findMany({
      where: { organizationId, employeeKey, periodCode: { startsWith: String(year) }, status: { in: ['approved', 'paid'] } },
    });
    const employee = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employeeKey } });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const totalIncome = payslips.reduce((s, p) => s + p.totalEarnings, 0);
    const totalDeductions = payslips.reduce((s, p) => s + p.totalDeductions, 0);
    const documentKey = generatePyKey('DOC', Date.now() % 1000000);

    const doc = await this.prisma.hcmPyDocument.create({
      data: {
        organizationId,
        documentKey,
        employeeKey,
        documentType: 'income_certificate',
        title: `Certificado de ingresos ${year}`,
        content: {
          employee: { fullName: `${employee.firstName} ${employee.lastName}` },
          year,
          totalIncome,
          totalDeductions,
          netIncome: totalIncome - totalDeductions,
          periods: payslips.length,
        },
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyDocument', documentKey, 'income_certificate', userId, { year });
    return doc;
  }

  async salaryHistory(organizationId: string, employeeKey: string) {
    const [payslips, provisions, settlements] = await Promise.all([
      this.prisma.hcmPyPayslip.findMany({
        where: { organizationId, employeeKey },
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.hcmPyProvision.findMany({ where: { organizationId, employeeKey }, orderBy: { accruedAt: 'desc' } }),
      this.prisma.hcmPySettlement.findMany({ where: { organizationId, employeeKey } }),
    ]);
    return { payslips, provisions, settlements };
  }
}
