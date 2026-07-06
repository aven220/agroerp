import { Injectable } from '@nestjs/common';
import {
  EACE_CONTRACTOR_TYPES, EACE_KNOWLEDGE_TYPES, EACE_LISTING_TYPES,
  EACE_ORG_TYPES, EACE_PROFILE_ROLES,
} from '../domain/eace.engine';
import { EaceAdvisorService } from './eace-advisor.service';
import { EaceApiService } from './eace-api.service';
import { EaceAuditService } from './eace-audit.service';
import { EaceBridgeService, EaceDashboardService } from './eace-dashboard.service';
import { EaceContractService } from './eace-contract.service';
import { EaceContractorService } from './eace-contractor.service';
import { EaceCooperativeService } from './eace-cooperative.service';
import { EaceExecutiveService } from './eace-executive.service';
import { EaceKnowledgeService } from './eace-knowledge.service';
import { EaceMarketplaceService } from './eace-marketplace.service';
import { EaceProducerService } from './eace-producer.service';

@Injectable()
export class EaceEngineService {
  constructor(
    private readonly dashboard: EaceDashboardService,
    private readonly producer: EaceProducerService,
    private readonly cooperative: EaceCooperativeService,
    private readonly contract: EaceContractService,
    private readonly contractor: EaceContractorService,
    private readonly advisor: EaceAdvisorService,
    private readonly marketplace: EaceMarketplaceService,
    private readonly api: EaceApiService,
    private readonly knowledge: EaceKnowledgeService,
    private readonly executive: EaceExecutiveService,
    private readonly bridge: EaceBridgeService,
    private readonly audit: EaceAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, producers, orgs, contracts] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.producer.listProfiles(organizationId),
      this.cooperative.listOrgs(organizationId),
      this.contract.listContracts(organizationId),
    ]);
    return {
      dashboard: dash,
      producers: producers.slice(0, 10),
      collaborativeOrgs: orgs.slice(0, 10),
      contracts: contracts.slice(0, 10),
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        orgTypes: EACE_ORG_TYPES,
        contractorTypes: EACE_CONTRACTOR_TYPES,
        listingTypes: EACE_LISTING_TYPES,
        knowledgeTypes: EACE_KNOWLEDGE_TYPES,
        profileRoles: EACE_PROFILE_ROLES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    const existing = await this.producer.listProfiles(organizationId);
    if (existing.length === 0) {
      await this.producer.registerProfile(organizationId, userId, {
        producerRef: 'PROD-DEMO', displayName: 'Productor Demo', region: 'default',
      });
    }
    const orgs = await this.cooperative.listOrgs(organizationId);
    if (orgs.length === 0) {
      await this.cooperative.createOrg(organizationId, userId, {
        orgType: 'cooperative', name: 'Cooperativa Demo',
      });
    }
    const knowledge = await this.knowledge.list(organizationId);
    if (knowledge.length === 0) {
      await this.knowledge.publish(organizationId, userId, {
        itemType: 'best_practice', title: 'Buenas prácticas agrícolas', category: 'general',
      });
    }
    await this.executive.snapshot(organizationId);
    await this.audit.log(organizationId, 'EacePlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
