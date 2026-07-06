import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { generateFiscalYearKey, generatePeriodKey } from '../domain/efm-accounting.engine';

@Injectable()
export class EfmPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  listFiscalYears(organizationId: string) {
    return this.prisma.efmFiscalYear.findMany({
      where: { organizationId },
      orderBy: { year: 'desc' },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
    });
  }

  async createFiscalYear(
    organizationId: string,
    userId: string,
    input: { year: number; companyKey?: string; startDate?: string; endDate?: string },
  ) {
    const year = input.year;
    const fiscalYearKey = generateFiscalYearKey(year);
    const startDate = input.startDate ? new Date(input.startDate) : new Date(`${year}-01-01`);
    const endDate = input.endDate ? new Date(input.endDate) : new Date(`${year}-12-31`);

    const existing = await this.prisma.efmFiscalYear.findFirst({ where: { organizationId, fiscalYearKey } });
    if (existing) throw new BadRequestException(`Ejercicio ${year} ya existe`);

    const fy = await this.prisma.efmFiscalYear.create({
      data: {
        organizationId,
        fiscalYearKey,
        year,
        companyKey: input.companyKey,
        startDate,
        endDate,
        status: 'open',
      },
    });

    const periods = [];
    for (let m = 1; m <= 12; m += 1) {
      const pStart = new Date(year, m - 1, 1);
      const pEnd = new Date(year, m, 0);
      const period = await this.prisma.efmAccountingPeriod.create({
        data: {
          organizationId,
          periodKey: generatePeriodKey(year, m),
          fiscalYearKey,
          periodNumber: m,
          name: `${year}-${String(m).padStart(2, '0')}`,
          startDate: pStart,
          endDate: pEnd,
          status: 'open',
        },
      });
      periods.push(period);
    }

    await this.audit.log(organizationId, 'EfmFiscalYear', fiscalYearKey, 'created', userId, { year });
    return { ...fy, periods };
  }

  listPeriods(organizationId: string, fiscalYearKey?: string) {
    return this.prisma.efmAccountingPeriod.findMany({
      where: { organizationId, ...(fiscalYearKey ? { fiscalYearKey } : {}) },
      orderBy: [{ fiscalYearKey: 'desc' }, { periodNumber: 'asc' }],
    });
  }

  async getOpenPeriod(organizationId: string, date = new Date()) {
    return this.prisma.efmAccountingPeriod.findFirst({
      where: {
        organizationId,
        status: 'open',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }

  async closePeriod(organizationId: string, periodKey: string, userId: string) {
    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    if (!period) throw new NotFoundException(`Período ${periodKey} no encontrado`);
    const updated = await this.prisma.efmAccountingPeriod.update({
      where: { id: period.id },
      data: { status: 'closed' },
    });
    await this.audit.log(organizationId, 'EfmAccountingPeriod', periodKey, 'closed', userId);
    return updated;
  }

  async lockPeriod(organizationId: string, periodKey: string, userId: string) {
    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    if (!period) throw new NotFoundException(`Período ${periodKey} no encontrado`);
    const updated = await this.prisma.efmAccountingPeriod.update({
      where: { id: period.id },
      data: { status: 'locked' },
    });
    await this.audit.log(organizationId, 'EfmAccountingPeriod', periodKey, 'locked', userId);
    return updated;
  }

  async reopenPeriod(organizationId: string, periodKey: string, userId: string) {
    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    if (!period) throw new NotFoundException(`Período ${periodKey} no encontrado`);
    const updated = await this.prisma.efmAccountingPeriod.update({
      where: { id: period.id },
      data: { status: 'open' },
    });
    await this.audit.log(organizationId, 'EfmAccountingPeriod', periodKey, 'reopened', userId);
    return updated;
  }
}
