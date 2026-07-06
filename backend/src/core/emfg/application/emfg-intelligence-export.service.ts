import { Injectable } from '@nestjs/common';
import { EmfgIntelligenceExportFormat } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EmfgAuditService } from './emfg-audit.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { buildExportRows } from '../domain/emfg-intelligence.engine';

@Injectable()
export class EmfgIntelligenceExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async export(
    organizationId: string,
    userId: string,
    exportType: string,
    format: EmfgIntelligenceExportFormat,
    payload: Record<string, unknown>,
  ) {
    const rows = buildExportRows(exportType, payload);
    const seq = await this.prisma.emfgIntelligenceExportLog.count({ where: { organizationId } });
    const exportKey = generateEmfgKey('EXP', seq + 1);

    let content: string;
    if (format === EmfgIntelligenceExportFormat.csv) {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
      }
      content = csvLines.join('\n');
    } else {
      content = JSON.stringify({ exportType, rows, exportedAt: new Date().toISOString() }, null, 2);
    }

    const log = await this.prisma.emfgIntelligenceExportLog.create({
      data: {
        organizationId,
        exportKey,
        exportType,
        format,
        rowCount: rows.length,
        userId,
        metadata: { contentPreview: content.slice(0, 500) },
      },
    });

    await this.audit.log(organizationId, 'EmfgIntelligenceExport', exportKey, 'intelligence_exported', userId, {
      exportType,
      format,
      rowCount: rows.length,
    });

    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceExport', exportKey, EVENT_TYPES.EMFG_INTELLIGENCE_EXPORTED, {
      exportType,
      format,
      integration: 'bi',
    });

    return { exportKey: log.exportKey, format, rowCount: rows.length, content };
  }

  async logQuery(
    organizationId: string,
    userId: string,
    queryType: string,
    filters: Record<string, unknown>,
    resultCount: number,
  ) {
    const seq = await this.prisma.emfgIntelligenceQueryLog.count({ where: { organizationId } });
    return this.prisma.emfgIntelligenceQueryLog.create({
      data: {
        organizationId,
        queryKey: generateEmfgKey('QRY', seq + 1),
        queryType,
        filters: filters as object,
        userId,
        resultCount,
      },
    });
  }
}
