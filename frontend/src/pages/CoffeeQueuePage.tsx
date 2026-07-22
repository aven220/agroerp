import { useEffect, useState } from 'react';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
  PageState,
} from '../components/page';
import { HubToolbar } from '../components/layout/HubToolbar';
import { ConfirmDialog } from '../components/ui/Drawer';
import { FlowNextActions } from '../components/flow/FlowNextActions';
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
  const [loadedAt, setLoadedAt] = useState<string | undefined>();
  const [confirmNext, setConfirmNext] = useState(false);
  const [lastCalled, setLastCalled] = useState<string | null>(null);

  const reload = () => {
    Promise.all([
      listCoffeeTurnsQueue(),
      getCoffeeTurnMetrics(),
      getCoffeeTurnHistory(),
    ]).then(([q, m, h]) => {
      setQueue(q);
      setMetrics(m);
      setHistory(h as Array<Record<string, unknown>>);
      setLoadedAt(new Date().toISOString());
    });
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
        const key = String(r.ticketKey);
        callCoffeeTurn(key).then(() => {
          setLastCalled(key);
          reload();
        });
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
    <>
      <PageHeader
        title="Cola de espera"
        subtitle={`${queue.length} en cola · llamados y prioridades`}
        lastUpdated={loadedAt}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
            filterSlot={
              <button type="button" className="btn btn-primary" onClick={() => setConfirmNext(true)}>
                Llamar siguiente
              </button>
            }
            moreActions={[
              { label: 'Centro de compras', to: '/compras' },
              { label: 'Pesaje', to: '/compras/pesaje' },
            ]}
          />
        }
      >
        <PageSummary>
          <MetricCard label="En cola" value={queue.length} tone="coffee" />
          <MetricCard label="Espera avg" value={metrics ? `${Math.round(Number(metrics.avgWaitMs) / 1000)}s` : '—'} />
          <MetricCard label="Atención avg" value={metrics ? `${Math.round(Number(metrics.avgAttentionMs) / 1000)}s` : '—'} />
          <MetricCard label="Registros" value={queue.length + historyData.length} />
        </PageSummary>

        {lastCalled ? (
          <FlowNextActions
            title="Turno llamado"
            subtitle={`Se llamó el ticket ${lastCalled}. Continúe con pesaje o atención.`}
            dismissible
            onDismiss={() => setLastCalled(null)}
            actions={[
              {
                label: 'Ir a pesaje',
                description: 'Registrar peso del ticket llamado',
                to: '/compras/pesaje',
                primary: true,
                icon: '⚖',
              },
              {
                label: 'Seguir en cola',
                description: 'Llamar el siguiente turno',
                onClick: () => {
                  setLastCalled(null);
                  setConfirmNext(true);
                },
                icon: '⏳',
              },
            ]}
          />
        ) : null}

        <PageSection title={`Cola (${queue.length})`}>
          {queue.length === 0 ? (
            <PageState
              variant="empty"
              title="No hay turnos en cola"
              message="La cola está vacía porque aún no hay recepciones esperando llamado."
              hint="Cuando llegue un productor, registre la recepción y el turno aparecerá aquí."
              action={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
            />
          ) : (
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
              emptyMessage="No hay turnos en cola"
              emptyDescription="Registre una recepción para generar el primer turno."
            />
          )}
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
            emptyMessage="Sin historial aún"
            emptyDescription="Cuando llame turnos, el historial de atención aparecerá aquí."
          />
        </PageSection>
      </PageLayout>

      <ConfirmDialog
        open={confirmNext}
        title="¿Llamar al siguiente turno?"
        message="Se anunciará el siguiente productor en cola. Confirme solo si el puesto de atención está libre."
        confirmLabel="Sí, llamar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmNext(false)}
        onConfirm={() => {
          setConfirmNext(false);
          callNextCoffeeTurn().then(() => {
            setLastCalled('siguiente');
            reload();
          });
        }}
      />
    </>
  );
}
