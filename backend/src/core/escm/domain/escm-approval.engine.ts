export type ApprovalTriggerType =
  | 'credit_exceeded'
  | 'high_discount'
  | 'high_value'
  | 'exceptional_terms'
  | 'manual';

export type ApprovalPolicy = {
  policyKey: string;
  triggerType: ApprovalTriggerType | string;
  thresholdValue?: number | null;
  thresholdPct?: number | null;
  approvalLevels: number;
  isActive: boolean;
};

export type ApprovalEvaluationInput = {
  orderTotal: number;
  discountPct: number;
  creditExceeded: boolean;
  hasExceptionalTerms: boolean;
  policies: ApprovalPolicy[];
};

export type ApprovalRequirement = {
  required: boolean;
  triggers: ApprovalTriggerType[];
  maxLevels: number;
  reasons: string[];
};

export function evaluateApprovalPolicies(input: ApprovalEvaluationInput): ApprovalRequirement {
  const triggers: ApprovalTriggerType[] = [];
  const reasons: string[] = [];
  let maxLevels = 0;

  for (const policy of input.policies.filter((p) => p.isActive)) {
    let matched = false;
    switch (policy.triggerType) {
      case 'credit_exceeded':
        matched = input.creditExceeded;
        if (matched) reasons.push('Crédito excedido');
        break;
      case 'high_discount':
        matched =
          policy.thresholdPct != null && input.discountPct > policy.thresholdPct;
        if (matched) reasons.push(`Descuento ${input.discountPct}% supera umbral`);
        break;
      case 'high_value':
        matched =
          policy.thresholdValue != null && input.orderTotal >= policy.thresholdValue;
        if (matched) reasons.push(`Monto ${input.orderTotal} supera umbral`);
        break;
      case 'exceptional_terms':
        matched = input.hasExceptionalTerms;
        if (matched) reasons.push('Condiciones excepcionales');
        break;
      default:
        break;
    }
    if (matched) {
      triggers.push(policy.triggerType as ApprovalTriggerType);
      maxLevels = Math.max(maxLevels, policy.approvalLevels);
    }
  }

  return {
    required: triggers.length > 0,
    triggers,
    maxLevels: Math.max(maxLevels, triggers.length > 0 ? 1 : 0),
    reasons,
  };
}

export function nextApprovalLevel(
  currentLevel: number,
  maxLevels: number,
  decision: 'approved' | 'rejected',
): { complete: boolean; nextLevel: number } {
  if (decision === 'rejected') return { complete: true, nextLevel: currentLevel };
  if (currentLevel >= maxLevels) return { complete: true, nextLevel: currentLevel };
  return { complete: false, nextLevel: currentLevel + 1 };
}

export function canUserApproveAtLevel(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel;
}

export const DEFAULT_APPROVAL_POLICIES: Omit<ApprovalPolicy, 'policyKey'>[] = [
  {
    triggerType: 'credit_exceeded',
    approvalLevels: 2,
    isActive: true,
    thresholdValue: null,
    thresholdPct: null,
  },
  {
    triggerType: 'high_discount',
    approvalLevels: 1,
    isActive: true,
    thresholdPct: 15,
    thresholdValue: null,
  },
  {
    triggerType: 'high_value',
    approvalLevels: 2,
    isActive: true,
    thresholdValue: 50_000_000,
    thresholdPct: null,
  },
  {
    triggerType: 'exceptional_terms',
    approvalLevels: 2,
    isActive: true,
    thresholdValue: null,
    thresholdPct: null,
  },
];
