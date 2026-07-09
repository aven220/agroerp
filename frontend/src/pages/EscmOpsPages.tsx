import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  acknowledgeEscmOpsAlert,
  evaluateEscmOpsAlerts,
  getEscmOpsCenter,
  getEscmOpsRegionMap,
} from '../api/escm';

export function EscmOpsCenterPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [regions, setRegions] = useState<Array<Record<string, unknown>>>([]);
  const [filters, setFilters] = useState({ regionKey: '', sellerId: '', customerKey: '' });

  const reload = () => {
    const q: Record<string, string> = {};
    if (filters.regionKey) q.regionKey = filters.regionKey;
    if (filters.sellerId) q.sellerId = filters.sellerId;
    if (filters.customerKey) q.customerKey = filters.customerKey;
    getEscmOpsCenter(q).then(setData);
    getEscmOpsRegionMap().then((r) => setRegions(r as Array<Record<string, unknown>>));
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [filters.regionKey, filters.sellerId, filters.customerKey]);

  if (!data) return <LoadingState variant="dashboard" message="Cargando centro de operaciones comercial..." />;

  return (
    <>
      <Header
        title="Centro de Operaciones Comercial"
        subtitle="Monitoreo en tiempo real del ciclo comercial"
        actions={
          <>
            <button className="btn" onClick={() => evaluateEscmOpsAlerts().then(reload)}>Evaluar alertas</button>
            <Link to="/comercial/ops/ejecutivo" className="btn">Ejecutivo</Link>
            <Link to="/comercial/ops/comercial" className="btn">Comercial</Link>
            <Link to="/comercial/ops/analitica" className="btn">Analítica</Link>
            <Link to="/comercial/ops/reportes" className="btn">Reportes</Link>
            <Link to="/comercial" className="btn">Comercial</Link>
          </>
        }
      />

      <section className="panel">
        <h3>Filtros avanzados</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input placeholder="Región" value={filters.regionKey} onChange={(e) => setFilters({ ...filters, regionKey: e.target.value })} />
          <input placeholder="Vendedor (ID)" value={filters.sellerId} onChange={(e) => setFilters({ ...filters, sellerId: e.target.value })} />
          <input placeholder="Cliente (key)" value={filters.customerKey} onChange={(e) => setFilters({ ...filters, customerKey: e.target.value })} />
        </div>
      </section>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Prospectos activos</span><span className="kpi-value">{String(data.activeProspects ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Oportunidades abiertas</span><span className="kpi-value">{String(data.openOpportunities ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pipeline</span><span className="kpi-value">{Number(data.pipelineValue ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cotizaciones pendientes</span><span className="kpi-value">{String(data.pendingQuotations ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pedidos pendientes</span><span className="kpi-value">{String(data.pendingOrders ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pedidos despachados</span><span className="kpi-value">{String(data.dispatchedOrders ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Facturación día</span><span className="kpi-value">{Number(data.billingToday ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Facturación mes</span><span className="kpi-value">{Number(data.billingMonth ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cartera pendiente</span><span className="kpi-value">{Number(data.pendingReceivables ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Recaudo día</span><span className="kpi-value">{Number(data.collectionToday ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Recaudo mes</span><span className="kpi-value">{Number(data.collectionMonth ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento metas</span><span className="kpi-value">{Number(data.goalCompliance ?? 0).toFixed(1)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas abiertas</span><span className="kpi-value">{String(data.openAlerts ?? 0)}</span></div>
      </div>

      <section className="panel">
        <h3>Mapa comercial por región</h3>
        <table className="data-table">
          <thead><tr><th>Región</th><th>Clientes</th><th>Ventas</th></tr></thead>
          <tbody>
            {regions.map((r) => (
              <tr key={String(r.regionKey)}>
                <td>{String(r.regionKey)}</td>
                <td>{String(r.customers ?? 0)}</td>
                <td>{Number(r.sales ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmOpsExecutivePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    import('../api/escm').then(({ getEscmOpsExecutive, getEscmOpsAiInsights }) => {
      getEscmOpsExecutive().then(setData);
      getEscmOpsAiInsights().then(setInsights);
    });
  }, []);

  if (!data) return <LoadingState variant="dashboard" message="Cargando dashboard ejecutivo..." />;
  const forecast = (insights?.salesForecast ?? {}) as Record<string, unknown>;
  const collection = (insights?.collectionForecast ?? {}) as Record<string, unknown>;
  const regionMap = (data.regionMap ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard ejecutivo comercial" subtitle="Visión estratégica consolidada" actions={<Link to="/comercial/ops" className="btn">Centro ops</Link>} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Pipeline ponderado</span><span className="kpi-value">{Number(data.weightedPipeline ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Facturación mes</span><span className="kpi-value">{Number(data.billingMonth ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cartera</span><span className="kpi-value">{Number(data.pendingReceivables ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Recaudo mes</span><span className="kpi-value">{Number(data.collectionMonth ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Proyección ventas</span><span className="kpi-value">{Number(forecast.projectedMonthEnd ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Proyección recaudo</span><span className="kpi-value">{Number(collection.projectedMonthEnd ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Metas</span><span className="kpi-value">{Number(data.goalCompliance ?? 0).toFixed(1)}%</span></div>
      </div>
      <section className="panel">
        <h3>Mapa regional</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', minHeight: 120 }}>
          {regionMap.slice(0, 12).map((r) => (
            <div key={String(r.regionKey)} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ background: '#1b5e3b88', height: Math.max(8, Number(r.sales) / 10000) }} />
              <small>{String(r.regionKey).slice(0, 8)}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function EscmOpsCommercialPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    import('../api/escm').then(({ getEscmOpsCommercial, getEscmOpsKpis }) => {
      getEscmOpsCommercial().then(setData);
      getEscmOpsKpis().then(setKpis);
    });
  }, []);

  if (!data || !kpis) return <LoadingState variant="dashboard" message="Cargando dashboard comercial..." />;
  const recentOrders = (data.recentOrders ?? []) as Array<Record<string, unknown>>;
  const salesBySeller = (kpis.salesBySeller ?? []) as Array<{ key: string; amount: number; count: number }>;

  return (
    <>
      <Header title="Dashboard comercial" subtitle="Operación diaria de ventas" actions={<Link to="/comercial/ops" className="btn">Centro ops</Link>} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Conv. prospectos</span><span className="kpi-value">{Number(kpis.prospectConversion ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Conv. cotizaciones</span><span className="kpi-value">{Number(kpis.quotationConversion ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Ticket promedio</span><span className="kpi-value">{Number(kpis.averageSaleValue ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cierre prom. (días)</span><span className="kpi-value">{Number(kpis.averageCloseTimeDays ?? 0)}</span></div>
      </div>
      <section className="panel">
        <h3>Ventas por vendedor</h3>
        <table className="data-table">
          <thead><tr><th>Vendedor</th><th>Ventas</th><th>Pedidos</th></tr></thead>
          <tbody>
            {salesBySeller.slice(0, 15).map((s) => (
              <tr key={s.key}><td>{s.key}</td><td>{s.amount.toLocaleString()}</td><td>{s.count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Pedidos recientes</h3>
        <table className="data-table">
          <thead><tr><th>Pedido</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={String(o.orderKey)}><td>{String(o.orderKey)}</td><td>{String(o.status)}</td><td>{Number(o.totalAmount ?? 0).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmOpsAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    import('../api/escm').then(({ getEscmOpsAnalytics, listEscmOpsAlerts }) => {
      getEscmOpsAnalytics().then(setData);
      listEscmOpsAlerts('open').then((a) => setAlerts(a as Array<Record<string, unknown>>));
    });
  }, []);

  if (!data) return <LoadingState variant="page" message="Cargando analítica..." />;
  const trends = (data.trends as Record<string, unknown>) ?? {};
  const points = (trends.points ?? []) as Array<{ label: string; value: number }>;
  const comparisons = (data.comparisons ?? {}) as Record<string, Record<string, unknown>>;
  const products = (data.products ?? {}) as Record<string, unknown>;
  const top = (products.top ?? []) as Array<{ itemKey: string; revenue: number }>;
  const customers = (data.customers ?? {}) as Record<string, unknown>;
  const atRisk = (customers.atRisk ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Analítica comercial" subtitle="Tendencias, comparativos e insights" actions={<Link to="/comercial/ops" className="btn">Centro ops</Link>} />
      <section className="panel">
        <h3>Tendencia de ventas (mes)</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'end', minHeight: 120 }}>
          {points.map((p) => (
            <div key={p.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ background: '#2563eb88', height: Math.max(8, p.value / 5000) }} title={String(p.value)} />
              <small>{p.label.slice(5)}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel grid-4">
        {Object.entries(comparisons).map(([k, v]) => (
          <div key={k}><strong>{k}</strong><div>{Number(v.deltaPct ?? 0)}% vs anterior</div></div>
        ))}
      </section>
      <section className="panel">
        <h3>Productos más vendidos</h3>
        <table className="data-table">
          <thead><tr><th>Producto</th><th>Ingresos</th></tr></thead>
          <tbody>{top.slice(0, 10).map((p) => <tr key={p.itemKey}><td>{p.itemKey}</td><td>{p.revenue.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Clientes en riesgo</h3>
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Cartera</th><th>Riesgo</th></tr></thead>
          <tbody>
            {atRisk.map((c) => (
              <tr key={String(c.customerKey)}><td>{String(c.legalName)}</td><td>{Number(c.receivables ?? 0).toLocaleString()}</td><td>{String(c.riskScore)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Alertas activas</h3>
        <table className="data-table">
          <thead><tr><th>Severidad</th><th>Título</th><th>Mensaje</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={String(a.alertKey)}>
                <td>{String(a.severity)}</td>
                <td>{String(a.title)}</td>
                <td>{String(a.message)}</td>
                <td><button className="btn" onClick={() => acknowledgeEscmOpsAlert(String(a.alertKey))}>Ack</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmOpsReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [customName, setCustomName] = useState('');
  const [customReports, setCustomReports] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => {
    import('../api/escm').then(({ listEscmCustomReports, listEscmReportRuns }) => {
      listEscmCustomReports().then((r) => setCustomReports(r as Array<Record<string, unknown>>));
      listEscmReportRuns().then((r) => setRuns(r as Array<Record<string, unknown>>));
    });
  };

  useEffect(() => { reload(); }, []);

  const runReport = () => {
    import('../api/escm').then(({ generateEscmReport }) => {
      generateEscmReport(reportType).then((r) => setRows((r.rows ?? []) as Array<Record<string, unknown>>));
    });
  };

  const doExport = () => {
    import('../api/escm').then(({ exportEscmReport, downloadEscmExport }) => {
      exportEscmReport(reportType, format).then((r) => {
        downloadEscmExport(r as never);
        reload();
      });
    });
  };

  const saveCustom = () => {
    import('../api/escm').then(({ createEscmCustomReport }) => {
      createEscmCustomReport({ name: customName || `Reporte ${reportType}`, reportType, definition: { filters: {} } }).then(reload);
    });
  };

  const REPORT_TYPES = ['commercial', 'sales', 'billing', 'receivables', 'collections', 'seller', 'customer', 'product', 'profitability'];

  return (
    <>
      <Header title="Centro de reportes comerciales" subtitle="Generación y exportación" actions={<Link to="/comercial/ops" className="btn">Centro ops</Link>} />
      <section className="panel">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'excel' | 'pdf')}>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button className="btn" onClick={runReport}>Generar</button>
          <button className="btn" onClick={doExport}>Exportar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Constructor de reportes personalizados</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Nombre del reporte" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          <button className="btn" onClick={saveCustom}>Guardar plantilla</button>
        </div>
        <ul>{customReports.map((r) => <li key={String(r.reportKey)}>{String(r.name)} — {String(r.reportType)}</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Vista previa ({rows.length} filas)</h3>
        {rows.length > 0 ? (
          <table className="data-table">
            <thead><tr>{Object.keys(rows[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>
              ))}
            </tbody>
          </table>
        ) : <p>Aún no hay información — genere un reporte.</p>}
      </section>
      <section className="panel">
        <h3>Historial de exportaciones</h3>
        <table className="data-table">
          <thead><tr><th>Run</th><th>Tipo</th><th>Formato</th><th>Filas</th><th>Fecha</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={String(r.runKey)}>
                <td>{String(r.runKey)}</td>
                <td>{String(r.reportType)}</td>
                <td>{String(r.format)}</td>
                <td>{String(r.rowCount)}</td>
                <td>{String(r.exportedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
