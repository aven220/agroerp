import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEimsCenter, seedEims } from '../api/eims';
import { LoadingState } from '../components/ux/LoadingState';

export function EimsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const reload = () => getEimsCenter().then(setCenter).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  if (!center && !error) return <LoadingState variant="page" message="Cargando EIMS..." />;

  return (
    <>
      <Header
        title="Enterprise Inventory — EIMS"
        subtitle="Fundamentos, catálogos, bodegas y artículos"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => seedEims().then(reload).catch((e) => setError(e.message))}>
              Sembrar catálogos
            </button>
            <Link to="/inventario/movimientos" className="btn">Movimientos</Link>
            <Link to="/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/inventario/cierres" className="btn">Cierres</Link>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
            <Link to="/inventario/lotes/vencimientos" className="btn">Vencimientos</Link>
            <Link to="/inventario/lotes/transformaciones" className="btn">Transformaciones</Link>
            <Link to="/inventario/conteos" className="btn">Conteos</Link>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
            <Link to="/inventario/reservas" className="btn">Reservas</Link>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
            <Link to="/inventario/sugerencias" className="btn">Sugerencias</Link>
            <Link to="/inventario/proyeccion" className="btn">Proyección</Link>
            <Link to="/inventario/alertas-planificacion" className="btn">Alertas plan.</Link>
            <Link to="/inventario/ops" className="btn">Ops Center</Link>
            <Link to="/inventario/ops/analitica" className="btn">Analítica</Link>
            <Link to="/inventario/ops/reportes" className="btn">Reportes</Link>
            <Link to="/inventario/articulos" className="btn">Artículos</Link>
            <Link to="/inventario/bodegas" className="btn">Bodegas</Link>
            <Link to="/inventario/ubicaciones" className="btn">Ubicaciones</Link>
            <Link to="/inventario/catalogos" className="btn">Catálogos</Link>
            <Link to="/inventario/parametros" className="btn">Parámetros</Link>
            <Link to="/inventario/auditoria" className="btn">Auditoría</Link>
            <Link to="/compras/inventario" className="btn">Inventario café</Link>
          </div>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card kpi-card-primary"><span className="kpi-label">Catálogos</span><span className="kpi-value">{String(center.catalogsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Parámetros</span><span className="kpi-value">{String(center.parametersCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Bodegas</span><span className="kpi-value">{String(center.warehousesCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Artículos</span><span className="kpi-value">{String(center.itemsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Lotes</span><span className="kpi-value">{String(center.lotsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Alertas venc.</span><span className="kpi-value">{String(center.alertsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Transformaciones</span><span className="kpi-value">{String(center.transformsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Conteos abiertos</span><span className="kpi-value">{String(center.countsOpen ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Conteos pend. apr.</span><span className="kpi-value">{String(center.countsPendingApproval ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Reservas activas</span><span className="kpi-value">{String(center.activeReservations ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Sugerencias</span><span className="kpi-value">{String(center.openSuggestions ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Alertas abast.</span><span className="kpi-value">{String(center.openSupplyAlerts ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Alertas ops</span><span className="kpi-value">{String(center.openOpsAlerts ?? 0)}</span></div>
          </div>
          <section className="panel">
            <h3>Claves de catálogo</h3>
            <p>{((center.catalogKeys as string[]) ?? []).join(' · ')}</p>
          </section>
          <section className="panel">
            <h3>Bodegas</h3>
            <ul>
              {((center.warehouses as Array<Record<string, unknown>>) ?? []).map((w) => (
                <li key={String(w.warehouseKey)}>{String(w.name)} ({String(w.warehouseType)})</li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h3>Artículos recientes</h3>
            <ul>
              {((center.items as Array<Record<string, unknown>>) ?? []).map((i) => (
                <li key={String(i.itemKey)}>{String(i.itemKey)} — {String(i.name)} [{String(i.itemTypeKey)}]</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
