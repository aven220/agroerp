import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubToolbar } from '../components/layout/HubToolbar';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  getTraceabilityByLot,
  getTraceabilityByQr,
  getTraceabilityByTicket,
  listInventoryLots,
} from '../api/coffee';

type LotRow = Record<string, unknown> & { id: string };

export function CoffeeTraceabilityPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [mode, setMode] = useState<'ticket' | 'lot' | 'qr'>('ticket');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listInventoryLots().then((r) => setLots(r as Array<Record<string, unknown>>));
    const q = searchParams.get('q');
    const m = searchParams.get('mode') as 'ticket' | 'lot' | 'qr' | null;
    if (q) {
      setQuery(q);
      if (m) setMode(m);
      lookup(q, m ?? 'ticket').catch(() => undefined);
    }
  }, [searchParams]);

  const lookup = async (value = query, kind = mode) => {
    setError('');
    try {
      if (kind === 'ticket') setData(await getTraceabilityByTicket(value));
      else if (kind === 'lot') setData(await getTraceabilityByLot(value));
      else setData(await getTraceabilityByQr(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontrado');
      setData(null);
    }
  };

  const timeline = (data?.timeline ?? []) as Array<Record<string, unknown>>;
  const map = (data?.map ?? []) as Array<Record<string, unknown>>;
  const lot = data?.lot as Record<string, unknown> | null;
  const ticket = data?.ticket as Record<string, unknown> | undefined;

  const lotData = lots.map((l) => withRowId(l, 'id', 'lotKey'));
  const mapData = map.map((m) => withRowId(m, 'id', 'sequence'));

  const lotActions: RowAction<LotRow>[] = [
    {
      id: 'trace',
      label: 'Trazar',
      onAction: (r) => {
        setMode('lot');
        setQuery(String(r.lotKey));
        lookup(String(r.lotKey), 'lot');
      },
    },
  ];

  return (
    <PageLayout
      toolbar={
        <HubToolbar
          primaryAction={{ label: 'Inventario', to: '/compras/inventario' }}
          moreActions={[
            { label: 'Kardex', to: '/compras/inventario/kardex' },
            { label: 'Auditoría', to: '/compras/inventario/auditoria' },
            { label: 'Centro', to: '/compras' },
          ]}
        />
      }
    >
      <PageHeader
        title="Trazabilidad de café"
        subtitle="Productor → compra → pesaje → calidad → liquidación → inventario"
      />

      <PageSection title="Consulta">
        <PageToolbar>
          <FieldGroup label="Modo">
            <select value={mode} onChange={(e) => setMode(e.target.value as 'ticket' | 'lot' | 'qr')}>
              <option value="ticket">Ticket compra</option>
              <option value="lot">Lote inventario</option>
              <option value="qr">QR / barcode</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Buscar">
            <input
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn btn-primary" onClick={() => lookup()}>Consultar</button>
        </FormActions>
        {error ? <PageState variant="error" message={error} /> : null}
      </PageSection>

      <PageSection title="Lotes en inventario">
        <SimpleRecordsTable
          gridId="coffee-traceability-lots"
          selectable={false}
          data={lotData}
          columns={[
            { key: 'lotKey', label: 'Lote', getValue: (r) => String(r.lotKey) },
            { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName ?? '—') },
            {
              key: 'availableKg',
              label: 'Disponible',
              getValue: (r) => (r.availableKg != null ? `${r.availableKg} kg` : '—'),
            },
            { key: 'warehouse', label: 'Bodega', getValue: (r) => String(r.warehouse) },
            { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
          ]}
          rowActions={lotActions}
        />
      </PageSection>

      {data ? (
        <>
          <PageSection title="Resumen">
            <p>
              Ticket <strong>{String(ticket?.ticketKey ?? '—')}</strong> · Productor{' '}
              <strong>{String(ticket?.producerName ?? lot?.producerName ?? '—')}</strong> · Finca{' '}
              <strong>{String(ticket?.farmName ?? lot?.farmName ?? '—')}</strong> · Lote agrícola{' '}
              <strong>{String(ticket?.lotCode ?? lot?.agriculturalLotCode ?? '—')}</strong>
            </p>
            {lot ? (
              <p>
                Lote inventario <strong>{String(lot.lotKey)}</strong> · QR <strong>{String(lot.qrCode)}</strong> ·
                Bodega <strong>{String(lot.warehouse)}</strong> · Ubicación{' '}
                <strong>{String(lot.locationLabel ?? '—')}</strong> · Costo prom.{' '}
                <strong>{Number(lot.averageCost ?? 0).toLocaleString()}</strong>
              </p>
            ) : null}
          </PageSection>

          <PageSection title="Historial completo">
            <ol>
              {timeline.map((t, i) => (
                <li key={i}>
                  <strong>[{String(t.stage)}]</strong> {String(t.title)} — {String(t.description ?? '')}{' '}
                  <em>{t.occurredAt ? new Date(String(t.occurredAt)).toLocaleString() : ''}</em>
                </li>
              ))}
            </ol>
          </PageSection>

          <PageSection title="Mapa de movimientos">
            <SimpleRecordsTable
              gridId="coffee-traceability-map"
              selectable={false}
              data={mapData}
              columns={[
                { key: 'sequence', label: '#', getValue: (r) => String(r.sequence) },
                { key: 'movementType', label: 'Tipo', getValue: (r) => String(r.movementType) },
                { key: 'quantityKg', label: 'Cantidad', getValue: (r) => `${String(r.quantityKg)} kg` },
                { key: 'warehouse', label: 'Bodega', getValue: (r) => String(r.warehouse) },
                { key: 'fromWarehouse', label: 'Origen', getValue: (r) => String(r.fromWarehouse ?? '—') },
                { key: 'toWarehouse', label: 'Destino', getValue: (r) => String(r.toWarehouse ?? '—') },
                {
                  key: 'postedAt',
                  label: 'Fecha',
                  getValue: (r) => (r.postedAt ? new Date(String(r.postedAt)).toLocaleString() : '—'),
                },
              ]}
            />
          </PageSection>
        </>
      ) : null}
    </PageLayout>
  );
}
