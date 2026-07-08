import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmCenter, seedEscm } from '../api/escm';
import { LoadingState } from '../components/ux/LoadingState';

export function EscmCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const reload = () => getEscmCenter().then(setCenter).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  if (!center && !error) return <LoadingState variant="page" message="Cargando ESCM..." />;

  return (
    <>
      <Header
        title="Enterprise Sales & Commercial — ESCM"
        subtitle="Clientes, precios, condiciones y CRM comercial"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => seedEscm().then(reload).catch((e) => setError(e.message))}>
              Sembrar catálogos
            </button>
            <Link to="/comercial/crm/dashboard" className="btn">Dashboard CRM</Link>
            <Link to="/comercial/pipeline" className="btn">Pipeline</Link>
            <Link to="/comercial/oportunidades" className="btn">Oportunidades</Link>
            <Link to="/comercial/cotizaciones" className="btn">Cotizaciones</Link>
            <Link to="/comercial/pedidos" className="btn">Pedidos</Link>
            <Link to="/comercial/reservas" className="btn">Reservas</Link>
            <Link to="/comercial/aprobaciones" className="btn">Aprobaciones</Link>
            <Link to="/comercial/logistica" className="btn">Logística</Link>
            <Link to="/comercial/facturacion" className="btn">Facturación</Link>
            <Link to="/comercial/cartera-centro" className="btn">Cartera</Link>
            <Link to="/comercial/ops" className="btn">Ops Center</Link>
            <Link to="/comercial/despachos" className="btn">Despachos</Link>
            <Link to="/comercial/agenda" className="btn">Agenda</Link>
            <Link to="/comercial/historial-cliente" className="btn">Historial cliente</Link>
            <Link to="/comercial/clientes" className="btn">Clientes</Link>
            <Link to="/comercial/listas-precios" className="btn">Listas de precios</Link>
            <Link to="/comercial/condiciones" className="btn">Condiciones</Link>
            <Link to="/comercial/crm" className="btn">Panel CRM</Link>
            <Link to="/comercial/historial" className="btn">Historial</Link>
            <Link to="/comercial/configuracion" className="btn">Configuración</Link>
            <Link to="/comercial/catalogos" className="btn">Catálogos</Link>
            <Link to="/comercial/parametros" className="btn">Parámetros</Link>
            <Link to="/comercial/auditoria" className="btn">Auditoría</Link>
          </div>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card kpi-card-primary"><span className="kpi-label">Clientes</span><span className="kpi-value">{String(center.customersCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(center.activeCustomers ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Prospectos</span><span className="kpi-value">{String(center.prospects ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Listas precio</span><span className="kpi-value">{String(center.priceListsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Condiciones</span><span className="kpi-value">{String(center.conditionsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Promociones</span><span className="kpi-value">{String(center.promotionsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Catálogos</span><span className="kpi-value">{String(center.catalogsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Parámetros</span><span className="kpi-value">{String(center.parametersCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Oportunidades</span><span className="kpi-value">{String(center.openOpportunities ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Cotizaciones</span><span className="kpi-value">{String(center.quotationsCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Pedidos</span><span className="kpi-value">{String(center.salesOrdersCount ?? 0)}</span></div>
          </div>
          <section className="panel">
            <h3>Claves de catálogo</h3>
            <p>{((center.catalogKeys as string[]) ?? []).join(' · ')}</p>
          </section>
          <section className="panel">
            <h3>Auditoría reciente</h3>
            <table className="data-table">
              <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Fecha</th></tr></thead>
              <tbody>
                {((center.recentAudit as Array<Record<string, unknown>>) ?? []).map((r, i) => (
                  <tr key={i}>
                    <td>{String(r.entityType)}</td>
                    <td>{String(r.entityKey)}</td>
                    <td>{String(r.action)}</td>
                    <td>{r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}
