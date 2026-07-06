import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { ObsAuditService } from './obs-audit.service';

@Injectable()
export class ObsIncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: ObsAuditService,
  ) {}

  list(organizationId: string, status?: string) {
    return this.prisma.eopIncident.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'open' } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async open(organizationId: string, userId: string, data: {
    incidentKey: string; title: string; description?: string; severity?: string;
    component?: string; serviceName?: string;
  }) {
    const incident = await this.prisma.eopIncident.create({
      data: {
        organizationId,
        incidentKey: data.incidentKey,
        title: data.title,
        description: data.description,
        severity: (data.severity ?? 'warning') as 'warning',
        component: data.component as 'backend' | undefined,
        serviceName: data.serviceName,
        timeline: [{ at: new Date().toISOString(), action: 'opened', by: userId }],
        createdBy: userId,
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'Incident',
      incident.id,
      EVENT_TYPES.OBSERVABILITY_INCIDENT_OPENED,
      { incidentKey: data.incidentKey },
    );
    await this.audit.log(organizationId, 'incident_opened', 'Incident', data.incidentKey, userId);
    return incident;
  }

  async updateStatus(organizationId: string, incidentKey: string, status: string, userId: string, note?: string) {
    const incident = await this.prisma.eopIncident.findFirst({
      where: { organizationId, incidentKey },
    });
    if (!incident) throw new NotFoundException(`Incidente ${incidentKey} no encontrado`);

    const timeline = (incident.timeline as Array<Record<string, unknown>>) ?? [];
    timeline.push({ at: new Date().toISOString(), action: status, by: userId, note });

    const updated = await this.prisma.eopIncident.update({
      where: { id: incident.id },
      data: {
        status: status as 'open',
        timeline: timeline as object,
        ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date() } : {}),
      },
    });

    if (status === 'resolved' || status === 'closed') {
      await this.core.emitUserAction(
        organizationId,
        'Incident',
        incident.id,
        EVENT_TYPES.OBSERVABILITY_INCIDENT_RESOLVED,
        { incidentKey },
      );
    }
    await this.audit.log(organizationId, `incident_${status}`, 'Incident', incidentKey, userId);
    return updated;
  }

  timeline(organizationId: string, limit = 50) {
    return this.prisma.eopIncident.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        incidentKey: true,
        title: true,
        status: true,
        severity: true,
        timeline: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
