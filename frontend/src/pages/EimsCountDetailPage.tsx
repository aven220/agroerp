import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  approveAllEimsAdjustments,
  captureEimsCount,
  closeEimsCount,
  getEimsCount,
  getEimsCountDifferences,
  getEimsCountReconciliation,
  reconcileEimsCount,
  requestAllEimsAdjustments,
} from '../api/eims';

export function EimsCountDetailPage() {
  const { countKey = '' } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [differences, setDifferences] = useState<Array<Record<string, unknown>>>([]);
  const [reconciliation, setReconciliation] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [capture, setCapture] = useState({
    lineKey: '',
    quantity: '0',
    round: 'first',
    method: 'manual',
    scannedCode: '',
  });

  const reload = async () => {
    const [d, diff, rec] = await Promise.all([
      getEimsCount(countKey),
      getEimsCountDifferences(countKey).catch(() => []),
      getEimsCountReconciliation(countKey).catch(() => []),
    ]);
    setData(d);
    setDifferences(diff as Array<Record<string, unknown>>);
    setReconciliation(rec as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, [countKey]);

  if (!data && !error) return <LoadingState variant="page" message="Cargando conteo..." />;

  const lines = (data?.lines as Array<Record<string, unknown>>) ?? [];
  const assignments = (data?.assignments as Array<Record<string, unknown>>) ?? [];
  const adjustments = (data?.adjustments as Array<Record<string, unknown>>) ?? [];
  const summary = (data?.summary as Record<string, unknown>) ?? {};
  const acts = (data?.closureActs as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header
        title={`Conteo ${countKey}`}
        subtitle={`${String(data?.name ?? '')} · ${String(data?.countType ?? '')} · ${String(data?.status ?? '')}`}
        actions={
          <>
            <Link to="/inventario/conteos" className="btn">Centro</Link>
            <Link to="/inventario/conteos/actas" className="btn">Actas</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Progreso</span><span className="kpi-value">{String(summary.progressPct ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Líneas</span><span className="kpi-value">{String(summary.totalLines ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Contadas</span><span className="kpi-value">{String(summary.countedLines ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Diferencias</span><span className="kpi-value">{String(summary.varianceLines ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo var.</span><span className="kpi-value">{String(summary.totalVarianceCost ?? 0)}</span></div>
      </div>
      <section className="panel">
        <h3>Asignaciones</h3>
        <ul>
          {assignments.map((a) => (
            <li key={String(a.id)}>{String(a.userName ?? a.userId)} · {String(a.roleKey)} · {String(a.status)}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Captura de conteo</h3>
        <div className="row-actions">
          <select value={capture.lineKey} onChange={(e) => setCapture({ ...capture, lineKey: e.target.value })}>
            <option value="">Línea</option>
            {lines.map((l) => (
              <option key={String(l.lineKey)} value={String(l.lineKey)}>
                {String(l.lineKey)} · {String(l.itemKey)} · sys={String(l.systemQty)}
              </option>
            ))}
          </select>
          <input placeholder="Cantidad física" value={capture.quantity} onChange={(e) => setCapture({ ...capture, quantity: e.target.value })} />
          <select value={capture.round} onChange={(e) => setCapture({ ...capture, round: e.target.value })}>
            <option value="first">1er conteo</option>
            <option value="second">2º conteo</option>
            <option value="third">3er conteo</option>
          </select>
          <select value={capture.method} onChange={(e) => setCapture({ ...capture, method: e.target.value })}>
            <option value="manual">manual</option>
            <option value="qr">qr</option>
            <option value="barcode">barcode</option>
            <option value="offline">offline</option>
          </select>
          <input placeholder="Código QR/barras" value={capture.scannedCode} onChange={(e) => setCapture({ ...capture, scannedCode: e.target.value })} />
          <button
            className="btn btn-primary"
            onClick={() =>
              captureEimsCount(countKey, {
                lineKey: capture.lineKey || undefined,
                scannedCode: capture.scannedCode || undefined,
                quantity: Number(capture.quantity),
                round: capture.round,
                method: capture.method,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Capturar
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Acciones de conciliación</h3>
        <div className="row-actions">
          <button className="btn" onClick={() => reconcileEimsCount(countKey).then(reload).catch((e) => setError(e.message))}>
            Conciliar
          </button>
          <button className="btn" onClick={() => requestAllEimsAdjustments(countKey).then(reload).catch((e) => setError(e.message))}>
            Solicitar aprobaciones
          </button>
          <button className="btn" onClick={() => approveAllEimsAdjustments(countKey, 'Aprobado en panel').then(reload).catch((e) => setError(e.message))}>
            Aprobar y postear ajustes
          </button>
          <button className="btn btn-primary" onClick={() => closeEimsCount(countKey, 'Cierre operativo').then(reload).catch((e) => setError(e.message))}>
            Cerrar y generar acta
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Comparador de diferencias</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Línea</th>
              <th>Sistema</th>
              <th>Físico</th>
              <th>Dif.</th>
              <th>%</th>
              <th>Costo</th>
              <th>Tol.</th>
              <th>Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {differences.map((d) => (
              <tr key={String(d.id)}>
                <td>{String((d.line as Record<string, unknown>)?.lineKey ?? d.lineId)}</td>
                <td>{String(d.systemQty)}</td>
                <td>{String(d.physicalQty)}</td>
                <td>{String(d.varianceQty)}</td>
                <td>{String(d.variancePct)}</td>
                <td>{String(d.varianceCost)}</td>
                <td>{String(d.withinTolerance)}</td>
                <td>{String(d.proposedAdjustmentType ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Panel de conciliación</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Línea</th>
              <th>Artículo</th>
              <th>Bodega</th>
              <th>Lote</th>
              <th>Sistema</th>
              <th>Físico</th>
              <th>Dif.</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reconciliation.map((l) => (
              <tr key={String(l.id)}>
                <td>{String(l.lineKey)}</td>
                <td>{String(l.itemKey)}</td>
                <td>{String(l.warehouseKey)}</td>
                <td>{String(l.lotKey ?? '—')}</td>
                <td>{String(l.systemQty)}</td>
                <td>{String(l.physicalQty ?? '—')}</td>
                <td>{String(l.varianceQty ?? '—')}</td>
                <td>{String(l.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Ajustes</h3>
        <ul>
          {adjustments.map((a) => (
            <li key={String(a.id)}>
              {String(a.adjustmentKey)} · {String(a.adjustmentType)} · qty={String(a.quantity)} · {String(a.status)}
              {a.movementKey ? ` · mov=${String(a.movementKey)}` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Actas</h3>
        <ul>
          {acts.map((a) => (
            <li key={String(a.id)}>{String(a.actKey)} · {String(a.title)} · doc={String(a.documentKey ?? '—')}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
