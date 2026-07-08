import type { FlowContext } from '../domain/flow-context';
import type { FlowDecisionCandidate } from '../domain/flow-context';

export interface SubmissionFlowRule {
  id: string;
  priority: number;
  evaluate(context: FlowContext): FlowDecisionCandidate | null;
}
