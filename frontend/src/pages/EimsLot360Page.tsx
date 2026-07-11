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
  DescriptionList,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
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

type MovementRow = Record<string, unknown> & { id: string };

const movementColumns: SimpleColumn<MovementRow>[] = [
  { key: 'movementKey', label: 'Movimiento', getValue: (r) => String(r.movementKey ?? '') },
  { key: 'movementType', label: 'Tipo', getValue: (r) => String(r.movementType ?? '') },
  { key: 'quantity', label: 'Cant.', getValue: (r) => String(r.quantity ?? '') },
  { key: 'from', label: 'Desde', getValue: (r) => String(r.from ?? '—') },
  { key: 'to', label: 'Hacia', getValue: (r) => String(r.to ?? '—') },
  {
    key: 'postedAt',
    label: 'Fecha',
    getValue: (r) => String(r.postedAt ?? '').slice(0, 19),
  },
];

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
  const nodes = ((movementMap.nodes as Array<Record<string, unknown>>) ?? []).map((row) =>
    withRowId(row, 'movementKey', 'id'),
  );
  const chain = (data?.chain as Array<Record<string, unknown>>) ?? [];
  const transformations = (data?.transformations as Array<Record<string, unknown>>) ?? [];

  return (
    <PageLayout>
      <PageHeader
        title={`Lote 360° — ${lotKey}`}
        subtitle="Genealogía, movimientos, historial y cadena de suministro"
        actions={
          <PageActions>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
            <Link to="/inventario/lotes/transformaciones" className="btn">Transformaciones</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="Disponible" value={String(lot.onHandQty ?? 0)} tone="green" />
        <MetricCard label="Costo acum." value={String(lot.accumulatedCost ?? 0)} />
        <MetricCard label="Estado" value={String(lot.status ?? '—')} />
        <MetricCard label="Vence" value={lot.expiryDate ? String(lot.expiryDate).slice(0, 10) : '—'} />
      </PageSummary>

      <PageSection title="Identificación">
        <DescriptionList
          items={[
            { term: 'QR', detail: String(lot.qrCode ?? '—') },
            { term: 'Barras', detail: String(lot.barcode ?? '—') },
            { term: 'Serie', detail: String(lot.serialNumber ?? '—') },
            { term: 'Productor', detail: String(lot.producerName ?? '—') },
            { term: 'Finca', detail: String(lot.farmName ?? '—') },
            { term: 'Lote agrícola', detail: String(lot.agriculturalLotCode ?? '—') },
            { term: 'Centro compra', detail: String(lot.purchaseCenterKey ?? '—') },
            { term: 'Propietario', detail: String(lot.ownerOrgKey ?? '—') },
            { term: 'Cliente', detail: String(lot.customerName ?? '—') },
          ]}
        />
      </PageSection>

      <PageSection title="Cadena de suministro">
        <ul>
          {chain.map((c) => (
            <li key={String(c.stage)}>{String(c.stage)}: {String(c.value ?? '—')}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Árbol genealógico">
        <pre>{renderTree(genealogy)}</pre>
      </PageSection>

      <PageSection title="Mapa de movimientos">
        <SimpleRecordsTable
          gridId="eims-lot360-movements"
          columns={movementColumns}
          data={nodes}
          selectable={false}
          emptyMessage="Sin movimientos"
        />
      </PageSection>

      <PageSection title="Historial cronológico">
        <ul>
          {timeline.map((t) => (
            <li key={String(t.eventKey)}>
              <strong>{String(t.occurredAt).slice(0, 19)}</strong> [{String(t.stage)}] {String(t.title)}
              {t.description ? ` — ${String(t.description)}` : ''}
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Transformaciones">
        <ul>
          {transformations.map((t) => (
            <li key={String(t.id)}>
              {String(t.transformType)}: {String(t.parentLotKey)} → {String(t.childLotKey)} ({String(t.quantity)})
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Reclasificar">
        <div className="form-grid">
          <FieldGroup label="Estado">
            <select value={reclass.status} onChange={(e) => setReclass({ ...reclass, status: e.target.value })}>
              <option value="quarantined">quarantined</option>
              <option value="blocked">blocked</option>
              <option value="available">available</option>
              <option value="expired">expired</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Justificación">
            <input
              placeholder="Justificación"
              value={reclass.reason}
              onChange={(e) => setReclass({ ...reclass, reason: e.target.value })}
            />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
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
        </FormActions>
      </PageSection>

      <PageSection title="Incidencia">
        <div className="form-grid">
          <FieldGroup label="Título">
            <input
              placeholder="Título"
              value={incident.title}
              onChange={(e) => setIncident({ ...incident, title: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Descripción">
            <input
              placeholder="Descripción"
              value={incident.description}
              onChange={(e) => setIncident({ ...incident, description: e.target.value })}
            />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
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
        </FormActions>
      </PageSection>
    </PageLayout>
  );
}
