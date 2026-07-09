import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { ProducerLifecycleService } from '@/core/prm/application/producer-lifecycle.service';
import { FarmLifecycleService } from '@/core/ftip/application/farm-lifecycle.service';
import { LotLifecycleService } from '@/core/fmdt/application/lot-lifecycle.service';

interface BridgeContext {
  organizationId: string;
  instanceId: string;
  workflowKey: string;
  resourceType: string | null;
  resourceId: string | null;
  transitionKey: string;
  toState: string;
  actorId: string;
  ctx?: RequestContext;
}

@Injectable()
export class WorkflowEntityLifecycleBridge {
  private readonly logger = new Logger(WorkflowEntityLifecycleBridge.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly producerLifecycle: ProducerLifecycleService,
    private readonly farmLifecycle: FarmLifecycleService,
    private readonly lotLifecycle: LotLifecycleService,
  ) {}

  async applyTransition(input: BridgeContext): Promise<void> {
    const entityId = await this.resolveEntityId(input);
    if (!entityId) return;

    const resourceType = (input.resourceType ?? '').toLowerCase();

    try {
      if (input.workflowKey === 'generic-approval' && resourceType === 'producer') {
        await this.applyProducerTransition(input, entityId);
        return;
      }
      if (input.workflowKey === 'technical-visit' && resourceType === 'farm') {
        await this.applyFarmTransition(input, entityId);
        return;
      }
      if (input.workflowKey === 'quality-inspection' && resourceType === 'field_lot') {
        await this.applyLotTransition(input, entityId);
      }
    } catch (err) {
      this.logger.warn(
        `Workflow lifecycle bridge skipped for ${input.workflowKey}/${input.transitionKey}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async resolveEntityId(input: BridgeContext): Promise<string | null> {
    if (input.resourceId) return input.resourceId;

    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: input.instanceId, organizationId: input.organizationId },
      select: { context: true },
    });
    const context = (instance?.context ?? {}) as Record<string, unknown>;
    return (
      (context.producerId as string | undefined) ??
      (context.farmId as string | undefined) ??
      (context.lotId as string | undefined) ??
      null
    );
  }

  private async applyProducerTransition(input: BridgeContext, producerId: string) {
    if (input.transitionKey === 'approve' && input.toState === 'approved') {
      await this.producerLifecycle.transition(
        input.organizationId,
        producerId,
        input.actorId,
        { toStatus: 'active', reasonNotes: 'Aprobado por workflow' },
        input.ctx,
      );
      return;
    }
    if (input.transitionKey === 'reject' && input.toState === 'rejected') {
      await this.producerLifecycle.transition(
        input.organizationId,
        producerId,
        input.actorId,
        { toStatus: 'pre_registered', reasonNotes: 'Rechazado por workflow' },
        input.ctx,
      );
    }
  }

  private async applyFarmTransition(input: BridgeContext, farmId: string) {
    if (input.transitionKey === 'close' && input.toState === 'closed') {
      await this.farmLifecycle.transition(
        input.organizationId,
        farmId,
        input.actorId,
        { toStatus: 'active', reasonNotes: 'Visita técnica cerrada' },
        input.ctx,
      );
    }
  }

  private async applyLotTransition(input: BridgeContext, lotId: string) {
    if (input.transitionKey === 'fail' && input.toState === 'failed') {
      await this.lotLifecycle.transition(
        input.organizationId,
        lotId,
        input.actorId,
        { toStatus: 'inactive', reasonNotes: 'Inspección no conforme' },
        input.ctx,
      );
    }
  }
}
