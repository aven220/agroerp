import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEpscmWms,
  completeEpscmWmsTransfer,
  createEpscmWmsTransfer,
  createEpscmWmsWave,
  getEpscmWmsCenter,
  getEpscmWmsDashboard,
  getEpscmWmsHierarchy,
  getEpscmWmsMap,
  getEpscmWmsOccupancy,
  getEpscmWmsPickPanel,
  getEpscmWmsPackPanel,
  listEpscmWmsCrossDock,
  listEpscmWmsDispatches,
  listEpscmWmsLocations,
  listEpscmWmsReceipts,
  listEpscmWmsTransfers,
  seedEpscmWmsHierarchy,
  submitEpscmWmsTransfer,
} from '../api/epscm-wms';

const WMS_LINKS = (
  <div className="row-actions">
    <Link to="/cadena-suministro/wms" className="btn">Centro WMS</Link>
    <Link to="/cadena-suministro/wms/bodegas" className="btn">Bodegas</Link>
    <Link to="/cadena-suministro/wms/mapa" className="btn">Mapa</Link>
    <Link to="/cadena-suministro/wms/picking" className="btn">Picking</Link>
    <Link to="/cadena-suministro/wms/packing" className="btn">Packing</Link>
    <Link to="/cadena-suministro/wms/transferencias" className="btn">Transferencias</Link>
    <Link to="/cadena-suministro/wms/logistica" className="btn">Logística</Link>
    <Link to="/cadena-suministro/tms" className="btn">TMS</Link>
    <Link to="/cadena-suministro/colaboracion" className="btn">Colaboración</Link>
  </div>
);

export function EpscmWmsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEpscmWmsCenter().then(setCenter);
    getEpscmWmsDashboard().then(setDash);
  }, []);

  const ind = dash as Record<string, number> | null;
  const warehouses = (center?.warehouses as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Centro WMS" subtitle="Gestión de bodegas y ubicaciones" actions={WMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Ubicaciones</span><span className="kpi-value">{ind?.locationCount ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Picking abierto</span><span className="kpi-value">{ind?.openPickTasks ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Transferencias</span><span className="kpi-value">{ind?.openTransfers ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Recepciones</span><span className="kpi-value">{ind?.pendingReceipts ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ocupación prom.</span><span className="kpi-value">{ind?.occupancyAvgPct ?? '—'}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEpscmWms().then(() => {
          getEpscmWmsCenter().then(setCenter);
          getEpscmWmsDashboard().then(setDash);
        })}>Inicializar WMS</button>
        {warehouses[0] && (
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => seedEpscmWmsHierarchy(String(warehouses[0].warehouseKey))}>
            Cargar jerarquía {String(warehouses[0].code)}
          </button>
        )}
      </section>
    </>
  );
}

