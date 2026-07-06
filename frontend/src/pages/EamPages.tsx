import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEam,
  computeEamIndicators,
  getEamAsset,
  getEamCenter,
  getEamDashboard,
  getEamLocationMap,
  listEamAssets,
  listEamFamilies,
  scanEamAsset,
} from '../api/eam';

const EAM_LINKS = (
  <div className="row-actions">
    <Link to="/gestion-activos" className="btn">Centro</Link>
    <Link to="/gestion-activos/administrador" className="btn">Administrador</Link>
    <Link to="/gestion-activos/hoja-vida" className="btn">Hoja de Vida</Link>
    <Link to="/gestion-activos/ubicaciones" className="btn">Ubicaciones</Link>
    <Link to="/gestion-activos/dashboard" className="btn">Dashboard</Link>
    <Link to="/gestion-activos/mantenimiento" className="btn">Mantenimiento</Link>
    <Link to="/gestion-activos/confiabilidad" className="btn">Confiabilidad</Link>
  </div>
);

export function EamCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamCenter().then(setCenter); }, []);
  const indicators = center?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Activos" subtitle="Enterprise Asset Management" actions={EAM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Activos</span><span className="kpi-value">{String(center?.assetCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Valor total</span><span className="kpi-value">{String(indicators?.totalValue ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Operativos</span><span className="kpi-value">{String(indicators?.operationalPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Garantías por vencer</span><span className="kpi-value">{String(indicators?.expiringWarranties ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEam().then(() => getEamCenter().then(setCenter))}>Inicializar EAM</button>
      </section>
    </>
  );
}

export function EamAdminPage() {
  const [families, setFamilies] = useState<Array<Record<string, unknown>>>([]);
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listEamFamilies().then((f) => setFamilies(f as Array<Record<string, unknown>>));
    listEamAssets().then((a) => setAssets(a as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Administrador de Activos" subtitle="Catálogo, familias y jerarquía" actions={EAM_LINKS} />
      <section className="card">
        <h3>Familias ({families.length})</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Subfamilias</th></tr></thead>
          <tbody>
            {families.map((f) => (
              <tr key={String(f.familyKey)}><td>{String(f.code)}</td><td>{String(f.name)}</td><td>{((f.subfamilies as unknown[]) ?? []).length}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h3>Activos ({assets.length})</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Ubicación</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={String(a.assetKey)}>
                <td>{String(a.assetKey)}</td>
                <td>{String(a.name)}</td>
                <td>{String(a.assetType)}</td>
                <td>{String(a.status)}</td>
                <td>{String((a.location as Record<string, unknown>)?.name ?? a.locationKey ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamLifecyclePage() {
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [sheet, setSheet] = useState<Record<string, unknown> | null>(null);
  const [scanCode, setScanCode] = useState('');

  useEffect(() => {
    listEamAssets().then((a) => {
      const list = a as Array<Record<string, unknown>>;
      setAssets(list);
      if (list[0]) setSelected(String(list[0].assetKey));
    });
  }, []);

  useEffect(() => {
    if (selected) getEamAsset(selected).then(setSheet);
  }, [selected]);

  const doScan = () => {
    if (!scanCode) return;
    scanEamAsset(scanCode).then((asset) => {
      setSelected(String(asset.assetKey));
      setSheet(asset);
    });
  };

  const events = (sheet?.lifecycleEvents as Array<Record<string, unknown>>) ?? [];
  const docs = (sheet?.documents as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Hoja de Vida del Activo" subtitle="Datos técnicos, ciclo de vida y documentos" actions={EAM_LINKS} />
      <section className="card">
        <div className="form-row">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {assets.map((a) => <option key={String(a.assetKey)} value={String(a.assetKey)}>{String(a.name)}</option>)}
          </select>
          <input value={scanCode} onChange={(e) => setScanCode(e.target.value)} placeholder="QR / Código barras" />
          <button className="btn" onClick={doScan}>Escanear</button>
        </div>
        {sheet && (
          <div className="kpi-grid">
            <div className="kpi-card"><span className="kpi-label">Nº interno</span><span className="kpi-value">{String(sheet.internalNumber)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Marca / Modelo</span><span className="kpi-value">{String(sheet.brand ?? '—')} / {String(sheet.model ?? '—')}</span></div>
            <div className="kpi-card"><span className="kpi-label">Costo</span><span className="kpi-value">{String(sheet.acquisitionCost)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Vida útil (meses)</span><span className="kpi-value">{String(sheet.usefulLifeMonths)}</span></div>
          </div>
        )}
        <table className="data-table">
          <thead><tr><th>Evento</th><th>Desde</th><th>Hacia</th><th>Fecha</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={String(e.eventKey)}><td>{String(e.eventType)}</td><td>{String(e.fromStatus ?? '—')}</td><td>{String(e.toStatus ?? '—')}</td><td>{String(e.recordedAt)}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>Documentos ({docs.length})</h3>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Título</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={String(d.documentKey)}><td>{String(d.docType)}</td><td>{String(d.title)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamLocationsPage() {
  const [tree, setTree] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => { getEamLocationMap().then((t) => setTree(t as Array<Record<string, unknown>>)); }, []);

  const renderNode = (node: Record<string, unknown>, depth = 0) => (
    <div key={String(node.locationKey)} style={{ marginLeft: depth * 16 }}>
      {String(node.name)} ({String(node.locationType)})
      {((node.children as Array<Record<string, unknown>>) ?? []).map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <>
      <Header title="Mapa de Ubicaciones" subtitle="Jerarquía de plantas, bodegas y campos" actions={EAM_LINKS} />
      <section className="card">
        {tree.map((n) => renderNode(n))}
      </section>
    </>
  );
}

export function EamDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard de Activos" subtitle="Indicadores y cumplimiento" actions={EAM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Total activos</span><span className="kpi-value">{String(dash?.totalAssets ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Valor activos</span><span className="kpi-value">{String(dash?.totalValue ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Estado operativo</span><span className="kpi-value">{String(dash?.operationalPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Vida útil restante</span><span className="kpi-value">{String(dash?.avgRemainingLifeMonths ?? '—')} meses</span></div>
        <div className="kpi-card"><span className="kpi-label">Garantías por vencer</span><span className="kpi-value">{String(dash?.expiringWarranties ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => computeEamIndicators().then(setDash)}>Recalcular indicadores</button>
      </section>
    </>
  );
}
