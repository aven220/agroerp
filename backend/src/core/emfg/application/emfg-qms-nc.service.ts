import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgQmsNcSeverity, EmfgQmsNcStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgQmsIntegrationService } from './emfg-qms-integration.service';

@Injectable()
export class EmfgQmsNcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgQmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EmfgQmsNcStatus) {
    return this.prisma.emfgQmsNonConformance.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { capaActions: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  get(organizationId: string, ncKey: string) {
    return this.prisma.emfgQmsNonConformance.findUnique({
      where: { organizationId_ncKey: { organizationId, ncKey } },
      include: { capaActions: { include: { verifications: true } }, inspection: true },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    inspectionKey?: string; lotKey?: string; orderKey?: string; itemKey?: string;
    supplierKey?: string; classification: string; severity: EmfgQmsNcSeverity;
    origin: string; impact?: string; description: string; responsibleKey?: string;
  }) {
    const seq = await this.prisma.emfgQmsNonConformance.count({ where: { organizationId } });
    const ncKey = generateEmfgKey('NC', seq + 1);

    const nc = await this.prisma.emfgQmsNonConformance.create({
      data: {
        organizationId,
        ncKey,
        inspectionKey: payload.inspectionKey,
        lotKey: payload.lotKey,
        orderKey: payload.orderKey,
        itemKey: payload.itemKey,
        supplierKey: payload.supplierKey,
        classification: payload.classification,
        severity: payload.severity,
        origin: payload.origin,
        impact: payload.impact,
        description: payload.description,
        responsibleKey: payload.responsibleKey,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgQmsNonConformance', ncKey, 'nc_created', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgQmsNonConformance', ncKey, EVENT_TYPES.EMFG_QMS_NC_CREATED, payload);
    await this.integration.onNcCreated(organizationId, ncKey, payload);
    return nc;
  }

  async updateStatus(organizationId: string, userId: string, ncKey: string, status: EmfgQmsNcStatus) {
    const nc = await this.get(organizationId, ncKey);
    if (!nc) throw new NotFoundException('nc_not_found');
    if (nc.status === 'closed') throw new BadRequestException('nc_already_closed');

    return this.prisma.emfgQmsNonConformance.update({
      where: { organizationId_ncKey: { organizationId, ncKey } },
      data: {
        status,
        ...(status === 'closed' ? { closedBy: userId, closedAt: new Date() } : {}),
      },
    });
  }

  async close(organizationId: string, userId: string, ncKey: string) {
    const nc = await this.updateStatus(organizationId, userId, ncKey, 'closed');
    await this.audit.log(organizationId, 'EmfgQmsNonConformance', ncKey, 'nc_closed', userId);
    await this.core.emitUserAction(organizationId, 'EmfgQmsNonConformance', ncKey, EVENT_TYPES.EMFG_QMS_NC_CLOSED, {});
    return nc;
  }
}
