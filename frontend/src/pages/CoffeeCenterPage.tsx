import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageLayout, PageSection, PageSummary, MetricCard } from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
import { getCoffeeCenter, type CoffeeDashboard, type CoffeeTicket } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';
import { labelTicketStatus } from '../lib/productLabels';

/**
 * PM-25 — Hub de compras simplificado (máx. Nueva acción · Buscar · Filtros · Más acciones)
 */
export function CoffeeCenterPage() {
  const navigate = useNavigate();
  const [dash, setDash] = useState<CoffeeDashboard | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCoffeeCenter().then(setDash);
  }, []);

  if (!dash) return <LoadingState variant="page" message="Cargando compras de café…" />;

  const queue = (dash.queue ?? []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.ticketKey?.toLowerCase().includes(q) ||
      t.producerName?.toLowerCase().includes(q) ||
      labelTicketStatus(t.status).toLowerCase().includes(q)
    );
  });

  const gridRows = queue.slice(0, 12).map((t) => ({ ...t, id: t.id || t.ticketKey }));

  const columns: GridColumnDef<CoffeeTicket>[] = [
    { key: 'ticketKey', label: 'Ticket', getValue: (r) => r.ticketKey },
    { key: 'producerName', label: 'Productor', getValue: (r) => r.producerName ?? '—' },
    { key: 'status', label: 'Estado', render: (r) => labelTicketStatus(r.status) },
  ];

  const rowActions: RowAction<CoffeeTicket>[] = [
    {
      id: 'attend',
      label: 'Atender',
      onAction: (r) => navigate(`/compras/pesaje?ticket=${encodeURIComponent(r.ticketKey)}`),
    },
  ];

  return (
    <>
      <Header
        title="Compras de café"
        subtitle="Recepción, pesaje, calidad, liquidación e inventario"
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
            searchPlaceholder="Buscar ticket o productor…"
            searchValue={search}
            onSearchChange={setSearch}
            moreActions={[
              { label: 'Pesaje', to: '/compras/pesaje' },
              { label: 'Calidad', to: '/compras/calidad' },
              { label: 'Liquidaciones', to: '/compras/liquidaciones' },
              { label: 'Inventario café', to: '/compras/inventario' },
              { label: 'Balanzas', to: '/compras/balanzas' },
              { label: 'Configuración', to: '/compras/config' },
              { label: 'Trazabilidad', to: '/compras/trazabilidad' },
              { label: 'Reportes', to: '/compras/ops/reportes' },
            ]}
          />
        }
      >
        <PageSummary>
          <MetricCard label="Tickets hoy" value={dash.ticketsToday} tone="coffee" />
          <MetricCard label="En cola" value={dash.queueLength} />
          <MetricCard label="Pesados" value={dash.weighedToday} />
          <MetricCard label="Calidad" value={dash.qualityToday} tone="green" />
          <MetricCard label="Liquidaciones" value={dash.settlementsToday} />
          <MetricCard label="Kg hoy" value={dash.kgToday.toFixed(0)} tone="teal" />
        </PageSummary>

        <PageSection title="Cola del día">
          <EnterpriseDataGrid
            gridId="coffee-center-queue"
            columns={columns}
            data={gridRows}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="No hay tickets que coincidan con la búsqueda."
          />
        </PageSection>

        {(dash.alerts?.length ?? 0) > 0 ? (
          <PageSection title="Alertas operativas">
            <ul>
              {(dash.alerts ?? []).slice(0, 5).map((a, i) => (
                <li key={i}>
                  [{String(a.severity)}] {String(a.title)} — {String(a.message)}
                </li>
              ))}
            </ul>
          </PageSection>
        ) : null}
      </PageLayout>
    </>
  );
}
