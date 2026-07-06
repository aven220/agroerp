import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FormDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FormsService } from './forms.service';

export interface FormImportRow {
  formKey: string;
  name: string;
  description?: string;
  sectorCode?: string;
  schema?: FormDefinitionSchema;
}

@Injectable()
export class FormImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly forms: FormsService,
  ) {}

  getTemplateCsv(): string {
    return [
      'formKey,name,description,sectorCode',
      'inspeccion-cafe,Inspección café,Formulario de inspección,coffee',
    ].join('\n');
  }

  validate(items: FormImportRow[]) {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    items.forEach((item, idx) => {
      const row = idx + 1;
      if (!item.formKey?.trim()) errors.push({ row, field: 'formKey', message: 'formKey requerido' });
      if (!item.name?.trim()) errors.push({ row, field: 'name', message: 'name requerido' });
    });
    return {
      valid: errors.length === 0,
      totalRows: items.length,
      validRows: items.length - new Set(errors.map((e) => e.row)).size,
      errors,
      preview: items.map((item, i) => ({ row: i + 1, ...item })),
    };
  }

  async importJson(
    organizationId: string,
    userId: string,
    payload: { forms: FormImportRow[]; force?: boolean },
    ctx?: RequestContext,
  ) {
    const batchId = randomUUID();
    const validation = this.validate(payload.forms);
    if (!validation.valid && !payload.force) {
      return { batchId, status: 'validation_failed', ...validation };
    }

    const results: Array<{ row: number; status: string; formId?: string; error?: string }> = [];
    const createdIds: string[] = [];

    for (let i = 0; i < payload.forms.length; i++) {
      const item = payload.forms[i];
      const row = i + 1;
      try {
        const schema = item.schema ?? this.defaultSchema(item.name);
        const form = await this.forms.create(
          organizationId,
          userId,
          {
            formKey: item.formKey,
            name: item.name,
            description: item.description,
            schema,
          },
          ctx,
        );
        if (item.sectorCode) {
          await this.prisma.formDefinition.update({
            where: { id: form.id },
            data: { sectorCode: item.sectorCode },
          });
        }
        createdIds.push(form.id);
        results.push({ row, status: 'created', formId: form.id });
        await this.prisma.formImportLog.create({
          data: {
            organizationId,
            formId: form.id,
            batchId,
            rowNumber: row,
            status: 'created',
            payload: item as object,
          },
        });
      } catch (err) {
        results.push({
          row,
          status: 'error',
          error: err instanceof Error ? err.message : 'Import error',
        });
        await this.prisma.formImportLog.create({
          data: {
            organizationId,
            batchId,
            rowNumber: row,
            status: 'error',
            message: err instanceof Error ? err.message : 'Import error',
            payload: item as object,
          },
        });
        if (!payload.force) {
          for (const id of createdIds) {
            await this.prisma.formDefinition.update({
              where: { id },
              data: { deletedAt: new Date(), status: 'archived' },
            });
          }
          return { batchId, status: 'rolled_back', results, validation };
        }
      }
    }

    await this.core.emitUserAction(
      organizationId,
      'Form',
      batchId,
      'FORM_IMPORTED',
      { count: results.filter((r) => r.status === 'created').length },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return { batchId, status: 'completed', results, validation };
  }

  async exportForm(organizationId: string, id: string, format: 'json' | 'csv' = 'json') {
    const form = await this.forms.findOne(organizationId, id);
    if (format === 'json') {
      return {
        format: 'json',
        payload: {
          formKey: form.formKey,
          name: form.name,
          description: form.description,
          version: form.version,
          status: form.status,
          sectorCode: form.sectorCode,
          schema: form.schema,
        },
      };
    }
    const schema = form.schema as unknown as FormDefinitionSchema;
    const headers = ['fieldKey', 'fieldType', 'label', 'required'];
    const rows = schema.fields.map((f) => [
      f.key,
      f.type,
      f.label,
      f.required ? 'true' : 'false',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return { format: 'csv', csv, formKey: form.formKey };
  }

  private defaultSchema(name: string): FormDefinitionSchema {
    return {
      version: 1,
      fields: [
        { key: 'observations', type: 'textarea', label: `Observaciones — ${name}`, required: false },
      ],
      settings: { offlineCapable: true, allowDraft: true },
    };
  }
}
