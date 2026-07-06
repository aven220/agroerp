import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEmfgOrders } from '../api/emfg';
import {
  consumeEmfgAutomatic,
  consumeEmfgMaterial,
  executeEmfgOrder,
  getEmfgMesMonitor,
  getEmfgMesTracking,
  getEmfgMesTraceability,
  recordEmfgMesOutput,
} from '../api/emfg-mes';

const MES_LINKS = (
  <div className="row-actions">
    <Link to="/manufactura/mes" className="btn">Centro Ejecución</Link>
    <Link to="/manufactura/mes/panel" className="btn">Panel MES</Link>
    <Link to="/manufactura/mes/seguimiento" className="btn">Seguimiento</Link>
    <Link to="/manufactura/mes/monitor" className="btn">Monitor</Link>
    <Link to="/manufactura/mes/consumo" className="btn">Consumo</Link>
    <Link to="/manufactura/mes/trazabilidad" className="btn">Trazabilidad</Link>
    <Link to="/manufactura" className="btn">Planificación</Link>
  </div>
);

export function EmfgMesCenterPage() {
  const [monitor, setMonitor] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgMesMonitor().then(setMonitor); }, []);
  const stats = monitor?.stats as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Ejecución MES" subtitle="Inicio, pausa, consumo, producción y trazabilidad en tiempo real" actions={MES_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Órdenes activas</span><span className="kpi-value">{stats?.active ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Detenidas</span><span className="kpi-value">{stats?.stopped ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Finalizadas</span><span className="kpi-value">{stats?.finished ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Producido</span><span className="kpi-value">{stats?.totalProduced ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Avance promedio</span><span className="kpi-value">{stats?.avgAdvance != null ? `${stats.avgAdvance}%` : '—'}</span></div>
      </div>
    </>
  );
}

export function EmfgMesPanelPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const reload = () => getEmfgMesMonitor().then(setData);
  useEffect(() => { reload(); const t = setInterval(reload, 15000); return () => clearInterval(t); }, []);

  const active = (data?.activeOrders as Array<Record<string, unknown>>) ?? [];
  const stopped = (data?.stoppedOrders as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Panel MES" subtitle="Órdenes activas, detenidas y producción en curso" actions={MES_LINKS} />
      <div className="grid-2">
        <section className="card">
          <h3>En producción ({active.length})</h3>
          <table className="data-table"><thead><tr><th>Orden</th><th>Ítem</th><th>Avance</th><th>Rendimiento</th></tr></thead>
            <tbody>{active.map((o) => (
              <tr key={String(o.orderKey)}><td>{String(o.orderNumber)}</td><td>{String(o.itemKey)}</td>
                <td>{String(o.advancePct)}%</td><td>{String(o.yieldPct)}%</td></tr>
            ))}</tbody></table>
        </section>
        <section className="card">
          <h3>Detenidas ({stopped.length})</h3>
          <table className="data-table"><thead><tr><th>Orden</th><th>Estado</th><th>Avance</th></tr></thead>
            <tbody>{stopped.map((o) => (
              <tr key={String(o.orderKey)}><td>{String(o.orderNumber)}</td><td>{String(o.status)}</td><td>{String(o.advancePct)}%</td></tr>
            ))}</tbody></table>
        </section>
      </div>
    </>
  );
}

export function EmfgMesTrackingPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    listEmfgOrders().then((list) => {
      const arr = list as Array<Record<string, unknown>>;
      setOrders(arr.filter((o) => ['released', 'in_progress', 'paused', 'suspended'].includes(String(o.status))));
    });
  }, []);

  useEffect(() => {
    if (selected) getEmfgMesTracking(selected).then(setTracking);
  }, [selected]);

  const runAction = (action: string) => {
    if (!selected) return;
    executeEmfgOrder(selected, { action }).then(() => getEmfgMesTracking(selected).then(setTracking));
  };

  return (
    <>
      <Header title="Seguimiento de Órdenes" subtitle="Ejecución, tiempos y estados" actions={MES_LINKS} />
      <div className="form-row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Seleccionar orden</option>
          {orders.map((o) => <option key={String(o.orderKey)} value={String(o.orderKey)}>{String(o.orderNumber)} — {String(o.status)}</option>)}
        </select>
        <button className="btn" onClick={() => runAction('start')}>Iniciar</button>
        <button className="btn" onClick={() => runAction('pause')}>Pausar</button>
        <button className="btn" onClick={() => runAction('resume')}>Reanudar</button>
        <button className="btn" onClick={() => runAction('suspend')}>Suspender</button>
        <button className="btn" onClick={() => runAction('finish')}>Finalizar</button>
        <button className="btn" onClick={() => runAction('cancel')}>Cancelar</button>
      </div>
      {tracking && (
        <div className="card">
          <p>Estado: <strong>{String(tracking.status)}</strong> | Producido: {String(tracking.producedQty)} / {String(tracking.plannedQty)} | Tiempo: {String(tracking.elapsedMinutes)} min</p>
          <h4>Ejecuciones</h4>
          <ul>{((tracking.executions as Array<Record<string, unknown>>) ?? []).slice(0, 10).map((e) => (
            <li key={String(e.executionKey)}>{String(e.action)} — {String(e.newStatus)} ({String(e.elapsedMinutes)} min)</li>
          ))}</ul>
        </div>
      )}
    </>
  );
}

