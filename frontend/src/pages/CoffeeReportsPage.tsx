import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  downloadReportExport,
  generateCoffeeReport,
  generateCustomCoffeeReport,
  listCoffeeReports,
} from '../api/coffee';

const REPORT_TYPES = [
  'daily', 'weekly', 'monthly', 'yearly',
  'producer', 'farm', 'lot', 'financial', 'quality', 'audit',
];

type ReportRow = Record<string, unknown> & { id: string };

export function CoffeeReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [reportType, setReportType] = useState('daily');
  const [period, setPeriod] = useState('day');
  const [format, setFormat] = useState('csv');
  const [customTitle, setCustomTitle] = useState('Reporte personalizado');
  const [groupBy, setGroupBy] = useState('producer');
  const [error, setError] = useState('');

  const reload = () => listCoffeeReports().then((r) => setReports(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const generate = async () => {
    setError('');
    try {
      const report = await generateCoffeeReport({ reportType, period, format });
      downloadReportExport(report);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando reporte');
    }
  };

  const generateCustom = async () => {
    setError('');
    try {
      const report = await generateCustomCoffeeReport({
        title: customTitle,
        groupBy,
        period,
        format,
        metrics: ['kgTotal', 'amountTotal', 'avgPricePerKg'],
      });
      downloadReportExport(report);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error reporte personalizado');
    }
  };

  const data = reports.map((r) => withRowId(r, 'id', 'reportKey'));

  const rowActions: RowAction<ReportRow>[] = [
    {
      id: 'download',
      label: 'Descargar',
      onAction: (r) => {
        downloadReportExport(r);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Centro de reportes"
        subtitle="Diarios, financieros, calidad, auditoría y personalizados"
        actions={
          <PageActions>
            <Link to="/compras/ops" className="btn">Operations</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Generar reporte">
        <PageToolbar>
          <FieldGroup label="Tipo">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Periodo">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Formato">
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </select>
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn btn-primary" onClick={generate}>Generar y exportar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Constructor personalizado">
        <PageToolbar>
          <FieldGroup label="Título">
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Agrupar por">
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="producer">Productor</option>
              <option value="farm">Finca</option>
              <option value="lot">Lote</option>
              <option value="center">Centro</option>
            </select>
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn btn-primary" onClick={generateCustom}>Generar personalizado</button>
        </FormActions>
      </PageSection>

      <PageSection title="Historial de reportes">
        <SimpleRecordsTable
          gridId="coffee-reports"
          selectable={false}
          data={data}
          columns={[
            { key: 'reportKey', label: 'Clave', getValue: (r) => String(r.reportKey) },
            { key: 'reportType', label: 'Tipo', getValue: (r) => String(r.reportType) },
            { key: 'period', label: 'Periodo', getValue: (r) => String(r.period) },
            { key: 'format', label: 'Formato', getValue: (r) => String(r.format) },
            {
              key: 'generatedAt',
              label: 'Fecha',
              getValue: (r) => (r.generatedAt ? new Date(String(r.generatedAt)).toLocaleString() : '—'),
            },
          ]}
          rowActions={rowActions}
        />
      </PageSection>
    </PageLayout>
  );
}
