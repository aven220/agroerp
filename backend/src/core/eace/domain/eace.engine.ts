export function generateEaceKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EACE_ORG_TYPES = ['cooperative', 'association', 'producer_group'] as const;
export const EACE_CONTRACTOR_TYPES = [
  'contractor_company', 'service_provider', 'machinery_operator',
  'applicator', 'transporter', 'consultant', 'specialist',
];
export const EACE_LISTING_TYPES = [
  'input_purchase', 'product_sale', 'ag_service', 'tech_service', 'machinery_rental', 'labor_hire',
];
export const EACE_KNOWLEDGE_TYPES = ['manual', 'best_practice', 'course', 'training', 'news', 'bulletin', 'multimedia'];
export const EACE_PROFILE_ROLES = ['producer', 'cooperative', 'contractor', 'advisor', 'executive', 'admin'];

export const EACE_MODULE_SLOTS = [
  'eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'effm', 'eaip',
  'eaidsp', 'ebiap', 'eims', 'escm', 'epscm', 'eam', 'efm', 'eint', 'eiamp',
];

export function computeContractCompliance(metrics: Array<{ targetValue?: number; actualValue?: number }>) {
  if (metrics.length === 0) return { compliancePct: 100, compliant: 0, total: 0 };
  let compliant = 0;
  for (const m of metrics) {
    if (m.targetValue != null && m.actualValue != null && m.actualValue >= m.targetValue) compliant++;
    else if (m.targetValue == null) compliant++;
  }
  const compliancePct = Math.round((compliant / metrics.length) * 100);
  return { compliancePct, compliant, total: metrics.length };
}

export function computeContractorRating(scores: number[]) {
  if (scores.length === 0) return { rating: 0, count: 0 };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { rating: Math.round(avg * 100) / 100, count: scores.length };
}

export function aggregateEaceIndicators(data: {
  activeProducers: number;
  collaborativeOrgs: number;
  activeContracts: number;
  contractors: number;
  advisors: number;
  marketplaceListings: number;
  knowledgeItems: number;
  openVisits: number;
  criticalAlerts: number;
  contractComplianceAvg: number;
}) {
  const ecosystemScore = Math.min(
    100,
    data.activeProducers * 2 + data.collaborativeOrgs * 5 + data.activeContracts * 4 +
      data.contractors * 2 + data.advisors * 3 + data.marketplaceListings +
      Math.min(20, data.knowledgeItems) + Math.round(data.contractComplianceAvg / 5),
  );
  return { ...data, ecosystemScore, ecosystemReady: ecosystemScore >= 35 };
}

export function buildExecutiveIndicators(data: {
  productionTons?: number;
  yieldPerHa?: number;
  profitabilityIndex?: number;
  cropHealthPct?: number;
  phytosanitaryStatus?: string;
  resourceUsageIndex?: number;
  compliancePct?: number;
  esgScore?: number;
  criticalAlerts?: number;
}) {
  return {
    production: data.productionTons ?? 0,
    yield: data.yieldPerHa ?? 0,
    profitability: data.profitabilityIndex ?? 0,
    cropStatus: data.cropHealthPct ?? 0,
    phytosanitary: data.phytosanitaryStatus ?? 'stable',
    resourceUsage: data.resourceUsageIndex ?? 0,
    compliance: data.compliancePct ?? 0,
    esg: data.esgScore ?? 0,
    criticalAlerts: data.criticalAlerts ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

export function resolveProfileAccess(role: string, resource: string): boolean {
  const matrix: Record<string, string[]> = {
    producer: ['producers', 'contracts', 'notifications', 'indicators'],
    cooperative: ['cooperatives', 'groups', 'programs', 'indicators'],
    contractor: ['contractors', 'evaluations', 'marketplace'],
    advisor: ['advisors', 'visits', 'recommendations'],
    executive: ['executive', 'analytics', 'alerts', 'contracts', 'cooperatives'],
    admin: ['*'],
  };
  const allowed = matrix[role] ?? [];
  return allowed.includes('*') || allowed.includes(resource);
}

export function hashApiKeyPreview(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return `eace_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}
