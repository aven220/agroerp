import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  TableToolbar,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { getFormDashboard, listForms, runFormReport } from '../api/forms';

interface DataCenterReport {
  reportCode?: string;
  totals?: {
    submissions: number;
    withGps: number;
    synced: number;
    pending: number;
    failed: number;
    activeCampaigns: number;
  };
  submissionsByForm?: Array<{ formId: string; formKey: string; name: string; count: number }>;
  submissionsByDay?: Array<{ date: string; count: number }>;
  campaigns?: Array<{ id: string; code: string; name: string; status: string; expectedCount?: number | null }>;
}

type CampaignRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  expectedCount?: number | null;
};

const campaignColumns: SimpleColumn<CampaignRow>[] = [
  { key: 'name', label: 'Nombre', getValue: (r) => r.name },
  { key: 'status', label: 'Estado', getValue: (r) => r.status },
  {
    key: 'expectedCount',
    label: 'Meta',
    getValue: (r) => String(r.expectedCount ?? '—'),
  },
];

export function FormDataCenterPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFormDashboard>> | null>(null);
  const [report, setReport] = useState<DataCenterReport | null>(null);
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [formId, setFormId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rpt, formList] = await Promise.all([
        getFormDashboard(),
        runFormReport('UDFE-RPT-05', formId || undefined) as Promise<DataCenterReport>,
        listForms({ status: 'published' }),
      ]);
      setDashboard(dash);
      setReport(rpt);
      setForms(formList.map((f) => ({ id: f.id, name: f.name })));
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const maxDay = Math.max(...(report?.submissionsByDay?.map((d) => d.count) ?? [1]), 1);
  const campaigns = (report?.campaigns ?? []) as CampaignRow[];

  return (
    <PageLayout>
      <PageHeader
        title="Centro de Datos"
        subtitle="Indicadores, tendencias y cruce de información recolectada"
      />
      <FormsPlatformNav />

      <TableToolbar>
        <select value={formId} onChange={(e) => setFormId(e.target.value)}>
          <option value="">Todos los formularios publicados</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <Link to="/formularios/recoleccion" className="btn btn-sm">Ver registros</Link>
        <Link to="/formularios/exportar" className="btn btn-sm btn-primary">Exportar</Link>
      </TableToolbar>

      {loading ? <LoadingState variant="dashboard" /> : (
        <>
          <PageSummary>
            <MetricCard label="Envíos" value={report?.totals?.submissions ?? dashboard?.kpis.totalSubmissions ?? 0} tone="green" />
            <MetricCard label="Sincronizados" value={report?.totals?.synced ?? 0} />
            <MetricCard label="Pendientes sync" value={report?.totals?.pending ?? dashboard?.kpis.pendingSync ?? 0} />
            <MetricCard label="Con GPS" value={report?.totals?.withGps ?? 0} />
            <MetricCard label="Campañas activas" value={report?.totals?.activeCampaigns ?? 0} />
            <MetricCard label="Formularios pub." value={dashboard?.kpis.publishedForms ?? 0} />
          </PageSummary>

          <div className="form-datacenter-grid">
            <PageSection title="Envíos por formulario">
              {(report?.submissionsByForm?.length ?? 0) === 0 ? (
                <p className="muted">Aún no hay información.</p>
              ) : (
                <ul className="form-bar-chart">
                  {report?.submissionsByForm?.map((row) => (
                    <li key={row.formId}>
                      <span className="form-bar-label">{row.name}</span>
                      <div className="form-bar-track">
                        <div
                          className="form-bar-fill"
                          style={{
                            width: `${Math.round((row.count / (report?.totals?.submissions || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="form-bar-value">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PageSection>

            <PageSection title="Tendencia diaria">
              {(report?.submissionsByDay?.length ?? 0) === 0 ? (
                <p className="muted">Sin tendencia registrada.</p>
              ) : (
                <div className="form-trend-chart">
                  {report?.submissionsByDay?.map((d) => (
                    <div key={d.date} className="form-trend-bar-wrap" title={`${d.date}: ${d.count}`}>
                      <div className="form-trend-bar" style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }} />
                      <span className="form-trend-label">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </PageSection>

            <PageSection title="Campañas">
              {(report?.campaigns?.length ?? 0) === 0 ? (
                <p className="muted">Sin campañas. <Link to="/formularios/campanas">Crear campaña</Link></p>
              ) : (
                <SimpleRecordsTable
                  gridId="form-datacenter-campaigns"
                  columns={campaignColumns}
                  data={campaigns}
                  selectable={false}
                  emptyMessage="Sin campañas"
                />
              )}
            </PageSection>

            <PageSection title="Mapa (GPS)">
              <p className="muted">
                Exporte a <strong>GeoJSON</strong> desde la sección Exportar para visualizar en GIS externo o AGROERP GIS.
                Registros con coordenadas: <strong>{report?.totals?.withGps ?? 0}</strong>.
              </p>
              <Link to="/formularios/exportar" className="btn btn-sm">Exportar GeoJSON</Link>
            </PageSection>
          </div>
        </>
      )}
    </PageLayout>
  );
}
