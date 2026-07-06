import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgQmsCapaStatus, EmfgQmsCapaType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { validateCapaTransition } from '../domain/emfg-qms.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgQmsIntegrationService } from './emfg-qms-integration.service';

@Injectable()
export class EmfgQmsCapaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgQmsIntegrationService,
  ) {}

  list(organizationId: string, capaType?: EmfgQmsCapaType) {
    return this.prisma.emfgQmsCapaAction.findMany({
      where: { organizationId, ...(capaType ? { capaType } : {}) },
      include: { verifications: { orderBy: { verifiedAt: 'desc' } }, nc: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  get(organizationId: string, capaKey: string) {
    return this.prisma.emfgQmsCapaAction.findUnique({
      where: { organizationId_capaKey: { organizationId, capaKey } },
      include: { verifications: { orderBy: { verifiedAt: 'desc' } }, nc: true },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    ncKey?: string; capaType: EmfgQmsCapaType; title: string; actionPlan: string;
    responsibleKey?: string; dueDate?: string;
  }) {
    const seq = await this.prisma.emfgQmsCapaAction.count({ where: { organizationId } });
    const capaKey = generateEmfgKey('CP', seq + 1);

    const capa = await this.prisma.emfgQmsCapaAction.create({
      data: {
        organizationId,
        capaKey,
        ncKey: payload.ncKey,
        capaType: payload.capaType,
        title: payload.title,
        actionPlan: payload.actionPlan,
        responsibleKey: payload.responsibleKey,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        createdBy: userId,
      },
    });

    if (payload.ncKey) {
      await this.prisma.emfgQmsNonConformance.update({
        where: { organizationId_ncKey: { organizationId, ncKey: payload.ncKey } },
        data: { status: 'in_progress' },
      });
    }

    await this.audit.log(organizationId, 'EmfgQmsCapaAction', capaKey, 'capa_created', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgQmsCapaAction', capaKey, EVENT_TYPES.EMFG_QMS_CAPA_CREATED, payload);
    await this.integration.onCapaCreated(organizationId, capaKey, payload);
    return capa;
  }

  async updateStatus(organizationId: string, userId: string, capaKey: string, status: EmfgQmsCapaStatus) {
    const capa = await this.get(organizationId, capaKey);
    if (!capa) throw new NotFoundException('capa_not_found');
    if (!validateCapaTransition(capa.status, status)) throw new BadRequestException('invalid_capa_transition');

    return this.prisma.emfgQmsCapaAction.update({
      where: { organizationId_capaKey: { organizationId, capaKey } },
      data: {
        status,
        ...(status === 'closed' ? { completedAt: new Date() } : {}),
      },
    });
  }

  async verify(organizationId: string, userId: string, capaKey: string, payload: { effective: boolean; notes?: string }) {
    const capa = await this.get(organizationId, capaKey);
    if (!capa) throw new NotFoundException('capa_not_found');

    const seq = await this.prisma.emfgQmsCapaVerification.count({ where: { organizationId } });
    const verificationKey = generateEmfgKey('CV', seq + 1);

    const [verification] = await this.prisma.$transaction([
      this.prisma.emfgQmsCapaVerification.create({
        data: {
          organizationId,
          verificationKey,
          capaKey,
          effective: payload.effective,
          notes: payload.notes,
          verifiedBy: userId,
        },
      }),
      this.prisma.emfgQmsCapaAction.update({
        where: { organizationId_capaKey: { organizationId, capaKey } },
        data: { status: payload.effective ? 'closed' : 'in_progress', completedAt: payload.effective ? new Date() : undefined },
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgQmsCapaAction', capaKey, 'capa_verified', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgQmsCapaAction', capaKey, EVENT_TYPES.EMFG_QMS_CAPA_VERIFIED, payload);
    return verification;
  }
}
