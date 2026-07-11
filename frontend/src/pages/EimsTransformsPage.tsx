import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  listEimsLots,
  listEimsTransformations,
  mergeEimsLots,
  mixEimsLots,
  splitEimsLot,
} from '../api/eims';

type TransformRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<TransformRow>[] = [
  { key: 'transformationKey', label: 'Clave', getValue: (r) => String(r.transformationKey ?? '') },
  { key: 'transformType', label: 'Tipo', getValue: (r) => String(r.transformType ?? '') },
  {
    key: 'parentLotKey',
    label: 'Origen',
    render: (r) => (
      <Link to={`/inventario/lotes/${encodeURIComponent(String(r.parentLotKey))}`}>{String(r.parentLotKey)}</Link>
    ),
    getValue: (r) => String(r.parentLotKey ?? ''),
  },
  {
    key: 'childLotKey',
    label: 'Destino',
    render: (r) => (
      <Link to={`/inventario/lotes/${encodeURIComponent(String(r.childLotKey))}`}>{String(r.childLotKey)}</Link>
    ),
    getValue: (r) => String(r.childLotKey ?? ''),
  },
  { key: 'quantity', label: 'Cant.', getValue: (r) => String(r.quantity ?? '') },
  { key: 'performedAt', label: 'Fecha', getValue: (r) => String(r.performedAt ?? '').slice(0, 19) },
];

export function EimsTransformsPage() {
  const [rows, setRows] = useState<TransformRow[]>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [split, setSplit] = useState({ lotKey: '', qty1: '10', qty2: '10', reason: 'División operativa' });
  const [merge, setMerge] = useState({ lotA: '', qtyA: '5', lotB: '', qtyB: '5', reason: 'Unificación' });
  const [mix, setMix] = useState({ lotA: '', qtyA: '5', lotB: '', qtyB: '5', reason: 'Mezcla' });

  const reload = async () => {
    const [t, l] = await Promise.all([listEimsTransformations(), listEimsLots()]);
    setRows((t as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'transformationKey')));
    setLots(l as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Panel de transformaciones"
        subtitle="División, unificación, mezcla y procesos industriales"
        actions={
          <PageActions>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Dividir lote">
        <div className="form-grid">
          <FieldGroup label="Lote origen">
            <select value={split.lotKey} onChange={(e) => setSplit({ ...split, lotKey: e.target.value })}>
              <option value="">Lote origen</option>
              {lots.map((l) => <option key={String(l.lotKey)} value={String(l.lotKey)}>{String(l.lotKey)} ({String(l.onHandQty)})</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cantidad 1">
            <input value={split.qty1} onChange={(e) => setSplit({ ...split, qty1: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Cantidad 2">
            <input value={split.qty2} onChange={(e) => setSplit({ ...split, qty2: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Motivo">
            <input value={split.reason} onChange={(e) => setSplit({ ...split, reason: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn btn-primary"
            onClick={() =>
              splitEimsLot({
                lotKey: split.lotKey,
                parts: [{ quantity: Number(split.qty1) }, { quantity: Number(split.qty2) }],
                reason: split.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Dividir
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Unificar lotes">
        <div className="form-grid">
          <FieldGroup label="Lote A">
            <select value={merge.lotA} onChange={(e) => setMerge({ ...merge, lotA: e.target.value })}>
              <option value="">Lote A</option>
              {lots.map((l) => <option key={`ma-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cant. A">
            <input value={merge.qtyA} onChange={(e) => setMerge({ ...merge, qtyA: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Lote B">
            <select value={merge.lotB} onChange={(e) => setMerge({ ...merge, lotB: e.target.value })}>
              <option value="">Lote B</option>
              {lots.map((l) => <option key={`mb-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cant. B">
            <input value={merge.qtyB} onChange={(e) => setMerge({ ...merge, qtyB: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn"
            onClick={() =>
              mergeEimsLots({
                parents: [
                  { lotKey: merge.lotA, quantity: Number(merge.qtyA) },
                  { lotKey: merge.lotB, quantity: Number(merge.qtyB) },
                ],
                reason: merge.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Unificar
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Mezclar lotes">
        <div className="form-grid">
          <FieldGroup label="Lote A">
            <select value={mix.lotA} onChange={(e) => setMix({ ...mix, lotA: e.target.value })}>
              <option value="">Lote A</option>
              {lots.map((l) => <option key={`xa-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cant. A">
            <input value={mix.qtyA} onChange={(e) => setMix({ ...mix, qtyA: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Lote B">
            <select value={mix.lotB} onChange={(e) => setMix({ ...mix, lotB: e.target.value })}>
              <option value="">Lote B</option>
              {lots.map((l) => <option key={`xb-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cant. B">
            <input value={mix.qtyB} onChange={(e) => setMix({ ...mix, qtyB: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn"
            onClick={() =>
              mixEimsLots({
                parents: [
                  { lotKey: mix.lotA, quantity: Number(mix.qtyA) },
                  { lotKey: mix.lotB, quantity: Number(mix.qtyB) },
                ],
                reason: mix.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Mezclar
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Historial de transformaciones">
        <SimpleRecordsTable
          gridId="eims-transforms"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin transformaciones"
        />
      </PageSection>
    </PageLayout>
  );
}
