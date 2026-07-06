import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  getEimsLot360,
  reclassifyEimsLot,
  registerEimsLotIncident,
} from '../api/eims';

function renderTree(node: Record<string, unknown>, depth = 0): string {
  const pad = '  '.repeat(depth);
  const role = String(node.role ?? '');
  const lotKey = String(node.lotKey ?? '');
  const transform = node.transformType ? ` [${String(node.transformType)}]` : '';
  const parents = ((node.parents as Array<Record<string, unknown>>) ?? [])
    .map((p) => renderTree(p, depth + 1))
    .join('');
  const children = ((node.children as Array<Record<string, unknown>>) ?? [])
    .map((c) => renderTree(c, depth + 1))
    .join('');
  return `${pad}${role}: ${lotKey}${transform}\n${parents}${children}`;
}

export function EimsLot360Page() {
  const { lotKey = '' } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [incident, setIncident] = useState({ title: '', description: '' });
  const [reclass, setReclass] = useState({ status: 'quarantined', reason: '' });

  const reload = () =>
    getEimsLot360(lotKey).then((d) => setData(d)).catch((e) => setError(e.message));

  useEffect(() => { reload(); }, [lotKey]);

  if (!data && !error) return <LoadingState variant="page" message="Cargando lote 360°..." />;
  const lot = (data?.lot as Record<string, unknown>) ?? {};
  const timeline = (data?.timeline as Array<Record<string, unknown>>) ?? [];
  const genealogy = (data?.genealogy as Record<string, unknown>) ?? {};
  const movementMap = (data?.movementMap as Record<string, unknown>) ?? {};
  const nodes = (movementMap.nodes as Array<Record<string, unknown>>) ?? [];
  const chain = (data?.chain as Array<Record<string, unknown>>) ?? [];
  const transformations = (data?.transformations as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header
        title={`Lote 360° — ${lotKey}`}
        subtitle="Genealogía, movimientos, historial y cadena de suministro"
        actions={
          <>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
            <Link to="/inventario/lotes/transformaciones" className="btn">Transformaciones</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Disponible</span><span className="kpi-value">{String(lot.onHandQty ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo acum.</span><span className="kpi-value">{String(lot.accumulatedCost ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Estado</span><span className="kpi-value">{String(lot.status ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Vence</span><span className="kpi-value">{lot.expiryDate ? String(lot.expiryDate).slice(0, 10) : '—'}</span></div>
      </div>
      <section className="panel">
        <h3>Identificación</h3>
        <p>QR: {String(lot.qrCode ?? '—')} · Barras: {String(lot.barcode ?? '—')} · Serie: {String(lot.serialNumber ?? '—')}</p>
        <p>Productor: {String(lot.producerName ?? '—')} · Finca: {String(lot.farmName ?? '—')} · Lote agrícola: {String(lot.agriculturalLotCode ?? '—')}</p>
        <p>Centro compra: {String(lot.purchaseCenterKey ?? '—')} · Propietario: {String(lot.ownerOrgKey ?? '—')} · Cliente: {String(lot.customerName ?? '—')}</p>
      </section>
      <section className="panel">
        <h3>Cadena de suministro</h3>
        <ul>
          {chain.map((c) => (
            <li key={String(c.stage)}>{String(c.stage)}: {String(c.value ?? '—')}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Árbol genealógico</h3>
        <pre>{renderTree(genealogy)}</pre>
      </section>
      <section className="panel">
        <h3>Mapa de movimientos</h3>
        <table className="data-table">
          <thead>
            <tr><th>Movimiento</th><th>Tipo</th><th>Cant.</th><th>Desde</th><th>Hacia</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={String(n.movementKey)}>
                <td>{String(n.movementKey)}</td>
                <td>{String(n.movementType)}</td>
                <td>{String(n.quantity)}</td>
                <td>{String(n.from ?? '—')}</td>
                <td>{String(n.to ?? '—')}</td>
                <td>{String(n.postedAt).slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Historial cronológico</h3>
        <ul>
          {timeline.map((t) => (
            <li key={String(t.eventKey)}>
              <strong>{String(t.occurredAt).slice(0, 19)}</strong> [{String(t.stage)}] {String(t.title)}
              {t.description ? ` — ${String(t.description)}` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Transformaciones</h3>
        <ul>
          {transformations.map((t) => (
            <li key={String(t.id)}>
              {String(t.transformType)}: {String(t.parentLotKey)} → {String(t.childLotKey)} ({String(t.quantity)})
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Reclasificar</h3>
        <div className="row-actions">
          <select value={reclass.status} onChange={(e) => setReclass({ ...reclass, status: e.target.value })}>
            <option value="quarantined">quarantined</option>
            <option value="blocked">blocked</option>
            <option value="available">available</option>
            <option value="expired">expired</option>
          </select>
          <input placeholder="Justificación" value={reclass.reason} onChange={(e) => setReclass({ ...reclass, reason: e.target.value })} />
          <button
            className="btn"
            onClick={() =>
              reclassifyEimsLot(lotKey, reclass)
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Reclasificar
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Incidencia</h3>
        <div className="row-actions">
          <input placeholder="Título" value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} />
          <input placeholder="Descripción" value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
          <button
            className="btn"
            onClick={() =>
              registerEimsLotIncident({ lotKey, ...incident })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Registrar
          </button>
        </div>
      </section>
    </>
  );
}
