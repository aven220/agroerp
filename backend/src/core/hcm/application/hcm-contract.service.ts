import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmEmployeeService } from './hcm-employee.service';
import { generateHcmKey, resolveContractEndDate } from '../domain/hcm-workforce.engine';
import type { HcmContractStatus, HcmContractType } from '@prisma/client';

@Injectable()
export class HcmContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly employees: HcmEmployeeService,
  ) {}

  list(organizationId: string, filters?: { employeeKey?: string; status?: HcmContractStatus; contractType?: HcmContractType }) {
    return this.prisma.hcmContract.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.contractType ? { contractType: filters.contractType } : {}),
      },
      include: { renewals: { orderBy: { createdAt: 'desc' } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async get(organizationId: string, contractKey: string) {
    const contract = await this.prisma.hcmContract.findFirst({
      where: { organizationId, contractKey },
      include: { renewals: { orderBy: { createdAt: 'desc' } }, employee: true },
    });
    if (!contract) throw new NotFoundException(`Contrato ${contractKey} no encontrado`);
    return contract;
  }

  async create(organizationId: string, userId: string, input: {
    employeeKey: string; contractType: HcmContractType; startDate: string; endDate?: string;
    salary?: number; currencyKey?: string; workCenterKey?: string; positionKey?: string; contractNumber?: string;
  }) {
    await this.employees.get(organizationId, input.employeeKey);
    const startDate = new Date(input.startDate);
    const endDate = resolveContractEndDate(input.contractType, startDate, input.endDate ? new Date(input.endDate) : null);

    const contractKey = generateHcmKey('CTR', (await this.prisma.hcmContract.count({ where: { organizationId } })) + 1);
    const contract = await this.prisma.hcmContract.create({
      data: {
        organizationId,
        contractKey,
        employeeKey: input.employeeKey,
        contractType: input.contractType,
        status: 'active',
        contractNumber: input.contractNumber,
        startDate,
        endDate,
        salary: input.salary,
        currencyKey: input.currencyKey ?? 'COP',
        workCenterKey: input.workCenterKey,
        positionKey: input.positionKey,
        signedAt: new Date(),
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'HcmContract', contractKey, 'created', userId, { contractType: input.contractType });
    await this.core.emitUserAction(organizationId, 'HcmContract', contractKey, EVENT_TYPES.HCM_CONTRACT_CREATED, { employeeKey: input.employeeKey });
    return contract;
  }

  async renew(organizationId: string, contractKey: string, userId: string, input: {
    renewalType: 'renewal' | 'extension'; newEndDate: string; notes?: string;
  }) {
    const contract = await this.get(organizationId, contractKey);
    if (contract.status === 'terminated') throw new BadRequestException('Contrato terminado');

    const renewalKey = generateHcmKey('RNW', (await this.prisma.hcmContractRenewal.count({ where: { organizationId } })) + 1);
    await this.prisma.hcmContractRenewal.create({
      data: {
        organizationId,
        renewalKey,
        contractKey,
        renewalType: input.renewalType,
        previousEndDate: contract.endDate,
        newEndDate: new Date(input.newEndDate),
        signedAt: new Date(),
        notes: input.notes,
        createdBy: userId,
      },
    });

    const updated = await this.prisma.hcmContract.update({
      where: { id: contract.id },
      data: {
        endDate: new Date(input.newEndDate),
        renewalCount: contract.renewalCount + 1,
        status: input.renewalType === 'renewal' ? 'renewed' : 'extended',
      },
    });

    await this.audit.log(organizationId, 'HcmContract', contractKey, 'renewed', userId, input as object);
    await this.core.emitUserAction(organizationId, 'HcmContract', contractKey, EVENT_TYPES.HCM_CONTRACT_RENEWED, input);
    return updated;
  }

  async terminate(organizationId: string, contractKey: string, userId: string, input: {
    terminationDate: string; reason: string;
  }) {
    const contract = await this.get(organizationId, contractKey);
    const updated = await this.prisma.hcmContract.update({
      where: { id: contract.id },
      data: {
        status: 'terminated',
        terminationDate: new Date(input.terminationDate),
        terminationReason: input.reason,
      },
    });

    await this.audit.log(organizationId, 'HcmContract', contractKey, 'terminated', userId, input as object);
    await this.core.emitUserAction(organizationId, 'HcmContract', contractKey, EVENT_TYPES.HCM_CONTRACT_TERMINATED, input);
    return updated;
  }
}
