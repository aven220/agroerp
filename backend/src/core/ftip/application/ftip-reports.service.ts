import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class FtipReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runReport(organizationId: string, reportCode: string, filters: Record<string, string> = {}) {
    switch (reportCode) {
      case 'FTIP-RPT-01':
      case 'FTIP-RPT-13':
        return this.padronFincas(organizationId, filters);
      case 'FTIP-RPT-03':
        return this.mapaCultivos(organizationId);
      case 'FTIP-RPT-05':
        return this.mapaRiesgos(organizationId);
      case 'FTIP-RPT-06':
        return this.mapaVisitas(organizationId);
      case 'FTIP-RPT-08':
        return this.inventarioRecursos(organizationId);
      case 'FTIP-RPT-09':
        return this.infraestructura(organizationId);
      case 'FTIP-RPT-10':
        return this.historialGeometria(organizationId, filters.farmUnitId);
      case 'FTIP-RPT-11':
        return this.cumplimientoCert(organizationId);
      case 'FTIP-RPT-14':
        return this.sinPoligono(organizationId);
      case 'FTIP-RPT-16':
        return this.expedienteDocumental(organizationId);
      default:
        throw new NotFoundException(`Report ${reportCode} not found`);
    }
  }

  private async padronFincas(organizationId: string, filters: Record<string, string>) {
    const farms = await this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.municipalityCode ? { municipalityCode: filters.municipalityCode } : {}),
      },
      select: {
        farmCode: true,
        farmName: true,
        municipalityCode: true,
        veredaCode: true,
        status: true,
        totalAreaHa: true,
        agriculturalAreaHa: true,
        activatedAt: true,
      },
      orderBy: { farmCode: 'asc' },
    });
    return { reportId: 'FTIP-RPT-13', count: farms.length, items: farms };
  }

  private async mapaCultivos(organizationId: string) {
    const stands = await this.prisma.cropStand.findMany({
      where: { organizationId, status: 'active' },
      include: {
        lot: { select: { lotCode: true, areaHa: true, farmUnitId: true } },
        farmUnit: { select: { farmCode: true, farmName: true } },
      },
    });
    return { reportId: 'FTIP-RPT-03', count: stands.length, items: stands };
  }

  private async mapaRiesgos(organizationId: string) {
    const risks = await this.prisma.territoryRiskAssessment.findMany({
      where: { organizationId },
      include: { farmUnit: { select: { farmCode: true, farmName: true } } },
    });
    return { reportId: 'FTIP-RPT-05', count: risks.length, items: risks };
  }

  private async mapaVisitas(organizationId: string) {
    const visits = await this.prisma.territoryVisitLink.findMany({
      where: { organizationId },
      include: { farmUnit: { select: { farmCode: true, farmName: true } } },
      orderBy: { visitedAt: 'desc' },
    });
    return { reportId: 'FTIP-RPT-06', count: visits.length, items: visits };
  }

  private async inventarioRecursos(organizationId: string) {
    const items = await this.prisma.naturalResourceFeature.findMany({ where: { organizationId } });
    return { reportId: 'FTIP-RPT-08', count: items.length, items };
  }

  private async infraestructura(organizationId: string) {
    const items = await this.prisma.infrastructureFeature.findMany({ where: { organizationId } });
    return { reportId: 'FTIP-RPT-09', count: items.length, items };
  }

  private async historialGeometria(organizationId: string, farmUnitId?: string) {
    const items = await this.prisma.geometryRevision.findMany({
      where: {
        organizationId,
        ...(farmUnitId ? { farmUnitId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
    return { reportId: 'FTIP-RPT-10', count: items.length, items };
  }

  private async cumplimientoCert(organizationId: string) {
    const certs = await this.prisma.territoryCertification.findMany({
      where: { organizationId, status: 'active' },
      include: { farmUnit: { select: { farmCode: true, agriculturalAreaHa: true } } },
    });
    return { reportId: 'FTIP-RPT-11', count: certs.length, items: certs };
  }

  private async sinPoligono(organizationId: string) {
    const farms = await this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['draft', 'under_validation', 'active'] },
        OR: [{ boundaryGeo: { equals: Prisma.DbNull } }],
      },
      select: { id: true, farmCode: true, farmName: true, status: true, registeredAt: true },
    });
    return { reportId: 'FTIP-RPT-14', count: farms.length, items: farms };
  }

  private async expedienteDocumental(organizationId: string) {
    const twins = await this.prisma.farmDigitalTwin.findMany({
      where: { organizationId },
      include: { farmUnit: { select: { farmCode: true, farmName: true } } },
    });
    return {
      reportId: 'FTIP-RPT-16',
      count: twins.length,
      items: twins.map((t) => ({
        farmCode: t.farmUnit.farmCode,
        farmName: t.farmUnit.farmName,
        documentCompletenessPct: t.documentCompletenessPct,
      })),
    };
  }
}
