import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { LotsService } from './lots.service';
import { ImportLotsDto } from '../presentation/lots.dto';

export interface ImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  preview: Array<Record<string, unknown>>;
}

@Injectable()
export class LotImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly lots: LotsService,
  ) {}

  getTemplateCsv(): string {
    return [
      'ftipLotUnitId,lotName,lotTypeCode,primaryCropCode,varietyCodes,plantedAreaHa,responsibleProducerId,observations',
      ',Lote Norte,productive,coffee,caturra,2.5,,',
    ].join('\n');
  }

  validate(organizationId: string, items: ImportLotsDto['items']): ImportValidationResult {
    const errors: ImportValidationResult['errors'] = [];
    const preview: Array<Record<string, unknown>> = [];

    items.forEach((item, idx) => {
      const row = idx + 1;
      if (!item.ftipLotUnitId) {
        errors.push({ row, field: 'ftipLotUnitId', message: 'ftipLotUnitId requerido' });
      }
      if (!item.lotName || item.lotName.length < 3) {
        errors.push({ row, field: 'lotName', message: 'lotName mínimo 3 caracteres' });
      }
      preview.push({ row, ...item });
    });

    return {
      valid: errors.length === 0,
      totalRows: items.length,
      validRows: items.length - new Set(errors.map((e) => e.row)).size,
      errors,
      preview,
    };
  }

  async importBatch(
    organizationId: string,
    userId: string,
    dto: ImportLotsDto,
    ctx?: RequestContext,
  ) {
    const batchId = randomUUID();
    const validation = this.validate(organizationId, dto.items);
    if (!validation.valid && !dto.force) {
      return { batchId, status: 'validation_failed', ...validation };
    }

    const results: Array<{ row: number; status: string; fieldLotId?: string; error?: string }> = [];
    const createdIds: string[] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const row = i + 1;
      try {
        const lot = await this.lots.create(organizationId, userId, item, ctx);
        createdIds.push(lot.id);
        results.push({ row, status: 'created', fieldLotId: lot.id });
        await this.prisma.lotImportLog.create({
          data: {
            organizationId,
            fieldLotId: lot.id,
            batchId,
            rowNumber: row,
            status: 'created',
            payload: item as object,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error importación';
        results.push({ row, status: 'error', error: message });
        await this.prisma.lotImportLog.create({
          data: {
            organizationId,
            batchId,
            rowNumber: row,
            status: 'error',
            message,
            payload: item as object,
          },
        });
        if (!dto.continueOnError) {
          for (const id of createdIds) {
            await this.prisma.fieldLotProfile.update({
              where: { id },
              data: { deletedAt: new Date(), status: 'inactive' },
            });
          }
          return {
            batchId,
            status: 'rolled_back',
            imported: 0,
            errors: results.filter((r) => r.status === 'error').length,
            results,
          };
        }
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    await this.core.emitUserAction(
      organizationId,
      'LotImportBatch',
      batchId,
      'LOT_IMPORT_COMPLETED',
      { batchId, imported: created },
      { ctx },
    );

    return { batchId, status: 'completed', imported: created, results };
  }
}
