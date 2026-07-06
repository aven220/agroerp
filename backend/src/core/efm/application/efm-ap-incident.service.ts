import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { generateApKey } from '../domain/efm-ap.engine';

@Injectable()
export class EfmApIncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string, filters?: { supplierKey?: string; status?: string }) {
    return this.prisma.efmApIncident.findMany({
      where: {
        organizationId,
        ...(filters?.supplierKey ? { supplierKey: filters.supplierKey } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      supplierKey: string;
      description: string;
      invoiceKey?: string;
      paymentKey?: string;
    },
  ) {
    const count = await this.prisma.efmApIncident.count({ where: { organizationId } });
    const incidentKey = generateApKey('APINC', count + 1);

    const row = await this.prisma.efmApIncident.create({
      data: {
        organizationId,
        incidentKey,
        supplierKey: input.supplierKey,
        invoiceKey: input.invoiceKey,
        paymentKey: input.paymentKey,
        description: input.description,
        reportedBy: userId,
        status: 'open',
      },
    });

    await this.audit.log(organizationId, 'EfmApIncident', incidentKey, 'reported', userId);
    return row;
  }

  async resolve(organizationId: string, incidentKey: string, userId: string, resolution: string) {
    const row = await this.prisma.efmApIncident.findFirst({ where: { organizationId, incidentKey } });
    if (!row) throw new NotFoundException(`Incidencia ${incidentKey} no encontrada`);

    const updated = await this.prisma.efmApIncident.update({
      where: { id: row.id },
      data: {
        status: 'resolved',
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'EfmApIncident', incidentKey, 'resolved', userId);
    return updated;
  }
}
