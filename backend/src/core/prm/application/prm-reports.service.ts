import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export interface ReportFilters {
  lifecycleStatus?: string;
  municipalityCode?: string;
  assignedBuyerId?: string;
  assignedTechnicianId?: string;
  fromDate?: string;
  toDate?: string;
  segmentId?: string;
  schemeCode?: string;
}

@Injectable()
export class PrmReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async padron(organizationId: string, filters: ReportFilters = {}) {
    const producers = await this.prisma.producer.findMany({
      where: this.buildWhere(organizationId, filters),
      select: {
        producerNumber: true,
        legalName: true,
        documentNumber: true,
        lifecycleStatus: true,
        municipalityCode: true,
        categoryCode: true,
        assignedBuyerId: true,
        assignedTechnicianId: true,
        qualityScore: true,
        registeredAt: true,
        activatedAt: true,
      },
      orderBy: { producerNumber: 'asc' },
    });
    return { reportId: 'REP-PRM-01', count: producers.length, items: producers };
  }

  async altasPorPeriodo(organizationId: string, filters: ReportFilters = {}) {
    const from = filters.fromDate
      ? new Date(filters.fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = filters.toDate ? new Date(filters.toDate) : new Date();

    const producers = await this.prisma.producer.findMany({
      where: {
        ...this.buildWhere(organizationId, filters),
        activatedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        producerNumber: true,
        legalName: true,
        activatedAt: true,
        municipalityCode: true,
        assignedBuyerId: true,
      },
      orderBy: { activatedAt: 'desc' },
    });
    return { reportId: 'REP-PRM-02', from, to, count: producers.length, items: producers };
  }

  async porEstadoLifecycle(organizationId: string) {
    const grouped = await this.prisma.producer.groupBy({
      by: ['lifecycleStatus'],
      where: { organizationId, deletedAt: null },
      _count: true,
    });
    return {
      reportId: 'REP-PRM-03',
      items: grouped.map((g) => ({
        lifecycleStatus: g.lifecycleStatus,
        count: g._count,
      })),
    };
  }

  async carteraPorComprador(organizationId: string, filters: ReportFilters = {}) {
    const grouped = await this.prisma.producer.groupBy({
      by: ['assignedBuyerId'],
      where: {
        organizationId,
        deletedAt: null,
        assignedBuyerId: { not: null },
        ...(filters.municipalityCode
          ? { municipalityCode: filters.municipalityCode }
          : {}),
      },
      _count: true,
    });
    return {
      reportId: 'REP-PRM-04',
      items: grouped.map((g) => ({
        buyerId: g.assignedBuyerId,
        producerCount: g._count,
      })),
    };
  }

  async carteraPorTecnico(organizationId: string, filters: ReportFilters = {}) {
    const grouped = await this.prisma.producer.groupBy({
      by: ['assignedTechnicianId'],
      where: {
        organizationId,
        deletedAt: null,
        assignedTechnicianId: { not: null },
        ...(filters.municipalityCode
          ? { municipalityCode: filters.municipalityCode }
          : {}),
      },
      _count: true,
    });
    return {
      reportId: 'REP-PRM-05',
      items: grouped.map((g) => ({
        technicianId: g.assignedTechnicianId,
        producerCount: g._count,
      })),
    };
  }

  async certificacionesPorVencer(organizationId: string, days = 90) {
    const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const certs = await this.prisma.producerCertification.findMany({
      where: {
        organizationId,
        deletedAt: null,
        expiresAt: { lte: deadline, gte: new Date() },
      },
      include: {
        producer: {
          select: {
            id: true,
            producerNumber: true,
            legalName: true,
            municipalityCode: true,
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
    return { reportId: 'REP-PRM-06', days, count: certs.length, items: certs };
  }

  async segmentoProductores(organizationId: string, segmentId: string) {
    const memberships = await this.prisma.producerSegmentMembership.findMany({
      where: { organizationId, segmentId },
      include: {
        producer: {
          select: {
            id: true,
            producerNumber: true,
            legalName: true,
            lifecycleStatus: true,
            municipalityCode: true,
          },
        },
        segment: { select: { name: true, slug: true } },
      },
    });
    return {
      reportId: 'REP-PRM-07',
      segment: memberships[0]?.segment,
      count: memberships.length,
      items: memberships.map((m) => m.producer),
    };
  }

  private buildWhere(organizationId: string, filters: ReportFilters) {
    return {
      organizationId,
      deletedAt: null,
      ...(filters.lifecycleStatus
        ? { lifecycleStatus: filters.lifecycleStatus as never }
        : {}),
      ...(filters.municipalityCode
        ? { municipalityCode: filters.municipalityCode }
        : {}),
      ...(filters.assignedBuyerId
        ? { assignedBuyerId: filters.assignedBuyerId }
        : {}),
      ...(filters.assignedTechnicianId
        ? { assignedTechnicianId: filters.assignedTechnicianId }
        : {}),
    };
  }
}