export function EmfgMesMonitorPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgMesMonitor().then(setData); }, []);
  const stats = data?.stats as Record<string, number> | undefined;
  const finished = (data?.recentFinished as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Monitor de Producción" subtitle="KPIs, consumo y avance" actions={MES_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Material consumido</span><span className="kpi-value">{stats?.consumed ?? 0}</span></div>
        <div className="kpi-card"><span className="kpi-label">Material requerido</span><span className="kpi-value">{stats?.required ?? 0}</span></div>
        <div className="kpi-card"><span className="kpi-label">Scrap total</span><span className="kpi-value">{stats?.totalScrap ?? 0}</span></div>
      </div>
      <section className="card">
        <h3>Recientes finalizadas</h3>
        <table className="data-table"><thead><tr><th>Orden</th><th>Producido</th><th>Scrap</th><th>Rendimiento</th></tr></thead>
          <tbody>{finished.map((o) => (
            <tr key={String(o.orderKey)}><td>{String(o.orderNumber)}</td><td>{String(o.producedQty)}</td>
              <td>{String(o.scrapQty)}</td><td>{String(o.yieldPct)}%</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgMesConsumptionPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [orderKey, setOrderKey] = useState('');
  const [componentKey, setComponentKey] = useState('');
  const [qty, setQty] = useState('1');

  useEffect(() => {
    listEmfgOrders('in_progress').then((list) => setOrders(list as Array<Record<string, unknown>>));
  }, []);

  const consume = () => {
    if (!orderKey || !componentKey) return;
    consumeEmfgMaterial(orderKey, {
      componentKey,
      consumptionType: 'manual',
      quantity: Number(qty),
      authorizedBy: 'system',
    }).then(() => alert('Consumo registrado'));
  };

  const autoConsume = () => {
    if (!orderKey) return;
    consumeEmfgAutomatic(orderKey).then(() => alert('Consumo automático BOM'));
  };

  return (
    <>
      <Header title="Control de Consumo" subtitle="Automático, manual, sustitución y desperdicios" actions={MES_LINKS} />
      <div className="form-row">
        <select value={orderKey} onChange={(e) => setOrderKey(e.target.value)}>
          <option value="">Orden en ejecución</option>
          {orders.map((o) => <option key={String(o.orderKey)} value={String(o.orderKey)}>{String(o.orderNumber)}</option>)}
        </select>
        <input placeholder="Componente" value={componentKey} onChange={(e) => setComponentKey(e.target.value)} />
        <input type="number" placeholder="Cantidad" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="btn btn-primary" onClick={consume}>Consumo manual</button>
        <button className="btn" onClick={autoConsume}>Consumo BOM</button>
      </div>
    </>
  );
}

export function EmfgMesTraceabilityPage() {
  const { orderKey: paramKey } = useParams();
  const [orderKey, setOrderKey] = useState(paramKey ?? '');
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [qty, setQty] = useState('10');

  useEffect(() => {
    if (orderKey) getEmfgMesTraceability(orderKey).then((h) => setHistory(h as Array<Record<string, unknown>>));
  }, [orderKey]);

  const recordGood = () => {
    if (!orderKey) return;
    recordEmfgMesOutput(orderKey, { outputType: 'good', quantity: Number(qty), isPartial: true }).then(() =>
      getEmfgMesTraceability(orderKey).then((h) => setHistory(h as Array<Record<string, unknown>>)),
    );
  };

  return (
    <>
      <Header title="Panel de Trazabilidad" subtitle="Lotes, series e historial del proceso" actions={MES_LINKS} />
      <div className="form-row">
        <input placeholder="Order Key" value={orderKey} onChange={(e) => setOrderKey(e.target.value)} />
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="btn" onClick={recordGood}>Registrar producción</button>
      </div>
      <section className="card">
        <h3>Historial ({history.length})</h3>
        <table className="data-table"><thead><tr><th>Evento</th><th>Ítem</th><th>Lote</th><th>Cantidad</th><th>Fecha</th></tr></thead>
          <tbody>{history.map((r) => (
            <tr key={String(r.recordKey)}><td>{String(r.eventType)}</td><td>{String(r.itemKey ?? '—')}</td>
              <td>{String(r.lotKey ?? '—')}</td><td>{String(r.quantity ?? '—')}</td><td>{String(r.recordedAt)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}
