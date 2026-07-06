import { Injectable } from '@nestjs/common';
import { EamIncidentSeverity, EamIncidentType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';

@Injectable()
export class EamIncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamCmmsIntegrationService,
  ) {}

  list(organizationId: string, resolved?: boolean) {
    return this.prisma.eamIncident.findMany({
      where: {
        organizationId,
        ...(resolved === false ? { resolvedAt: null } : resolved === true ? { resolvedAt: { not: null } } : {}),
      },
      orderBy: { reportedAt: 'desc' },
    });
  }

  async report(
    organizationId: string,
    userId: string,
    assetKey: string,
    incidentType: EamIncidentType,
    title: string,
    severity: EamIncidentSeverity,
    description?: string,
    impact?: string,
  ) {
    const seq = await this.prisma.eamIncident.count({ where: { organizationId } });
    const row = await this.prisma.eamIncident.create({
      data: {
        organizationId,
        incidentKey: generateEamCmmsKey('INC', seq + 1),
        assetKey,
        incidentType,
        title,
        severity,
        description,
        impact,
        reportedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EamIncident', row.incidentKey, 'incident_reported', userId);
    await this.integration.onIncidentReported(organizationId, row.id, row.incidentKey, assetKey, severity);
    return row;
  }

  async resolve(organizationId: string, userId: string, incidentKey: string) {
    const inc = await this.prisma.eamIncident.findFirst({ where: { organizationId, incidentKey } });
    if (!inc) return null;
    return this.prisma.eamIncident.update({
      where: { id: inc.id },
      data: { resolvedAt: new Date() },
    });
  }
}
