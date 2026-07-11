import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  listEimsReportDefinitions,
  listEimsReportRuns,
  listEimsReports,
  runEimsReport,
  saveEimsReportDefinition,
} from '../api/eims';

type RunRow = Record<string, unknown> & { id: string };

const runColumns: SimpleColumn<RunRow>[] = [
  { key: 'runKey', label: 'Run', getValue: (r) => String(r.runKey ?? '') },
  { key: 'reportKey', label: 'Reporte', getValue: (r) => String(r.reportKey ?? '') },
  { key: 'format', label: 'Formato', getValue: (r) => String(r.format ?? '') },
  { key: 'rowCount', label: 'Filas', getValue: (r) => String(r.rowCount ?? '') },
  { key: 'generatedAt', label: 'Fecha', getValue: (r) => String(r.generatedAt ?? '').slice(0, 19) },
];

function downloadContent(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function EimsReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reportType: 'valued_inventory',
    format: 'csv',
    warehouseKey: '',
    name: 'Reporte personalizado',
  });

  const reload = async () => {
    const [r, d, runsList] = await Promise.all([
      listEimsReports(),
      listEimsReportDefinitions(),
      listEimsReportRuns(),
    ]);
    setReports([...(r as Array<Record<string, unknown>>), ...(d as Array<Record<string, unknown>>)]);
    setRuns((runsList as Array<Record<string, unknown>>).map((row) => withRowId(row, 'runKey', 'id')));
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const run = async (format: string) => {
    const result = await runEimsReport({
      reportType: form.reportType,
      format,
      filters: form.warehouseKey ? { warehouseKey: form.warehouseKey } : {},
    });
    const ext = format === 'excel' ? 'xls' : format;
    downloadContent(
      `${form.reportType}.${ext}`,
      String(result.content ?? ''),
      String(result.contentType ?? 'text/plain'),
    );
    await reload();
  };

  return (
    <PageLayout>
      <PageHeader
        title="Centro de reportes"
        subtitle="Inventario valorizado, kardex, rotación, cobertura, conteos y más"
        actions={
          <PageActions>
            <Link to="/inventario/ops" className="btn">Centro de operaciones</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Generar reporte">
        <div className="form-grid">
          <FieldGroup label="Tipo de reporte">
            <select value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })}>
              <option value="valued_inventory">Inventario valorizado</option>
              <option value="kardex">Kardex</option>
              <option value="turnover">Rotación</option>
              <option value="coverage">Cobertura</option>
              <option value="stock">Existencias</option>
              <option value="counts">Conteos</option>
              <option value="differences">Diferencias</option>
              <option value="expiry">Vencimientos</option>
              <option value="reservations">Reservas</option>
              <option value="replenishment">Abastecimiento</option>
              <option value="movements">Movimientos</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Filtro bodega">
            <input placeholder="Filtro bodega" value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn" onClick={() => run('csv').catch((e) => setError(e.message))}>CSV</button>
          <button className="btn" onClick={() => run('excel').catch((e) => setError(e.message))}>Excel</button>
          <button className="btn" onClick={() => run('pdf').catch((e) => setError(e.message))}>PDF</button>
        </FormActions>
      </PageSection>

      <PageSection title="Constructor de reportes personalizados">
        <div className="form-grid">
          <FieldGroup label="Nombre">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn btn-primary"
            onClick={() =>
              saveEimsReportDefinition({
                name: form.name,
                reportType: form.reportType,
                filters: form.warehouseKey ? { warehouseKey: form.warehouseKey } : {},
                columns: ['itemKey', 'warehouseKey', 'onHandQty', 'totalCost'],
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Guardar definición
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Definiciones">
        <ul>
          {reports.map((r) => (
            <li key={String(r.id ?? r.reportKey)}>
              {String(r.reportKey)} — {String(r.name)} [{String(r.reportType)}]
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Historial de exportaciones">
        <SimpleRecordsTable
          gridId="eims-report-runs"
          columns={runColumns}
          data={runs}
          selectable={false}
          emptyMessage="Sin exportaciones"
        />
      </PageSection>
    </PageLayout>
  );
}
