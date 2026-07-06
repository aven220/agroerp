import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class FmdtReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async run(organizationId: string, reportCode: string, params: Record<string, string> = {}) {
    switch (reportCode) {
      case 'FMDT-RPT-01':
        return this.padronLotes(organizationId, params);
      case 'FMDT-RPT-02':
        return this.laboresPeriodo(organizationId, params);
      case 'FMDT-RPT-03':
        return this.costosLote(organizationId, params);
      case 'FMDT-RPT-07':
        return this.productividad(organizationId, params);
      case 'FMDT-RPT-06':
        return this.rentabilidad(organizationId, params);
      default:
        return { reportCode, message: 'Reporte no implementado', data: [] };
    }
  }

  private async padronLotes(organizationId: string, params: Record<string, string>) {
    const items = await this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(params.status ? { status: params.status as never } : {}),
      },
      include: {
        farmUnit: { select: { farmName: true, municipalityCode: true } },
        digitalTwin: true,
      },
      orderBy: { lotCode: 'asc' },
    });
    return { reportCode: 'FMDT-RPT-01', count: items.length, items };
  }

  private async laboresPeriodo(organizationId: string, params: Record<string, string>) {
    const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = params.to ? new Date(params.to) : new Date();
    const items = await this.prisma.fieldOperation.findMany({
      where: {
        organizationId,
        deletedAt: null,
        operationDate: { gte: from, lte: to },
        ...(params.fieldLotId ? { fieldLotId: params.fieldLotId } : {}),
      },
      include: { fieldLot: { select: { lotCode: true, lotName: true } } },
      orderBy: { operationDate: 'desc' },
    });
    return { reportCode: 'FMDT-RPT-02', count: items.length, items };
  }

  private async costosLote(organizationId: string, params: Record<string, string>) {
    const items = await this.prisma.lotCostEntry.groupBy({
      by: ['fieldLotId', 'costCategoryCode'],
      where: {
        organizationId,
        deletedAt: null,
        ...(params.campaignCode ? { campaignCode: params.campaignCode } : {}),
      },
      _sum: { amount: true },
    });
    return { reportCode: 'FMDT-RPT-03', count: items.length, items };
  }

  private async productividad(organizationId: string, params: Record<string, string>) {
    const twins = await this.prisma.lotDigitalTwin.findMany({
      where: { organizationId },
      include: { fieldLot: { select: { lotCode: true, lotName: true, plantedAreaHa: true } } },
      orderBy: { avgYieldKgHa: 'desc' },
      take: 100,
    });
    return { reportCode: 'FMDT-RPT-07', count: twins.length, items: twins };
  }

  private async rentabilidad(organizationId: string, params: Record<string, string>) {
    const twins = await this.prisma.lotDigitalTwin.findMany({
      where: {
        organizationId,
        ...(params.minMargin ? { marginPct: { gte: new Prisma.Decimal(params.minMargin) } } : {}),
      },
      include: { fieldLot: { select: { lotCode: true, lotName: true } } },
      orderBy: { marginPct: 'desc' },
    });
    return { reportCode: 'FMDT-RPT-06', count: twins.length, items: twins };
  }
}
