import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  callCoffeeTurn,
  callNextCoffeeTurn,
  getCoffeeTurnHistory,
  getCoffeeTurnMetrics,
  listCoffeeTurnsQueue,
  setCoffeeTurnPriority,
  type CoffeeTicket,
} from '../api/coffee';
import { labelTicketStatus } from '../lib/productLabels';

type QueueRow = Record<string, unknown> & { id: string };

export function CoffeeQueuePage() {
  const [queue, setQueue] = useState<CoffeeTicket[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => {
    listCoffeeTurnsQueue().then(setQueue);
    getCoffeeTurnMetrics().then(setMetrics);
    getCoffeeTurnHistory().then((h) => setHistory(h as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  const queueData = queue.map((t) => withRowId(t as unknown as Record<string, unknown>, 'id', 'ticketKey'));
  const historyData = history.slice(0, 20).map((h, i) =>
    withRowId({ ...h, id: String(h.id ?? `hist-${i}`) } as Record<string, unknown>, 'id'),
  );

  const rowActions: RowAction<QueueRow>[] = [
    {
      id: 'call',
      label: 'Llamar',
      onAction: (r) => {
        callCoffeeTurn(String(r.ticketKey)).then(reload);
      },
    },
    {
      id: 'preferential',
      label: 'Preferencial',
      onAction: (r) => {
        setCoffeeTurnPriority(String(r.ticketKey), 1, true).then(reload);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Cola de espera y turnos"
        subtitle="Asignación, prioridades y llamado"
        actions={
          <PageActions>
            <button type="button" className="btn" onClick={() => callNextCoffeeTurn().then(reload)}>Llamar siguiente</button>
            <Link to="/compras/wizard" className="btn">Wizard</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />
      <PageSummary>
        <MetricCard label="En cola" value={queue.length} />
        <MetricCard label="Espera avg" value={metrics ? `${Math.round(Number(metrics.avgWaitMs) / 1000)}s` : '—'} />
        <MetricCard label="Atención avg" value={metrics ? `${Math.round(Number(metrics.avgAttentionMs) / 1000)}s` : '—'} />
      </PageSummary>
      <PageSection title="Cola">
        <SimpleRecordsTable
          gridId="coffee-queue"
          selectable={false}
          data={queueData}
          columns={[
            {
              key: 'turn',
              label: 'Turno',
              getValue: (r) => String(r.displayLabel ?? r.turnNumber ?? '—'),
            },
            { key: 'ticketKey', label: 'Ticket', getValue: (r) => String(r.ticketKey) },
            { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName) },
            { key: 'vehiclePlate', label: 'Vehículo', getValue: (r) => String(r.vehiclePlate) },
            {
              key: 'status',
              label: 'Estado',
              getValue: (r) => labelTicketStatus(String(r.status ?? '')),
            },
          ]}
          rowActions={rowActions}
        />
      </PageSection>
      <PageSection title="Historial de atención">
        <SimpleRecordsTable
          gridId="coffee-queue-history"
          selectable={false}
          data={historyData}
          columns={[
            { key: 'eventType', label: 'Evento', getValue: (r) => String(r.eventType) },
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            {
              key: 'producerName',
              label: 'Productor',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.producerName ?? ''),
            },
            {
              key: 'createdAt',
              label: 'Fecha',
              getValue: (r) => new Date(String(r.createdAt)).toLocaleString(),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
