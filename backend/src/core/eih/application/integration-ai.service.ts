import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { suggestMappings } from '../domain/field-map.engine';

@Injectable()
export class IntegrationAiService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(organizationId: string) {
    const suggestions: Array<Record<string, unknown>> = [];

    const failedSyncs = await this.prisma.eihSyncRun.findMany({
      where: { organizationId, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const run of failedSyncs) {
      suggestions.push({
        type: 'integration_error_detection',
        runKey: run.runKey,
        recommendation: 'Revisar mapeo de campos y credenciales del conector origen',
      });
    }

    const slowSyncs = await this.prisma.eihSyncRun.findMany({
      where: { organizationId, durationMs: { gt: 30_000 } },
      orderBy: { durationMs: 'desc' },
      take: 5,
    });
    for (const run of slowSyncs) {
      suggestions.push({
        type: 'sync_optimization',
        runKey: run.runKey,
        durationMs: run.durationMs,
        recommendation: 'Considerar sincronización incremental o procesamiento por lotes',
      });
    }

    const flows = await this.prisma.eihIntegrationFlow.findMany({
      where: { organizationId, status: 'published' },
      include: { fieldMappings: true },
      take: 10,
    });
    for (const flow of flows) {
      if (flow.fieldMappings.length === 0) {
        suggestions.push({
          type: 'field_mapping_suggestion',
          flowKey: flow.flowKey,
          recommendation: 'Definir mapeo de campos para evitar errores de transformación',
        });
      }
    }

    const errorConnectors = await this.prisma.eihConnector.findMany({
      where: { organizationId, status: 'error', deletedAt: null },
      take: 5,
    });
    for (const c of errorConnectors) {
      suggestions.push({
        type: 'connector_health',
        connectorKey: c.connectorKey,
        recommendation: 'Rotar credenciales y verificar endpoint TLS',
      });
    }

    return suggestions.slice(0, 20);
  }

  suggestFieldMappings(sourceFields: string[], targetFields: string[]) {
    return suggestMappings(sourceFields, targetFields);
  }

  performanceAnalysis(organizationId: string) {
    return this.prisma.eihSyncRun.groupBy({
      by: ['status'],
      where: { organizationId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      _count: { id: true },
      _avg: { durationMs: true },
    });
  }
}
