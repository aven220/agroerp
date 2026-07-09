import { startWorkflowInstance } from '../api/workflows';

export async function startProducerApprovalWorkflow(
  producerId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await startWorkflowInstance({
      workflowKey: 'generic-approval',
      resourceId: producerId,
      resourceType: 'producer',
      context: { producerId, ...context },
      priority: 'normal',
    });
  } catch {
    /* El workflow puede no existir en todos los entornos */
  }
}

export async function startFarmApprovalWorkflow(
  farmId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await startWorkflowInstance({
      workflowKey: 'technical-visit',
      resourceId: farmId,
      resourceType: 'farm',
      context: { farmId, ...context },
    });
  } catch {
    /* opcional */
  }
}

export async function startLotApprovalWorkflow(
  lotId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await startWorkflowInstance({
      workflowKey: 'quality-inspection',
      resourceId: lotId,
      resourceType: 'field_lot',
      context: { lotId, ...context },
    });
  } catch {
    /* opcional */
  }
}
