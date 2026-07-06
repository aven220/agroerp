import { Injectable } from '@nestjs/common';
import {
  EPHP_COMPLIANCE_TYPES,
  EPHP_INFESTATION_LEVELS,
  EPHP_IPM_METHODS,
  EPHP_PEST_CLASSIFICATIONS,
  EPHP_TREATMENT_TYPES,
} from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';
import { EphpAlertService } from './ephp-alert.service';
import { EphpComplianceService, EphpIntervalService, EphpMrlService } from './ephp-compliance.service';
import { EphpBridgeService, EphpDashboardService, EphpOfflineService } from './ephp-dashboard.service';
import { EphpDiseaseService } from './ephp-disease.service';
import { EphpIpmService } from './ephp-ipm.service';
import { EphpMonitoringService } from './ephp-monitoring.service';
import { EphpPestService } from './ephp-pest.service';
import { EphpApplicationService, EphpTreatmentService } from './ephp-treatment.service';

export { EphpOfflineService } from './ephp-dashboard.service';

@Injectable()
export class EphpEngineService {
  constructor(
    private readonly dashboard: EphpDashboardService,
    private readonly pests: EphpPestService,
    private readonly diseases: EphpDiseaseService,
    private readonly monitoring: EphpMonitoringService,
    private readonly treatments: EphpTreatmentService,
    private readonly applications: EphpApplicationService,
    private readonly ipm: EphpIpmService,
    private readonly intervals: EphpIntervalService,
    private readonly mrl: EphpMrlService,
    private readonly compliance: EphpComplianceService,
    private readonly alerts: EphpAlertService,
    private readonly bridge: EphpBridgeService,
    private readonly audit: EphpAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, pestCatalog, diseaseCatalog, treatments, ipmPlans, frameworks, activeAlerts] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.pests.listCatalog(organizationId),
      this.diseases.listCatalog(organizationId),
      this.treatments.list(organizationId),
      this.ipm.listPlans(organizationId),
      this.compliance.listFrameworks(organizationId),
      this.alerts.listActive(organizationId),
    ]);
    return {
      dashboard: dash,
      pestCatalog,
      diseaseCatalog,
      treatments,
      ipmPlans,
      frameworks,
      activeAlerts,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        pestClassifications: EPHP_PEST_CLASSIFICATIONS,
        infestationLevels: EPHP_INFESTATION_LEVELS,
        treatmentTypes: EPHP_TREATMENT_TYPES,
        ipmMethods: EPHP_IPM_METHODS,
        complianceTypes: EPHP_COMPLIANCE_TYPES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    for (const frameworkType of EPHP_COMPLIANCE_TYPES) {
      await this.compliance.registerFramework(organizationId, {
        name: frameworkType.toUpperCase(),
        frameworkType,
      });
    }
    await this.audit.log(organizationId, 'EphpPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
