import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  buildDisplayName,
  canTransitionEmploymentStatus,
  filterEmployeesByQuery,
  generateHcmKey,
  validateDocumentNumber,
  validateEmployeeNumber,
  validateImportRow,
  type EmployeeImportRow,
} from '../domain/hcm-workforce.engine';
import type { HcmEmploymentStatus, HcmHistoryEventType } from '@prisma/client';

export type CreateEmployeeInput = {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  documentType?: string;
  documentNumber: string;
  email?: string;
  phone?: string;
  mobile?: string;
  companyKey: string;
  branchKey?: string;
  departmentKey?: string;
  positionKey?: string;
  workCenterKey?: string;
  teamKey?: string;
  managerEmployeeKey?: string;
  costCenterKey?: string;
  hireDate?: string;
  userId?: string;
};

@Injectable()
export class HcmEmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { status?: HcmEmploymentStatus; companyKey?: string; departmentKey?: string; q?: string }) {
    return this.prisma.hcmEmployee.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { employmentStatus: filters.status } : {}),
        ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
        ...(filters?.departmentKey ? { departmentKey: filters.departmentKey } : {}),
      },
      orderBy: [{ employmentStatus: 'asc' }, { displayName: 'asc' }],
      include: { dependents: true, contacts: true, contracts: { where: { status: 'active' }, take: 1 } },
    }).then((rows) => filters?.q ? filterEmployeesByQuery(rows, filters.q) : rows);
  }

  async get(organizationId: string, employeeKey: string) {
    const employee = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, employeeKey },
      include: {
        dependents: true,
        contacts: true,
        histories: { orderBy: { effectiveDate: 'desc' }, take: 50 },
        contracts: { orderBy: { startDate: 'desc' } },
        documents: { include: { versions: { orderBy: { versionNumber: 'desc' }, take: 3 } } },
      },
    });
    if (!employee) throw new NotFoundException(`Empleado ${employeeKey} no encontrado`);
    return employee;
  }

  async create(organizationId: string, userId: string, input: CreateEmployeeInput) {
    if (!validateEmployeeNumber(input.employeeNumber)) throw new BadRequestException('Número de empleado inválido');
    if (!validateDocumentNumber(input.documentNumber)) throw new BadRequestException('Documento inválido');

    const dup = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, OR: [{ employeeNumber: input.employeeNumber }, { documentNumber: input.documentNumber }] },
    });
    if (dup) throw new BadRequestException('Empleado duplicado por número o documento');

    const employeeKey = generateHcmKey('EMP', (await this.prisma.hcmEmployee.count({ where: { organizationId } })) + 1);
    const displayName = buildDisplayName(input.firstName, input.lastName, input.middleName, input.secondLastName);

    const employee = await this.prisma.hcmEmployee.create({
      data: {
        organizationId,
        employeeKey,
        employeeNumber: input.employeeNumber.toUpperCase(),
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        secondLastName: input.secondLastName,
        displayName,
        documentType: input.documentType ?? 'CC',
        documentNumber: input.documentNumber,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        departmentKey: input.departmentKey,
        positionKey: input.positionKey,
        workCenterKey: input.workCenterKey,
        teamKey: input.teamKey,
        managerEmployeeKey: input.managerEmployeeKey,
        costCenterKey: input.costCenterKey,
        hireDate: input.hireDate ? new Date(input.hireDate) : new Date(),
        userId: input.userId,
        employmentStatus: 'active',
        createdBy: userId,
      },
    });

    await this.addHistory(organizationId, employeeKey, userId, {
      eventType: 'hire',
      effectiveDate: input.hireDate ?? new Date().toISOString().slice(0, 10),
      toCompanyKey: input.companyKey,
      toDepartmentKey: input.departmentKey,
      toPositionKey: input.positionKey,
      notes: 'Contratación inicial',
    });

    await this.audit.log(organizationId, 'HcmEmployee', employeeKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmEmployee', employeeKey, EVENT_TYPES.HCM_EMPLOYEE_HIRED, { employeeNumber: input.employeeNumber });

    return this.get(organizationId, employeeKey);
  }

  async update(organizationId: string, employeeKey: string, userId: string, input: Partial<CreateEmployeeInput>) {
    const existing = await this.get(organizationId, employeeKey);
    const displayName = buildDisplayName(
      input.firstName ?? existing.firstName,
      input.lastName ?? existing.lastName,
      input.middleName ?? existing.middleName ?? undefined,
      input.secondLastName ?? existing.secondLastName ?? undefined,
    );

    const updated = await this.prisma.hcmEmployee.update({
      where: { id: existing.id },
      data: {
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.secondLastName !== undefined ? { secondLastName: input.secondLastName } : {}),
        displayName,
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
        ...(input.branchKey !== undefined ? { branchKey: input.branchKey } : {}),
        ...(input.workCenterKey !== undefined ? { workCenterKey: input.workCenterKey } : {}),
        ...(input.teamKey !== undefined ? { teamKey: input.teamKey } : {}),
        ...(input.managerEmployeeKey !== undefined ? { managerEmployeeKey: input.managerEmployeeKey } : {}),
        ...(input.costCenterKey !== undefined ? { costCenterKey: input.costCenterKey } : {}),
      },
    });

    await this.audit.log(organizationId, 'HcmEmployee', employeeKey, 'updated', userId);
    await this.core.emitUserAction(organizationId, 'HcmEmployee', employeeKey, EVENT_TYPES.HCM_EMPLOYEE_UPDATED, {});
    return updated;
  }

  async transfer(organizationId: string, employeeKey: string, userId: string, input: {
    toCompanyKey?: string; toDepartmentKey?: string; toPositionKey?: string; effectiveDate: string; notes?: string;
  }) {
    const employee = await this.get(organizationId, employeeKey);
    await this.prisma.hcmEmployee.update({
      where: { id: employee.id },
      data: {
        companyKey: input.toCompanyKey ?? employee.companyKey,
        departmentKey: input.toDepartmentKey ?? employee.departmentKey,
        positionKey: input.toPositionKey ?? employee.positionKey,
      },
    });

    await this.addHistory(organizationId, employeeKey, userId, {
      eventType: 'transfer',
      effectiveDate: input.effectiveDate,
      fromCompanyKey: employee.companyKey,
      toCompanyKey: input.toCompanyKey ?? employee.companyKey,
      fromDepartmentKey: employee.departmentKey ?? undefined,
      toDepartmentKey: input.toDepartmentKey ?? employee.departmentKey ?? undefined,
      fromPositionKey: employee.positionKey ?? undefined,
      toPositionKey: input.toPositionKey ?? employee.positionKey ?? undefined,
      notes: input.notes,
    });

    await this.audit.log(organizationId, 'HcmEmployee', employeeKey, 'transferred', userId, input as object);
    await this.core.emitUserAction(organizationId, 'HcmEmployee', employeeKey, EVENT_TYPES.HCM_EMPLOYEE_TRANSFERRED, input);
    return this.get(organizationId, employeeKey);
  }

  async changeStatus(organizationId: string, employeeKey: string, userId: string, status: HcmEmploymentStatus, effectiveDate: string, notes?: string) {
    const employee = await this.get(organizationId, employeeKey);
    if (!canTransitionEmploymentStatus(employee.employmentStatus, status)) {
      throw new BadRequestException(`Transición inválida ${employee.employmentStatus} → ${status}`);
    }

    await this.prisma.hcmEmployee.update({
      where: { id: employee.id },
      data: {
        employmentStatus: status,
        ...(status === 'terminated' || status === 'retired' ? { terminationDate: new Date(effectiveDate) } : {}),
      },
    });

    await this.addHistory(organizationId, employeeKey, userId, {
      eventType: status === 'terminated' ? 'termination' : 'leave',
      effectiveDate,
      notes,
    });

    if (status === 'terminated') {
      await this.core.emitUserAction(organizationId, 'HcmEmployee', employeeKey, EVENT_TYPES.HCM_EMPLOYEE_TERMINATED, { effectiveDate });
    }

    await this.audit.log(organizationId, 'HcmEmployee', employeeKey, 'status_changed', userId, { status });
    return this.get(organizationId, employeeKey);
  }

  async addDependent(organizationId: string, employeeKey: string, userId: string, input: {
    firstName: string; lastName: string; relationship: string; documentNumber?: string; birthDate?: string; isBeneficiary?: boolean;
  }) {
    await this.get(organizationId, employeeKey);
    const dependentKey = generateHcmKey('DEP', (await this.prisma.hcmEmployeeDependent.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmEmployeeDependent.create({
      data: {
        organizationId,
        dependentKey,
        employeeKey,
        firstName: input.firstName,
        lastName: input.lastName,
        relationship: input.relationship,
        documentNumber: input.documentNumber,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        isBeneficiary: input.isBeneficiary ?? false,
      },
    });
  }

  async addEmergencyContact(organizationId: string, employeeKey: string, input: {
    name: string; relationship: string; phone: string; email?: string; isPrimary?: boolean;
  }) {
    await this.get(organizationId, employeeKey);
    const contactKey = generateHcmKey('EC', (await this.prisma.hcmEmployeeEmergencyContact.count({ where: { organizationId } })) + 1);
    if (input.isPrimary) {
      await this.prisma.hcmEmployeeEmergencyContact.updateMany({
        where: { organizationId, employeeKey },
        data: { isPrimary: false },
      });
    }
    return this.prisma.hcmEmployeeEmergencyContact.create({
      data: { organizationId, contactKey, employeeKey, ...input },
    });
  }

  async updateAuthorizedFields(organizationId: string, employeeKey: string, userId: string, input: {
    phone?: string; mobile?: string; email?: string; address?: string; city?: string;
  }) {
    const employee = await this.get(organizationId, employeeKey);
    return this.prisma.hcmEmployee.update({
      where: { id: employee.id },
      data: {
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
      },
    });
  }

  async bulkImport(organizationId: string, userId: string, rows: EmployeeImportRow[]) {
    const results = [];
    for (let i = 0; i < rows.length; i += 1) {
      const validation = validateImportRow(rows[i], i + 1);
      if (!validation.valid) {
        results.push({ row: i + 1, success: false, errors: validation.errors });
        continue;
      }
      try {
        const employee = await this.create(organizationId, userId, {
          employeeNumber: rows[i].employeeNumber,
          firstName: rows[i].firstName,
          lastName: rows[i].lastName,
          documentNumber: rows[i].documentNumber,
          email: rows[i].email,
          companyKey: rows[i].companyKey,
          departmentKey: rows[i].departmentKey,
          positionKey: rows[i].positionKey,
          hireDate: rows[i].hireDate,
        });
        results.push({ row: i + 1, success: true, employeeKey: employee.employeeKey });
      } catch (err) {
        results.push({ row: i + 1, success: false, errors: [(err as Error).message] });
      }
    }
    await this.audit.log(organizationId, 'HcmEmployee', 'bulk-import', 'completed', userId, { total: rows.length, success: results.filter((r) => r.success).length });
    return results;
  }

  search(organizationId: string, query: string, limit = 50) {
    return this.list(organizationId, { q: query }).then((rows) => rows.slice(0, limit));
  }

  private async addHistory(organizationId: string, employeeKey: string, userId: string, input: {
    eventType: HcmHistoryEventType; effectiveDate: string; fromPositionKey?: string; toPositionKey?: string;
    fromDepartmentKey?: string; toDepartmentKey?: string; fromCompanyKey?: string; toCompanyKey?: string; notes?: string;
  }) {
    const historyKey = generateHcmKey('HIST', (await this.prisma.hcmEmployeeHistory.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmEmployeeHistory.create({
      data: {
        organizationId,
        historyKey,
        employeeKey,
        eventType: input.eventType,
        effectiveDate: new Date(input.effectiveDate),
        fromPositionKey: input.fromPositionKey,
        toPositionKey: input.toPositionKey,
        fromDepartmentKey: input.fromDepartmentKey,
        toDepartmentKey: input.toDepartmentKey,
        fromCompanyKey: input.fromCompanyKey,
        toCompanyKey: input.toCompanyKey,
        notes: input.notes,
        createdBy: userId,
      },
    });
  }
}
