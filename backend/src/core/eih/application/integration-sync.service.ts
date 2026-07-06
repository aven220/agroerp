import { BadRequestException, Injectable } from '@nestjs/common';
import { EVENT_TYPES, EihSyncMode } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { IntegrationFlowService } from './integration-flow.service';
import { IntegrationConnectorService } from './integration-connector.service';
import { IntegrationTransformService } from './integration-transform.service';
import { IntegrationErrorService } from './integration-error.service';

@Injectable()
export class IntegrationSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly flows: IntegrationFlowService,
    private readonly connectors: IntegrationConnectorService,
    private readonly transforms: IntegrationTransformService,
    private readonly errors: IntegrationErrorService,
  ) {}

  listRuns(organizationId: string, limit = 100) {
    return this.prisma.eihSyncRun.findMany({
      where: { organizationId },
      include: { flow: true, connector: true, errors: { take: 5 } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async executeFlow(
    organizationId: string,
    flowKey: string,
    data: Record<string, unknown>[] = [],
  ) {
    const flow = await this.flows.findOne(organizationId, flowKey);
    if (flow.status !== 'published') {
      throw new BadRequestException(`Flujo ${flowKey} no está publicado`);
    }

    const runKey = `${flowKey}-${Date.now()}`;
    const startedAt = new Date();
    const run = await this.prisma.eihSyncRun.create({
      data: {
        organizationId,
        flowId: flow.id,
        connectorId: flow.sourceConnectorId,
        runKey,
        syncMode: flow.syncMode,
        status: 'running',
        startedAt,
        recordsIn: data.length,
      },
    });

    await this.core.emitUserAction(
      organizationId,
      'SyncRun',
      run.id,
      EVENT_TYPES.INTEGRATION_SYNC_STARTED,
      { flowKey, runKey },
    );

    let recordsOut = 0;
    let recordsFailed = 0;

    try {
      for (const row of data) {
        try {
          await this.transforms.applyFlowTransform(flow.id, row);
          recordsOut++;
        } catch (err) {
          recordsFailed++;
          await this.errors.record(organizationId, run.id, {
            errorKey: `row-${recordsFailed}`,
            message: err instanceof Error ? err.message : String(err),
            payload: row,
            connectorId: flow.sourceConnectorId ?? undefined,
          });
        }
      }

      const status = recordsFailed > 0 ? (recordsOut > 0 ? 'partial' : 'failed') : 'completed';
      const completedAt = new Date();
      const updated = await this.prisma.eihSyncRun.update({
        where: { id: run.id },
        data: {
          status,
          recordsOut,
          recordsFailed,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
      });

      if (flow.sourceConnectorId) {
        await this.prisma.eihConnector.update({
          where: { id: flow.sourceConnectorId },
          data: { lastSyncAt: completedAt, status: status === 'failed' ? 'error' : 'active' },
        });
      }

      await this.core.emitUserAction(
        organizationId,
        'SyncRun',
        run.id,
        status === 'failed' ? EVENT_TYPES.INTEGRATION_SYNC_FAILED : EVENT_TYPES.INTEGRATION_SYNC_COMPLETED,
        { flowKey, runKey, recordsOut, recordsFailed },
      );

      return updated;
    } catch (err) {
      await this.prisma.eihSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          errorSummary: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        },
      });
      await this.core.emitUserAction(organizationId, 'SyncRun', run.id, EVENT_TYPES.INTEGRATION_SYNC_FAILED, { flowKey });
      throw err;
    }
  }

  async executeConnectorSync(
    organizationId: string,
    connectorKey: string,
    syncMode: EihSyncMode,
    data: Record<string, unknown>[] = [],
  ) {
    const connector = await this.connectors.findOne(organizationId, connectorKey);
    const runKey = `${connectorKey}-${Date.now()}`;
    const startedAt = new Date();

    const run = await this.prisma.eihSyncRun.create({
      data: {
        organizationId,
        connectorId: connector.id,
        runKey,
        syncMode: syncMode as 'scheduled',
        status: 'running',
        startedAt,
        recordsIn: data.length,
      },
    });

    const recordsOut = data.length;
    const completedAt = new Date();
    const updated = await this.prisma.eihSyncRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        recordsOut,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    });

    await this.prisma.eihConnector.update({
      where: { id: connector.id },
      data: { lastSyncAt: completedAt, status: 'active' },
    });

    await this.core.emitUserAction(organizationId, 'SyncRun', run.id, EVENT_TYPES.INTEGRATION_SYNC_COMPLETED, {
      connectorKey,
      syncMode,
    });

    return updated;
  }
}
