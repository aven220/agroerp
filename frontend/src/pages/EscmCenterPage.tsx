import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageLayout, PageSection, PageSummary, MetricCard } from '../components/page';
import { getEscmCenter, seedEscm } from '../api/escm';
import { LoadingState } from '../components/ux/LoadingState';

/**
 * PM-25 — Hub comercial simplificado + terminología de producto.
 */
export function EscmCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const reload = () => getEscmCenter().then(setCenter).catch((e) => setError(e.message));
  useEffect(() => {
    reload();
  }, []);

  if (!center && !error) return <LoadingState variant="page" message="Cargando ventas y comercial…" />;

  return (
    <>
      <Header
        title="Ventas y comercial"
        subtitle="Clientes, precios, cotizaciones, pedidos y cartera"
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Nuevo pedido', to: '/comercial/pedidos' }}
            searchPlaceholder="Buscar…"
            searchValue={search}
            onSearchChange={setSearch}
            moreActions={[
              { label: 'Clientes', to: '/comercial/clientes' },
              { label: 'Cotizaciones', to: '/comercial/cotizaciones' },
              { label: 'Facturación', to: '/comercial/facturacion' },
              { label: 'Cartera', to: '/comercial/cartera-centro' },
              { label: 'Logística', to: '/comercial/logistica' },
              { label: 'Configuración', to: '/comercial/configuracion' },
              {
                label: 'Cargar configuración inicial',
                onClick: () => seedEscm().then(reload).catch((e) => setError(e.message)),
              },
            ]}
          />
        }
      >
        {error ? <section className="panel error-panel">{error}</section> : null}
        {center ? (
          <>
            <PageSummary>
              <MetricCard label="Clientes" value={String(center.customersCount ?? 0)} tone="teal" />
              <MetricCard label="Activos" value={String(center.activeCustomers ?? 0)} />
              <MetricCard label="Oportunidades" value={String(center.openOpportunities ?? 0)} />
              <MetricCard label="Cotizaciones" value={String(center.quotationsCount ?? 0)} />
              <MetricCard label="Pedidos" value={String(center.salesOrdersCount ?? 0)} tone="coffee" />
              <MetricCard label="Listas de precio" value={String(center.priceListsCount ?? 0)} />
            </PageSummary>
            <PageSection title="Resumen">
              <p className="muted">
                Use <strong>Más acciones</strong> para acceder a clientes, facturación y configuración. La búsqueda
                se aplica en las listas detalladas de cada sección.
                {search.trim() ? ` Filtro activo: “${search}”.` : ''}
              </p>
            </PageSection>
          </>
        ) : null}
      </PageLayout>
    </>
  );
}
