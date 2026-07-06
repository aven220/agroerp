import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { buildPeriodCode, generatePyKey } from '../domain/hcm-payroll.engine';
import type { HcmPyPeriodStatus } from '@prisma/client';

@Injectable()
export class HcmPyPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { companyKey?: string; status?: HcmPyPeriodStatus }) {
    return this.prisma.hcmPyPeriod.findMany({
      where: {
        organizationId,
        ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { startDate: 'desc' },
      include: { config: true, runs: true },
    });
  }

  async get(organizationId: string, periodKey: string) {
    const period = await this.prisma.hcmPyPeriod.findFirst({
      where: { organizationId, periodKey },
      include: { config: true, runs: { include: { payslips: true } } },
    });
    if (!period) throw new NotFoundException(`Período ${periodKey} no encontrado`);
    return period;
  }

  async create(organizationId: string, userId: string, input: {
    configKey: string; companyKey: string; year: number; month: number; paymentDate?: string;
  }) {
    const config = await this.prisma.hcmPyConfig.findFirst({ where: { organizationId, configKey: input.configKey } });
    if (!config) throw new BadRequestException('Configuración de nómina no encontrada');

    const periodCode = buildPeriodCode(input.year, input.month, config.periodicity);
    const existing = await this.prisma.hcmPyPeriod.findFirst({ where: { organizationId, companyKey: input.companyKey, periodCode } });
    if (existing) return existing;

    const startDate = new Date(input.year, input.month - 1, 1);
    const endDate = new Date(input.year, input.month, 0);
    const periodKey = generatePyKey('PRD', (await this.prisma.hcmPyPeriod.count({ where: { organizationId } })) + 1);

    const period = await this.prisma.hcmPyPeriod.create({
      data: {
        organizationId, periodKey, configKey: input.configKey, companyKey: input.companyKey,
        periodCode, startDate, endDate,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : endDate,
        status: 'open',
      },
    });
    await this.audit.log(organizationId, 'HcmPyPeriod', periodKey, 'created', userId, { periodCode });
    return period;
  }

  async close(organizationId: string, periodKey: string, userId: string) {
    const period = await this.get(organizationId, periodKey);
    if (period.status === 'locked') throw new BadRequestException('Período bloqueado');
    const updated = await this.prisma.hcmPyPeriod.update({
      where: { id: period.id },
      data: { status: 'closed' },
    });
    await this.audit.log(organizationId, 'HcmPyPeriod', periodKey, 'closed', userId);
    return updated;
  }

  async lock(organizationId: string, periodKey: string, userId: string) {
    const period = await this.get(organizationId, periodKey);
    const updated = await this.prisma.hcmPyPeriod.update({
      where: { id: period.id },
      data: { status: 'locked' },
    });
    await this.audit.log(organizationId, 'HcmPyPeriod', periodKey, 'locked', userId);
    return updated;
  }
}