export function EpscmWmsWarehousePage() {
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [hierarchy, setHierarchy] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getEpscmWmsCenter().then((c) => {
      const wh = (c.warehouses as Array<Record<string, unknown>>) ?? [];
      setWarehouses(wh);
      if (wh[0]) setSelected(String(wh[0].warehouseKey));
    });
  }, []);

  useEffect(() => {
    if (selected) getEpscmWmsHierarchy(selected).then(setHierarchy);
  }, [selected]);

  const zones = (hierarchy?.zones as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Administrador de Bodegas" subtitle="CD, zonas, pasillos y ubicaciones" actions={WMS_LINKS} />
      <section className="card">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {warehouses.map((w) => (
            <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>
          ))}
        </select>
        <table className="data-table">
          <thead><tr><th>Zona</th><th>Código</th><th>Tipo</th></tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={String(z.zoneKey)}><td>{String(z.name)}</td><td>{String(z.code)}</td><td>{String(z.zoneType)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmWmsMapPage() {
  const [warehouseKey, setWarehouseKey] = useState('');
  const [map, setMap] = useState<Array<Record<string, unknown>>>([]);
  const [occupancy, setOccupancy] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getEpscmWmsCenter().then((c) => {
      const wh = (c.warehouses as Array<Record<string, unknown>>) ?? [];
      if (wh[0]) setWarehouseKey(String(wh[0].warehouseKey));
    });
  }, []);

  useEffect(() => {
    if (!warehouseKey) return;
    getEpscmWmsMap(warehouseKey).then((d) => setMap(d as Array<Record<string, unknown>>));
    getEpscmWmsOccupancy(warehouseKey).then((d) => setOccupancy(d as Array<Record<string, unknown>>));
  }, [warehouseKey]);

  return (
    <>
      <Header title="Mapa de Ubicaciones" subtitle="Ocupación y coordenadas" actions={WMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Código</th><th>Estado</th><th>X</th><th>Y</th><th>Ocupación %</th></tr></thead>
          <tbody>
            {map.map((m) => (
              <tr key={String(m.locationKey)}>
                <td>{String(m.code)}</td>
                <td>{String(m.status)}</td>
                <td>{String(m.mapX ?? '—')}</td>
                <td>{String(m.mapY ?? '—')}</td>
                <td>{String(m.occupancyPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Ubicaciones bloqueadas: {occupancy.filter((o) => o.status === 'blocked').length}</p>
      </section>
    </>
  );
}

export function EpscmWmsPickingPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const [orderKey, setOrderKey] = useState('SO-000001');

  useEffect(() => { getEpscmWmsPickPanel().then(setPanel); }, []);

  const tasks = (panel?.tasks as Array<Record<string, unknown>>) ?? [];

  const createWave = () => {
    getEpscmWmsCenter().then((c) => {
      const wh = (c.warehouses as Array<Record<string, unknown>>)?.[0];
      if (!wh) return;
      createEpscmWmsWave({
        warehouseKey: wh.warehouseKey,
        pickMode: 'wave',
        orderKeys: [orderKey],
      }).then(() => getEpscmWmsPickPanel().then(setPanel));
    });
  };

  return (
    <>
      <Header title="Panel de Picking" subtitle="Olas, zonas y confirmación" actions={WMS_LINKS} />
      <section className="card">
        <div className="form-row">
          <input value={orderKey} onChange={(e) => setOrderKey(e.target.value)} placeholder="Pedido" />
          <button className="btn btn-primary" onClick={createWave}>Crear ola</button>
        </div>
        <p>Abiertas: {Number(panel?.openCount ?? 0)}</p>
        <table className="data-table">
          <thead><tr><th>Tarea</th><th>Pedido</th><th>Item</th><th>Solicitado</th><th>Estado</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={String(t.taskKey)}>
                <td>{String(t.taskKey)}</td>
                <td>{String(t.orderKey)}</td>
                <td>{String(t.itemKey)}</td>
                <td>{String(t.requestedQty)}</td>
                <td>{String(t.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmWmsPackingPage() {
  const [packs, setPacks] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getEpscmWmsPackPanel().then((d) => setPacks(d as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Panel de Packing" subtitle="Empaque, cajas y etiquetas" actions={WMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Pack</th><th>Pedido</th><th>Estado</th><th>Cajas</th><th>Peso</th></tr></thead>
          <tbody>
            {packs.map((p) => (
              <tr key={String(p.packKey)}>
                <td>{String(p.packKey)}</td>
                <td>{String(p.orderKey)}</td>
                <td>{String(p.status)}</td>
                <td>{((p.boxes as unknown[]) ?? []).length}</td>
                <td>{String(p.totalWeight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmWmsTransferPage() {
  const [transfers, setTransfers] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => listEpscmWmsTransfers().then((d) => setTransfers(d as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const createSample = () => {
    getEpscmWmsCenter().then((c) => {
      const wh = (c.warehouses as Array<Record<string, unknown>>)?.[0];
      if (!wh) return;
      listEpscmWmsLocations(String(wh.warehouseKey)).then((locs) => {
        const locsArr = locs as Array<Record<string, unknown>>;
        if (locsArr.length < 2) return;
        createEpscmWmsTransfer({
          transferType: 'location',
          fromWarehouseKey: wh.warehouseKey,
          toWarehouseKey: wh.warehouseKey,
          lines: [{
            itemKey: 'ITEM-001',
            quantity: 1,
            fromLocationKey: locsArr[0].locationKey,
            toLocationKey: locsArr[1].locationKey,
          }],
        }).then((t) => {
          const key = String((t as Record<string, unknown>).transferKey);
          submitEpscmWmsTransfer(key).then(reload);
        });
      });
    });
  };

  return (
    <>
      <Header title="Centro de Transferencias" subtitle="Solicitudes, aprobaciones y seguimiento" actions={WMS_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={createSample}>Nueva transferencia ubicación</button>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Tipo</th><th>Estado</th><th>Líneas</th></tr></thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={String(t.transferKey)}>
                <td>{String(t.transferKey)}</td>
                <td>{String(t.transferType)}</td>
                <td>{String(t.status)}</td>
                <td>{((t.lines as unknown[]) ?? []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmWmsLogisticsPage() {
  const [receipts, setReceipts] = useState<Array<Record<string, unknown>>>([]);
  const [dispatches, setDispatches] = useState<Array<Record<string, unknown>>>([]);
  const [crossDock, setCrossDock] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listEpscmWmsReceipts().then((d) => setReceipts(d as Array<Record<string, unknown>>));
    listEpscmWmsDispatches().then((d) => setDispatches(d as Array<Record<string, unknown>>));
    listEpscmWmsCrossDock().then((d) => setCrossDock(d as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Dashboard Logístico" subtitle="Recepciones, despachos y cross-docking" actions={WMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Recepciones</span><span className="kpi-value">{receipts.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Despachos</span><span className="kpi-value">{dispatches.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cross-dock</span><span className="kpi-value">{crossDock.length}</span></div>
      </div>
      <section className="card">
        <h3>Recepciones recientes</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>OC</th><th>Estado</th></tr></thead>
          <tbody>
            {receipts.slice(0, 10).map((r) => (
              <tr key={String(r.receiptKey)}><td>{String(r.receiptKey)}</td><td>{String(r.purchaseKey ?? '—')}</td><td>{String(r.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
