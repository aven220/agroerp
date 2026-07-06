import { Injectable } from '@nestjs/common';
import {
  EACC_AUDIT_TYPES, EACC_CERTIFICATION_TYPES, EACC_DOC_TYPES, EACC_ESG_PILLARS,
  EACC_FINDING_TYPES, EACC_FOOTPRINT_TYPES, EACC_SUSTAINABILITY_CATEGORIES,
} from '../domain/eacc.engine';
import { EaccAuditService } from './eacc-audit.service';
import { EaccBridgeService, EaccDashboardService } from './eacc-dashboard.service';
import { EaccCertificationService } from './eacc-certification.service';
import { EaccComplianceService } from './eacc-compliance.service';
import { EaccInspectionService } from './eacc-inspection.service';
import { EaccDocumentService } from './eacc-sustainability.service';
import { EaccSafetyService, EaccSustainabilityService } from './eacc-sustainability.service';

@Injectable()
export class EaccEngineService {
  constructor(
    private readonly dashboard: EaccDashboardService,
    private readonly certification: EaccCertificationService,
    private readonly compliance: EaccComplianceService,
    private readonly inspection: EaccInspectionService,
    private readonly sustainability: EaccSustainabilityService,
    private readonly safety: EaccSafetyService,
    private readonly documents: EaccDocumentService,
    private readonly bridge: EaccBridgeService,
    private readonly audit: EaccAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, frameworks, certifications, alerts, findings] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.certification.listFrameworks(organizationId),
      this.certification.listCertifications(organizationId),
      this.compliance.listAlerts(organizationId),
      this.inspection.listFindings(organizationId),
    ]);
    return {
      dashboard: dash,
      frameworks,
      certifications,
      activeAlerts: alerts,
      openFindings: findings,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        certificationTypes: EACC_CERTIFICATION_TYPES,
        auditTypes: EACC_AUDIT_TYPES,
        findingTypes: EACC_FINDING_TYPES,
        sustainabilityCategories: EACC_SUSTAINABILITY_CATEGORIES,
        esgPillars: EACC_ESG_PILLARS,
        footprintTypes: EACC_FOOTPRINT_TYPES,
        docTypes: EACC_DOC_TYPES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    const defaults: Array<{ code: string; name: string; frameworkType: string }> = [
      { code: 'GGAP', name: 'GlobalG.A.P.', frameworkType: 'global_gap' },
      { code: 'ORG', name: 'Producción Orgánica', frameworkType: 'organic' },
      { code: 'RA', name: 'Rainforest Alliance', frameworkType: 'rainforest_alliance' },
      { code: 'FT', name: 'Fairtrade', frameworkType: 'fairtrade' },
      { code: 'BPA', name: 'Buenas Prácticas Agrícolas', frameworkType: 'bpa' },
      { code: 'BPM', name: 'Buenas Prácticas de Manufactura', frameworkType: 'bpm' },
    ];
    for (const fw of defaults) {
      const existing = await this.certification.listFrameworks(organizationId);
      if (!existing.some((f) => f.code === fw.code)) {
        await this.certification.registerFramework(organizationId, fw);
      }
    }
    for (const cat of EACC_SUSTAINABILITY_CATEGORIES) {
      const indicators = await this.sustainability.listIndicators(organizationId, cat);
      if (indicators.length === 0) {
        await this.sustainability.registerIndicator(organizationId, { category: cat, name: `Indicador ${cat}`, unit: 'units' });
      }
    }
    for (const pillar of EACC_ESG_PILLARS) {
      const objs = await this.sustainability.listEsgObjectives(organizationId);
      if (!objs.some((o) => o.pillar === pillar)) {
        await this.sustainability.setEsgObjective(organizationId, userId, { pillar, title: `Objetivo ${pillar}` });
      }
    }
    for (const ft of EACC_FOOTPRINT_TYPES) {
      const configs = await this.sustainability.listFootprintConfigs(organizationId, ft);
      if (configs.length === 0) {
        await this.sustainability.registerFootprintConfig(organizationId, { footprintType: ft, name: `Huella ${ft}`, unit: 'tCO2e' });
      }
    }
    await this.audit.log(organizationId, 'EaccPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
