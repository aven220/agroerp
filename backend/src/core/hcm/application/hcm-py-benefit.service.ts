import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { generatePyKey } from '../domain/hcm-payroll.engine';
import type { HcmPyBenefitType } from '@prisma/client';

@Injectable()
export class HcmPyBenefitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { employeeKey?: string; benefitType?: HcmPyBenefitType }) {
    return this.prisma.hcmPyBenefit.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.benefitType ? { benefitType: filters.benefitType } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, input: {
    employeeKey: string; benefitType: HcmPyBenefitType; name: string;
    amount: number; startDate: string; endDate?: string;
  }) {
    const benefitKey = generatePyKey('BNF', (await this.prisma.hcmPyBenefit.count({ where: { organizationId } })) + 1);
    const benefit = await this.prisma.hcmPyBenefit.create({
      data: {
        organizationId, benefitKey, employeeKey: input.employeeKey,
        benefitType: input.benefitType, name: input.name, amount: input.amount,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmPyBenefit', benefitKey, 'created', userId);
    return benefit;
  }
}
