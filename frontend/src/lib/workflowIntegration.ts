import { startWorkflowInstance, executeWorkflowTransition } from '../api/workflows';
import { notifyEntityUpdated } from './entitySync';

async function advanceWorkflowInstance(instanceId: string, transitionKey: string) {
  await executeWorkflowTransition(instanceId, { transitionKey });
}

export async function startProducerApprovalWorkflow(
  producerId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const instance = await startWorkflowInstance({
    workflowKey: 'generic-approval',
    resourceId: producerId,
    resourceType: 'producer',
    context: { producerId, ...context },
    priority: 'normal',
  });
  await advanceWorkflowInstance(instance.id, 'submit');
  notifyEntityUpdated('workflow', instance.id);
}

export async function startFarmApprovalWorkflow(
  farmId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const instance = await startWorkflowInstance({
    workflowKey: 'technical-visit',
    resourceId: farmId,
    resourceType: 'farm',
    context: { farmId, ...context },
  });
  await advanceWorkflowInstance(instance.id, 'start_visit');
  notifyEntityUpdated('workflow', instance.id);
}

export async function startLotApprovalWorkflow(
  lotId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const instance = await startWorkflowInstance({
    workflowKey: 'quality-inspection',
    resourceId: lotId,
    resourceType: 'field_lot',
    context: { lotId, ...context },
  });
  await advanceWorkflowInstance(instance.id, 'start');
  notifyEntityUpdated('workflow', instance.id);
}
