import { Injectable } from '@nestjs/common';
import { EpscmCollabAiService } from './epscm-collab-ai.service';
import { EpscmCollabAnalyticsService } from './epscm-collab-analytics.service';
import { EpscmCollabCollaborationService } from './epscm-collab-collaboration.service';
import { EpscmCollabPartnerService } from './epscm-collab-partner.service';
import { EpscmCollabSlaService } from './epscm-collab-sla.service';
import { EpscmCollabSimulationService } from './epscm-collab-simulation.service';

@Injectable()
export class EpscmCollabEngineService {
  constructor(
    private readonly partner: EpscmCollabPartnerService,
    private readonly sla: EpscmCollabSlaService,
    private readonly collaboration: EpscmCollabCollaborationService,
    private readonly analytics: EpscmCollabAnalyticsService,
    private readonly simulation: EpscmCollabSimulationService,
    private readonly ai: EpscmCollabAiService,
  ) {}

  async center(organizationId: string) {
    const [partners, slaCenter, collab, indicators] = await Promise.all([
      this.partner.list(organizationId),
      this.sla.center(organizationId),
      this.collaboration.center(organizationId),
      this.analytics.executiveDashboard(organizationId),
    ]);
    return { partners, sla: slaCenter, collaboration: collab, indicators };
  }

  async bootstrap(organizationId: string, userId: string) {
    const partners = await this.partner.seed(organizationId, userId);
    const supplier = partners.find((p) => p.partnerType === 'supplier');
    const operator = partners.find((p) => p.partnerType === 'operator');

    if (supplier) {
      const contract = await this.sla.createContract(organizationId, userId, {
        partnerKey: supplier.partnerKey,
        code: 'CTR-01',
        name: 'Contrato Logístico Principal',
        startDate: new Date(),
      });
      await this.sla.createSla(organizationId, userId, contract.contractKey, 'Entrega a tiempo', 95);
    }

    await this.ai.bootstrapArchitecture(organizationId);
    return this.center(organizationId);
  }
}
