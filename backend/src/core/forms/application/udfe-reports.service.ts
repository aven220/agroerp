import { Injectable } from '@nestjs/common';
import { FormDefinitionSchema, FormFieldDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { flattenFields, isDataField } from './field-type.util';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  published: 'Publicado',
  deprecated: 'Obsoleto',
  archived: 'Archivado',
};

type ExportType = 'full' | 'catalog' | 'submissions';

@Injectable()
export class UdfeReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runReport(organizationId: string, reportCode: string, params?: { formId?: string }) {
    switch (reportCode) {
      case 'UDFE-RPT-01':
        return this.submissionsByForm(organizationId, params?.formId);
      case 'UDFE-RPT-02':
        return this.formsByStatus(organizationId);
      case 'UDFE-RPT-03':
        return this.assignmentCompliance(organizationId);
      case 'UDFE-RPT-04':
        return this.syncHealth(organizationId);
      case 'UDFE-RPT-05':
        return this.dataCenterSummary(organizationId, params?.formId);
      default:
        return { reportCode, error: 'Unknown report' };
    }
  }

  async exportReport(
    organizationId: string,
    options: { type?: ExportType; formId?: string } = {},
  ) {
    const type = options.type ?? 'full';
    const generatedAt = new Date();
    const dateSlug = generatedAt.toISOString().slice(0, 10);

    if (type === 'catalog') {
      const csv = await this.buildCatalogSection(organizationId);
      return {
        type,
        filename: `formularios-catalogo-${dateSlug}.csv`,
        csv: this.withBom(this.wrapReport('Catálogo de formularios', csv, generatedAt)),
        generatedAt: generatedAt.toISOString(),
      };
    }

    if (type === 'submissions') {
      const { csv, rowCount } = await this.buildSubmissionsSection(
        organizationId,
        options.formId,
      );
      const suffix = options.formId ? '-formulario' : '';
      return {
        type,
        filename: `formularios-envios${suffix}-${dateSlug}.csv`,
        csv: this.withBom(this.wrapReport('Envíos de formularios', csv, generatedAt)),
        generatedAt: generatedAt.toISOString(),
        rowCount,
      };
    }

    const sections: string[] = [];
    sections.push(await this.buildSummarySection(organizationId, generatedAt));
    sections.push(await this.buildCatalogSection(organizationId));
    sections.push(await this.buildFieldsSection(organizationId, options.formId));
    const { csv: submissionsCsv, rowCount } = await this.buildSubmissionsSection(
      organizationId,
      options.formId,
    );
    sections.push(submissionsCsv);

    return {
      type: 'full',
      filename: `reporte-formularios-campo-${dateSlug}.csv`,
      csv: this.withBom(sections.join('\n\n')),
      generatedAt: generatedAt.toISOString(),
      rowCount,
    };
  }

  private withBom(csv: string): string {
    return `\uFEFF${csv}`;
  }

  private wrapReport(title: string, body: string, generatedAt: Date): string {
    return [
      `REPORTE AGROERP — ${title.toUpperCase()}`,
      `Generado,${this.cell(generatedAt.toLocaleString('es-CO'))}`,
      '',
      body,
    ].join('\n');
  }

  private cell(value: unknown): string {
    if (value == null) return '';
    const str =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private row(values: unknown[]): string {
    return values.map((v) => this.cell(v)).join(',');
  }

  private sectionTitle(title: string): string {
    return `=== ${title} ===`;
  }

  private async buildSummarySection(organizationId: string, generatedAt: Date) {
    const [
      totalForms,
      publishedForms,
      draftForms,
      inReviewForms,
      totalSubmissions,
      pendingSync,
      totalAssignments,
      pendingAssignments,
    ] = await Promise.all([
      this.prisma.formDefinition.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'published', deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'draft', deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'in_review', deletedAt: null },
      }),
      this.prisma.formSubmission.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.formSubmission.count({
        where: { organizationId, syncStatus: 'pending', deletedAt: null },
      }),
      this.prisma.formAssignment.count({ where: { organizationId } }),
      this.prisma.formAssignment.count({
        where: { organizationId, status: 'pending' },
      }),
    ]);

    const byStatus = await this.prisma.formDefinition.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const lines = [
      this.sectionTitle('RESUMEN EJECUTIVO'),
      this.row(['Indicador', 'Valor']),
      this.row(['Fecha del reporte', generatedAt.toLocaleString('es-CO')]),
      this.row(['Total formularios', totalForms]),
      this.row(['Publicados (activos en app)', publishedForms]),
      this.row(['Borradores', draftForms]),
      this.row(['En revisión', inReviewForms]),
      this.row(['Total envíos capturados', totalSubmissions]),
      this.row(['Envíos pendientes de sincronizar', pendingSync]),
      this.row(['Asignaciones totales', totalAssignments]),
      this.row(['Asignaciones pendientes', pendingAssignments]),
      '',
      this.row(['Estado', 'Cantidad']),
      ...byStatus.map((s) =>
        this.row([
          STATUS_LABELS[s.status] ?? s.status,
          s._count.id,
        ]),
      ),
    ];
    return lines.join('\n');
  }

  private async buildCatalogSection(organizationId: string) {
    const forms = await this.prisma.formDefinition.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ formKey: 'asc' }, { version: 'desc' }],
    });

    const lines = [
      this.sectionTitle('CATÁLOGO DE FORMULARIOS'),
      this.row([
        'Clave',
        'Nombre',
        'Versión',
        'Estado',
        'Campos datos',
        'Campos total',
        'Publicado',
        'Actualizado',
        'Descripción',
      ]),
      ...forms.map((f) => {
        const schema = f.schema as unknown as FormDefinitionSchema;
        const allFields = flattenFields(schema?.fields ?? []);
        const dataFields = allFields.filter((field) => isDataField(field));
        return this.row([
          f.formKey,
          f.name,
          f.version,
          STATUS_LABELS[f.status] ?? f.status,
          dataFields.length,
          allFields.length,
          f.publishedAt?.toISOString() ?? '',
          f.updatedAt.toISOString(),
          f.description ?? '',
        ]);
      }),
    ];
    return lines.join('\n');
  }

  private async buildFieldsSection(organizationId: string, formId?: string) {
    const forms = await this.prisma.formDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { id: formId } : {}),
      },
      orderBy: [{ formKey: 'asc' }, { version: 'desc' }],
    });

    const lines = [
      this.sectionTitle('DETALLE DE CAMPOS'),
      this.row([
        'Clave formulario',
        'Nombre formulario',
        'Versión',
        'Campo (key)',
        'Tipo',
        'Etiqueta',
        'Obligatorio',
        'Opciones',
      ]),
    ];

    for (const form of forms) {
      const schema = form.schema as unknown as FormDefinitionSchema;
      const fields = flattenFields(schema?.fields ?? []);
      for (const field of fields) {
        lines.push(
          this.row([
            form.formKey,
            form.name,
            form.version,
            field.key,
            field.type,
            field.label,
            field.required ? 'Sí' : 'No',
            this.formatOptions(field),
          ]),
        );
      }
    }

    return lines.join('\n');
  }

  private formatOptions(field: FormFieldDefinition): string {
    if (!field.options?.length) return '';
    return field.options.map((o) => `${o.label} (${o.value})`).join(' | ');
  }

  private async buildSubmissionsSection(organizationId: string, formId?: string) {
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { formId } : {}),
      },
      include: {
        form: {
          select: {
            formKey: true,
            name: true,
            schema: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const fieldKeys = new Set<string>();
    const fieldLabels = new Map<string, string>();

    for (const sub of submissions) {
      const schema = sub.form.schema as unknown as FormDefinitionSchema;
      for (const field of flattenFields(schema?.fields ?? [])) {
        if (!isDataField(field)) continue;
        fieldKeys.add(field.key);
        fieldLabels.set(field.key, field.label);
      }
      const data = sub.data as Record<string, unknown>;
      for (const key of Object.keys(data)) {
        fieldKeys.add(key);
      }
    }

    const sortedKeys = Array.from(fieldKeys).sort();

    const headers = [
      'ID envío',
      'Formulario',
      'Clave',
      'Versión',
      'Estado',
      'Sincronización',
      'Fecha captura',
      'Latitud GPS',
      'Longitud GPS',
      'ID externo (móvil)',
      ...sortedKeys.map((k) => fieldLabels.get(k) ?? k),
    ];

    const lines = [
      this.sectionTitle('ENVÍOS / RESPUESTAS'),
      this.row(headers),
    ];

    for (const sub of submissions) {
      const data = sub.data as Record<string, unknown>;
      const gps = sub.gpsLocation as { lat?: number; lng?: number } | null;
      lines.push(
        this.row([
          sub.id,
          sub.form.name,
          sub.form.formKey,
          sub.formVersion,
          sub.status,
          sub.syncStatus,
          sub.createdAt.toISOString(),
          gps?.lat ?? '',
          gps?.lng ?? '',
          sub.externalId ?? '',
          ...sortedKeys.map((k) => this.formatSubmissionValue(data[k])),
        ]),
      );
    }

    return { csv: lines.join('\n'), rowCount: submissions.length };
  }

  private formatSubmissionValue(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map((v) => String(v)).join('; ');
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if ('lat' in obj && 'lng' in obj) {
        return `${obj.lat}, ${obj.lng}`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  private async submissionsByForm(organizationId: string, formId?: string) {
    const items = await this.prisma.formSubmission.groupBy({
      by: ['formId', 'status'],
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { formId } : {}),
      },
      _count: { id: true },
    });
    return { reportCode: 'UDFE-RPT-01', items };
  }

  private async formsByStatus(organizationId: string) {
    const items = await this.prisma.formDefinition.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });
    return { reportCode: 'UDFE-RPT-02', items };
  }

  private async assignmentCompliance(organizationId: string) {
    const items = await this.prisma.formAssignment.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });
    return { reportCode: 'UDFE-RPT-03', items };
  }

  private async syncHealth(organizationId: string) {
    const items = await this.prisma.formSubmission.groupBy({
      by: ['syncStatus'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });
    return { reportCode: 'UDFE-RPT-04', items };
  }

  private async dataCenterSummary(organizationId: string, formId?: string) {
    const [submissions, campaigns, forms] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(formId ? { formId } : {}),
        },
        select: {
          id: true,
          formId: true,
          status: true,
          syncStatus: true,
          gpsLocation: true,
          createdAt: true,
          form: { select: { formKey: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      this.prisma.formCampaign.findMany({
        where: { organizationId, status: { in: ['active', 'closed'] } },
        select: { id: true, code: true, name: true, status: true, expectedCount: true, formId: true },
      }),
      this.prisma.formDefinition.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const byForm = new Map<string, { formKey: string; name: string; count: number }>();
    const byDay = new Map<string, number>();
    let withGps = 0;
    let synced = 0;
    let pending = 0;
    let failed = 0;

    for (const s of submissions) {
      const key = s.formId;
      const cur = byForm.get(key) ?? {
        formKey: s.form?.formKey ?? key,
        name: s.form?.name ?? key,
        count: 0,
      };
      cur.count += 1;
      byForm.set(key, cur);

      const day = s.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);

      if (s.gpsLocation) withGps += 1;
      if (s.syncStatus === 'synced') synced += 1;
      else if (s.syncStatus === 'conflict') failed += 1;
      else if (s.syncStatus === 'pending') pending += 1;
    }

    return {
      reportCode: 'UDFE-RPT-05',
      totals: {
        submissions: submissions.length,
        withGps,
        synced,
        pending,
        failed,
        activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      },
      submissionsByForm: Array.from(byForm.entries()).map(([formId, v]) => ({
        formId,
        ...v,
      })),
      submissionsByDay: Array.from(byDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      formsByStatus: forms,
      campaigns,
    };
  }
}
