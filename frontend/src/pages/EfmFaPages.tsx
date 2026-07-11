import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function EfmFaCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-fa').then(({ getEfmFaCenter }) => getEfmFaCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  const byClass = (center?.assetsByClass ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header
        title="Centro de Activos Fijos"
        subtitle="PPE, intangibles, depreciaciones y ciclo de vida"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm-fa').then(({ seedEfmFa }) => seedEfmFa().then(reload))}>Cargar configuración inicial</button>
            <Link to="/finanzas/activos-fijos/registro" className="btn">Activos</Link>
            <Link to="/finanzas/activos-fijos/depreciaciones" className="btn">Depreciaciones</Link>
            <Link to="/finanzas/activos-fijos/amortizaciones" className="btn">Amortizaciones</Link>
            <Link to="/finanzas/activos-fijos/inventario" className="btn">Inventario físico</Link>
            <Link to="/finanzas/activos-fijos/historial" className="btn">Historial</Link>
            <Link to="/finanzas/activos-fijos/dashboard" className="btn">Dashboard</Link>
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      {center ? (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card kpi-card-primary"><span className="kpi-label">Valor en libros</span><span className="kpi-value">{Number(center.totalNetBookValue ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Activos activos</span><span className="kpi-value">{String(center.activeAssets ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Costo adquisición</span><span className="kpi-value">{Number(center.totalAcquisitionCost ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Depreciación acum.</span><span className="kpi-value">{Number(center.totalAccumulatedDepreciation ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Categorías</span><span className="kpi-value">{String(center.categoryCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">En mantenimiento</span><span className="kpi-value">{String(center.maintenanceAssets ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Dados de baja</span><span className="kpi-value">{String(center.disposedAssets ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Inventarios abiertos</span><span className="kpi-value">{String(center.openInventories ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Incidencias abiertas</span><span className="kpi-value">{String(center.openIncidents ?? 0)}</span></div>
          </div>
          {byClass.length ? (
            <section className="panel">
              <h3>Activos por clase</h3>
              <table className="data-table">
                <thead><tr><th>Clase</th><th>Cantidad</th><th>Valor en libros</th></tr></thead>
                <tbody>
                  {byClass.map((r) => (
                    <tr key={String(r.assetClass)}>
                      <td>{String(r.assetClass)}</td>
                      <td>{String(r.count ?? 0)}</td>
                      <td>{Number(r.netBookValue ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function EfmFaAssetsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fa').then(({ listEfmFaAssets }) =>
      listEfmFaAssets().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Registro de activos" subtitle="Maquinaria, vehículos, intangibles y más" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Etiqueta</th><th>Nombre</th><th>Clase</th><th>Estado</th><th>Costo</th><th>VNB</th><th>Ubicación</th><th>QR</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.assetKey)}>
              <td>{String(r.assetTag)}</td>
              <td>{String(r.name)}</td>
              <td>{String(r.assetClass)}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.acquisitionCost ?? 0).toLocaleString()}</td>
              <td>{Number(r.netBookValue ?? 0).toLocaleString()}</td>
              <td>{String(r.locationDescription ?? r.locationKey ?? '')}</td>
              <td>{String(r.qrCode ?? '').slice(0, 24)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmFaDepreciationPage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fa').then(({ listEfmFaDepreciationRuns, listEfmFaDepreciationLines }) => {
      listEfmFaDepreciationRuns({ runType: 'depreciation' }).then((r) => setRuns(r as Array<Record<string, unknown>>));
      listEfmFaDepreciationLines({ entryType: 'depreciation' }).then((r) => setLines(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Panel de depreciaciones" subtitle="Línea recta, saldo decreciente y unidades" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <section className="panel">
        <h3>Procesos ({runs.length})</h3>
        <table className="data-table">
          <thead><tr><th>Proceso</th><th>Período</th><th>Estado</th><th>Activos</th><th>Monto</th><th>Contabilidad</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={String(r.runKey)}>
                <td>{String(r.runKey)}</td>
                <td>{String(r.periodKey)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.assetCount ?? 0)}</td>
                <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
                <td>{String(r.accountingRef ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Líneas recientes</h3>
        <table className="data-table">
          <thead><tr><th>Línea</th><th>Activo</th><th>Período</th><th>Monto</th><th>VNB cierre</th></tr></thead>
          <tbody>
            {lines.slice(0, 50).map((l) => (
              <tr key={String(l.lineKey)}>
                <td>{String(l.lineKey)}</td>
                <td>{String((l.asset as Record<string, unknown>)?.assetTag ?? l.assetKey)}</td>
                <td>{String(l.periodKey)}</td>
                <td>{Number(l.amount ?? 0).toLocaleString()}</td>
                <td>{Number(l.closingNbv ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmFaAmortizationPage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fa').then(({ listEfmFaDepreciationRuns, listEfmFaDepreciationLines }) => {
      listEfmFaDepreciationRuns({ runType: 'amortization' }).then((r) => setRuns(r as Array<Record<string, unknown>>));
      listEfmFaDepreciationLines({ entryType: 'amortization' }).then((r) => setLines(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Gestor de amortizaciones" subtitle="Intangibles, licencias, software y patentes" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Proceso</th><th>Período</th><th>Estado</th><th>Monto</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={String(r.runKey)}>
              <td>{String(r.runKey)}</td>
              <td>{String(r.periodKey)}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="panel">
        <h3>Líneas de amortización</h3>
        <table className="data-table">
          <thead><tr><th>Activo</th><th>Período</th><th>Monto</th></tr></thead>
          <tbody>
            {lines.slice(0, 50).map((l) => (
              <tr key={String(l.lineKey)}>
                <td>{String((l.asset as Record<string, unknown>)?.name ?? l.assetKey)}</td>
                <td>{String(l.periodKey)}</td>
                <td>{Number(l.amount ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmFaInventoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fa').then(({ listEfmFaPhysicalInventories }) =>
      listEfmFaPhysicalInventories().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Inventario físico de activos" subtitle="QR, conteos, verificación y conciliación" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Inventario</th><th>Nombre</th><th>Estado</th><th>Programado</th><th>Total</th><th>Encontrados</th><th>No encontrados</th><th>Diferencias</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.inventoryKey)}>
              <td>{String(r.inventoryKey)}</td>
              <td>{String(r.name)}</td>
              <td>{String(r.status)}</td>
              <td>{String(r.scheduledDate).slice(0, 10)}</td>
              <td>{String(r.totalAssets ?? 0)}</td>
              <td>{String(r.foundCount ?? 0)}</td>
              <td>{String(r.notFoundCount ?? 0)}</td>
              <td>{String(r.mismatchCount ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmFaHistoryPage() {
  const [transfers, setTransfers] = useState<Array<Record<string, unknown>>>([]);
  const [disposals, setDisposals] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fa').then(({ listEfmFaTransfers, listEfmFaDisposals }) => {
      listEfmFaTransfers().then((r) => setTransfers(r as Array<Record<string, unknown>>));
      listEfmFaDisposals().then((r) => setDisposals(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Historial de activos" subtitle="Transferencias, bajas y revalorizaciones" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <section className="panel">
        <h3>Transferencias</h3>
        <table className="data-table">
          <thead><tr><th>Transferencia</th><th>Activo</th><th>Estado</th><th>Fecha</th><th>Destino</th></tr></thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={String(t.transferKey)}>
                <td>{String(t.transferKey)}</td>
                <td>{String(t.assetKey)}</td>
                <td>{String(t.status)}</td>
                <td>{String(t.transferDate).slice(0, 10)}</td>
                <td>{String(t.toLocationKey ?? t.toBranchKey ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Bajas y disposiciones</h3>
        <table className="data-table">
          <thead><tr><th>Baja</th><th>Activo</th><th>Tipo</th><th>VNB</th><th>Procede</th><th>Utilidad/Pérdida</th></tr></thead>
          <tbody>
            {disposals.map((d) => (
              <tr key={String(d.disposalKey)}>
                <td>{String(d.disposalKey)}</td>
                <td>{String(d.assetKey)}</td>
                <td>{String(d.disposalType)}</td>
                <td>{Number(d.nbvAtDisposal ?? 0).toLocaleString()}</td>
                <td>{Number(d.proceedsAmount ?? 0).toLocaleString()}</td>
                <td>{Number(d.gainLossAmount ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmFaDashboardPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-fa').then(({ getEfmFaCenter }) => getEfmFaCenter().then(setCenter as never));
  }, []);
  const recent = (center?.recentAssets ?? []) as Array<Record<string, unknown>>;
  const disposals = (center?.recentDisposals ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Dashboard de activos" subtitle="Panel financiero de activos fijos" actions={<Link to="/finanzas/activos-fijos" className="btn">Centro AF</Link>} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Total activos</span><span className="kpi-value">{String(center?.totalAssets ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">VNB total</span><span className="kpi-value">{Number(center?.totalNetBookValue ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Deprec. pendiente proc.</span><span className="kpi-value">{String(center?.pendingDepreciationRuns ?? 0)}</span></div>
      </div>
      <section className="panel">
        <h3>Activos recientes</h3>
        <table className="data-table">
          <thead><tr><th>Etiqueta</th><th>Nombre</th><th>Estado</th><th>VNB</th></tr></thead>
          <tbody>
            {recent.map((a) => (
              <tr key={String(a.assetKey)}>
                <td>{String(a.assetTag)}</td>
                <td>{String(a.name)}</td>
                <td>{String(a.status)}</td>
                <td>{Number(a.netBookValue ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Bajas recientes</h3>
        <table className="data-table">
          <thead><tr><th>Baja</th><th>Activo</th><th>Tipo</th></tr></thead>
          <tbody>
            {disposals.map((d) => (
              <tr key={String(d.disposalKey)}>
                <td>{String(d.disposalKey)}</td>
                <td>{String(d.assetKey)}</td>
                <td>{String(d.disposalType)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
