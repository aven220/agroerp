import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
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

type DiffRow = Record<string, unknown> & { id: string };
type RecRow = Record<string, unknown> & { id: string };

const diffColumns: SimpleColumn<DiffRow>[] = [
  {
    key: 'lineKey',
    label: 'Línea',
    getValue: (r) => String(((r.line as Record<string, unknown>) ?? {}).lineKey ?? r.lineId ?? ''),
  },
  { key: 'systemQty', label: 'Sistema', getValue: (r) => String(r.systemQty ?? '') },
  { key: 'physicalQty', label: 'Físico', getValue: (r) => String(r.physicalQty ?? '') },
  { key: 'varianceQty', label: 'Dif.', getValue: (r) => String(r.varianceQty ?? '') },
  { key: 'variancePct', label: '%', getValue: (r) => String(r.variancePct ?? '') },
  { key: 'varianceCost', label: 'Costo', getValue: (r) => String(r.varianceCost ?? '') },
  { key: 'withinTolerance', label: 'Tol.', getValue: (r) => String(r.withinTolerance ?? '') },
  {
    key: 'proposedAdjustmentType',
    label: 'Ajuste',
    getValue: (r) => String(r.proposedAdjustmentType ?? '—'),
  },
];

const recColumns: SimpleColumn<RecRow>[] = [
  { key: 'lineKey', label: 'Línea', getValue: (r) => String(r.lineKey ?? '') },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '') },
  { key: 'lotKey', label: 'Lote', getValue: (r) => String(r.lotKey ?? '—') },
  { key: 'systemQty', label: 'Sistema', getValue: (r) => String(r.systemQty ?? '') },
  { key: 'physicalQty', label: 'Físico', getValue: (r) => String(r.physicalQty ?? '—') },
  { key: 'varianceQty', label: 'Dif.', getValue: (r) => String(r.varianceQty ?? '—') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
];

export function EimsCountDetailPage() {
  const { countKey = '' } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [differences, setDifferences] = useState<DiffRow[]>([]);
  const [reconciliation, setReconciliation] = useState<RecRow[]>([]);
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
    setDifferences((diff as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id')));
    setReconciliation((rec as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'lineKey')));
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, [countKey]);

  if (!data && !error) return <LoadingState variant="page" message="Cargando conteo..." />;

  const lines = (data?.lines as Array<Record<string, unknown>>) ?? [];
  const assignments = (data?.assignments as Array<Record<string, unknown>>) ?? [];
  const adjustments = (data?.adjustments as Array<Record<string, unknown>>) ?? [];
  const summary = (data?.summary as Record<string, unknown>) ?? {};
  const acts = (data?.closureActs as Array<Record<string, unknown>>) ?? [];

  return (
    <PageLayout>
      <PageHeader
        title={`Conteo ${countKey}`}
        subtitle={`${String(data?.name ?? '')} · ${String(data?.countType ?? '')} · ${String(data?.status ?? '')}`}
        actions={
          <PageActions>
            <Link to="/inventario/conteos" className="btn">Centro</Link>
            <Link to="/inventario/conteos/actas" className="btn">Actas</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="Progreso" value={`${String(summary.progressPct ?? 0)}%`} tone="green" />
        <MetricCard label="Líneas" value={String(summary.totalLines ?? 0)} />
        <MetricCard label="Contadas" value={String(summary.countedLines ?? 0)} />
        <MetricCard label="Diferencias" value={String(summary.varianceLines ?? 0)} />
        <MetricCard label="Costo var." value={String(summary.totalVarianceCost ?? 0)} />
      </PageSummary>

      <PageSection title="Asignaciones">
        <ul>
          {assignments.map((a) => (
            <li key={String(a.id)}>{String(a.userName ?? a.userId)} · {String(a.roleKey)} · {String(a.status)}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Captura de conteo">
        <div className="form-grid">
          <FieldGroup label="Línea">
            <select value={capture.lineKey} onChange={(e) => setCapture({ ...capture, lineKey: e.target.value })}>
              <option value="">Línea</option>
              {lines.map((l) => (
                <option key={String(l.lineKey)} value={String(l.lineKey)}>
                  {String(l.lineKey)} · {String(l.itemKey)} · sys={String(l.systemQty)}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Cantidad física">
            <input
              placeholder="Cantidad física"
              value={capture.quantity}
              onChange={(e) => setCapture({ ...capture, quantity: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Ronda">
            <select value={capture.round} onChange={(e) => setCapture({ ...capture, round: e.target.value })}>
              <option value="first">1er conteo</option>
              <option value="second">2º conteo</option>
              <option value="third">3er conteo</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Método">
            <select value={capture.method} onChange={(e) => setCapture({ ...capture, method: e.target.value })}>
              <option value="manual">manual</option>
              <option value="qr">qr</option>
              <option value="barcode">barcode</option>
              <option value="offline">offline</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Código QR/barras">
            <input
              placeholder="Código QR/barras"
              value={capture.scannedCode}
              onChange={(e) => setCapture({ ...capture, scannedCode: e.target.value })}
            />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
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
        </FormActions>
      </PageSection>

      <PageSection title="Acciones de conciliación">
        <FormActions sticky={false}>
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
        </FormActions>
      </PageSection>

      <PageSection title="Comparador de diferencias">
        <SimpleRecordsTable
          gridId="eims-count-differences"
          columns={diffColumns}
          data={differences}
          selectable={false}
          emptyMessage="Sin diferencias"
        />
      </PageSection>

      <PageSection title="Panel de conciliación">
        <SimpleRecordsTable
          gridId="eims-count-reconciliation"
          columns={recColumns}
          data={reconciliation}
          selectable={false}
          emptyMessage="Sin líneas"
        />
      </PageSection>

      <PageSection title="Ajustes">
        <ul>
          {adjustments.map((a) => (
            <li key={String(a.id)}>
              {String(a.adjustmentKey)} · {String(a.adjustmentType)} · qty={String(a.quantity)} · {String(a.status)}
              {a.movementKey ? ` · mov=${String(a.movementKey)}` : ''}
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Actas">
        <ul>
          {acts.map((a) => (
            <li key={String(a.id)}>{String(a.actKey)} · {String(a.title)} · doc={String(a.documentKey ?? '—')}</li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
